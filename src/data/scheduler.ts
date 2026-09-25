/**
 * Shared provider refresh scheduler.
 *
 * This module deliberately knows nothing about Cesium, providers, or UI. A
 * provider supplies a refresh function and the scheduler owns lifecycle,
 * cancellation, backoff, visibility throttling, and request generations.
 */

export type RefreshFailure = Error & {
  retryAfterMs?: number;
  status?: number;
};

export interface ScheduledProvider {
  id: string;
  intervalMs: number;
  maxBackoffMs?: number;
  refresh: (context: {
    signal: AbortSignal;
    generation: number;
  }) => Promise<void>;
  onStateChange?: (state: ProviderScheduleState) => void;
}

export interface ProviderScheduleState {
  providerId: string;
  running: boolean;
  refreshing: boolean;
  generation: number;
  failures: number;
  nextRunAt: number | null;
  lastError: Error | null;
}

export interface SchedulerOptions {
  now?: () => number;
  setTimeout?: (handler: () => void, timeout: number) => ReturnType<typeof globalThis.setTimeout>;
  clearTimeout?: (handle: ReturnType<typeof globalThis.setTimeout>) => void;
  random?: () => number;
  hidden?: () => boolean;
  hiddenIntervalMs?: number;
  jitterRatio?: number;
}

type Entry = {
  provider: ScheduledProvider;
  state: ProviderScheduleState;
  controller: AbortController | null;
  timer: ReturnType<typeof globalThis.setTimeout> | null;
  runToken: number;
  scheduledWhileHidden: boolean;
};

const DEFAULT_HIDDEN_INTERVAL_MS = 60_000;
const DEFAULT_JITTER_RATIO = 0.1;
const DEFAULT_MAX_BACKOFF_MS = 15 * 60_000;

export class ProviderScheduler {
  private readonly entries = new Map<string, Entry>();
  private readonly now: () => number;
  private readonly setTimer: NonNullable<SchedulerOptions["setTimeout"]>;
  private readonly clearTimer: NonNullable<SchedulerOptions["clearTimeout"]>;
  private readonly random: () => number;
  private readonly hidden: () => boolean;
  private readonly hiddenIntervalMs: number;
  private readonly jitterRatio: number;
  private readonly visibilityDocument: Document | null;
  private readonly onVisibilityChange = (): void => {
    if (!this.visibilityDocument?.hidden) this.resumeVisible();
  };

  constructor(options: SchedulerOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimeout ?? ((handler, timeout) => globalThis.setTimeout(handler, timeout));
    this.clearTimer = options.clearTimeout ?? ((handle) => globalThis.clearTimeout(handle));
    this.random = options.random ?? (() => Math.random());
    this.hidden = options.hidden ?? (() => typeof document !== "undefined" && document.hidden);
    this.hiddenIntervalMs = options.hiddenIntervalMs ?? DEFAULT_HIDDEN_INTERVAL_MS;
    this.jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO;
    this.visibilityDocument = typeof document === 'undefined' ? null : document;
    this.visibilityDocument?.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  register(provider: ScheduledProvider): void {
    if (this.entries.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    if (!Number.isFinite(provider.intervalMs) || provider.intervalMs <= 0) {
      throw new Error(`Provider interval must be positive: ${provider.id}`);
    }
    this.entries.set(provider.id, {
      provider,
      controller: null,
      timer: null,
      runToken: 0,
      scheduledWhileHidden: false,
      state: this.createState(provider.id),
    });
  }

  unregister(providerId: string): void {
    this.stop(providerId);
    this.entries.delete(providerId);
  }

  start(providerId: string): void {
    const entry = this.require(providerId);
    if (entry.state.running) return;
    entry.state.running = true;
    entry.state.failures = 0;
    entry.state.lastError = null;
    this.publish(entry);
    void this.run(entry, true);
  }

  stop(providerId: string): void {
    const entry = this.require(providerId);
    entry.state.running = false;
    entry.state.nextRunAt = null;
    entry.runToken += 1;
    if (entry.timer !== null) this.clearTimer(entry.timer);
    entry.timer = null;
    entry.scheduledWhileHidden = false;
    entry.controller?.abort();
    entry.controller = null;
    entry.state.refreshing = false;
    this.publish(entry);
  }

  /** Re-run immediately, preserving the lifecycle and preventing extra loops. */
  retry(providerId: string): void {
    const entry = this.require(providerId);
    if (!entry.state.running) {
      this.start(providerId);
      return;
    }
    if (entry.timer !== null) this.clearTimer(entry.timer);
    entry.timer = null;
    void this.run(entry, true);
  }

  /** Call when the document becomes visible again. */
  resumeVisible(): void {
    for (const entry of this.entries.values()) {
      if (!entry.state.running || entry.state.refreshing || !entry.scheduledWhileHidden) continue;
      if (entry.timer !== null) this.clearTimer(entry.timer);
      entry.timer = null;
      entry.scheduledWhileHidden = false;
      void this.run(entry, true);
    }
  }

  getState(providerId: string): ProviderScheduleState {
    const entry = this.require(providerId);
    return { ...entry.state };
  }

  destroy(): void {
    this.visibilityDocument?.removeEventListener('visibilitychange', this.onVisibilityChange);
    for (const id of this.entries.keys()) this.stop(id);
    this.entries.clear();
  }

  private async run(entry: Entry, immediate: boolean): Promise<void> {
    if (!entry.state.running || entry.state.refreshing) return;
    const token = ++entry.runToken;
    entry.state.generation = token;
    const controller = new AbortController();
    entry.controller = controller;
    entry.state.refreshing = true;
    entry.state.nextRunAt = null;
    this.publish(entry);

    try {
      await entry.provider.refresh({ signal: controller.signal, generation: token });
      if (!entry.state.running || token !== entry.runToken) return;
      entry.state.failures = 0;
      entry.state.lastError = null;
      this.schedule(entry, immediate ? entry.provider.intervalMs : entry.provider.intervalMs);
    } catch (error) {
      if (!entry.state.running || token !== entry.runToken || controller.signal.aborted) return;
      const failure: RefreshFailure = error instanceof Error
        ? (error as RefreshFailure)
        : Object.assign(new Error(String(error)), { status: undefined });
      entry.state.failures += 1;
      entry.state.lastError = failure;
      const retryAfter = failure.retryAfterMs;
      const base = retryAfter !== undefined ? retryAfter : this.backoff(entry);
      this.schedule(entry, base);
    } finally {
      if (token === entry.runToken) {
        entry.controller = null;
        entry.state.refreshing = false;
        this.publish(entry);
      }
    }
  }

  private schedule(entry: Entry, delayMs: number): void {
    if (!entry.state.running) return;
    const hidden = this.hidden();
    entry.scheduledWhileHidden = hidden;
    const delay = hidden
      ? Math.max(delayMs, this.hiddenIntervalMs)
      : this.withJitter(Math.max(0, delayMs));
    entry.state.nextRunAt = this.now() + delay;
    if (entry.timer !== null) this.clearTimer(entry.timer);
    entry.timer = this.setTimer(() => {
      entry.timer = null;
      entry.scheduledWhileHidden = false;
      void this.run(entry, false);
    }, delay);
    this.publish(entry);
  }

  private backoff(entry: Entry): number {
    const max = entry.provider.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    return Math.min(max, entry.provider.intervalMs * 2 ** Math.max(0, entry.state.failures - 1));
  }

  private withJitter(delay: number): number {
    const spread = delay * this.jitterRatio;
    return Math.round(delay - spread + this.random() * spread * 2);
  }

  private publish(entry: Entry): void {
    entry.provider.onStateChange?.({ ...entry.state });
  }

  private require(providerId: string): Entry {
    const entry = this.entries.get(providerId);
    if (!entry) throw new Error(`Unknown provider: ${providerId}`);
    return entry;
  }

  private createState(providerId: string): ProviderScheduleState {
    return { providerId, running: false, refreshing: false, generation: 0, failures: 0, nextRunAt: null, lastError: null };
  }
}
