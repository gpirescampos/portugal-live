import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderScheduler } from '../../src/data/scheduler.ts';

test('scheduler refreshes immediately and stops with cancellation', async () => {
  let calls = 0;
  let aborted = false;
  let release: (() => void) | undefined;
  const scheduler = new ProviderScheduler({ jitterRatio: 0, random: () => 0.5 });
  scheduler.register({
    id: 'fixture', intervalMs: 60_000,
    refresh: async ({ signal }) => { calls += 1; signal.addEventListener('abort', () => { aborted = true; }); await new Promise<void>((resolve) => { release = resolve; }); },
  });
  scheduler.start('fixture');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 1);
  scheduler.stop('fixture');
  assert.equal(scheduler.getState('fixture').running, false);
  assert.equal(aborted, true);
  release?.();
  scheduler.destroy();
});

test('scheduler backs off after failures instead of spinning', async () => {
  let scheduled = 0;
  const scheduler = new ProviderScheduler({ jitterRatio: 0, setTimeout: (_handler, delay) => { scheduled = delay; return 1 as unknown as ReturnType<typeof setTimeout>; }, clearTimeout: () => {} });
  scheduler.register({ id: 'fixture', intervalMs: 1000, refresh: async () => { throw new Error('offline'); } });
  scheduler.start('fixture');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(scheduled, 1000);
  scheduler.destroy();
});

test('scheduler refreshes promptly when a hidden tab becomes visible', async () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let hidden = true;
  let visibilityListener: (() => void) | undefined;
  const activeTimers = new Map<number, () => void>();
  let timerId = 0;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      get hidden() { return hidden; },
      addEventListener: (_type: string, listener: () => void) => { visibilityListener = listener; },
      removeEventListener: (_type: string, listener: () => void) => { if (visibilityListener === listener) visibilityListener = undefined; },
    },
  });
  try {
    let calls = 0;
    let scheduledDelay = 0;
    const scheduler = new ProviderScheduler({
      hidden: () => hidden,
      jitterRatio: 0,
      setTimeout: (handler, delay) => { scheduledDelay = delay; timerId += 1; activeTimers.set(timerId, handler); return timerId as unknown as ReturnType<typeof setTimeout>; },
      clearTimeout: (handle) => { activeTimers.delete(handle as unknown as number); },
    });
    scheduler.register({ id: 'fixture', intervalMs: 1000, refresh: async () => { calls += 1; } });
    scheduler.start('fixture');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls, 1);
    assert.equal(scheduledDelay, 60_000);
    assert.equal(activeTimers.size, 1);

    hidden = false;
    visibilityListener?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls, 2);
    assert.equal(activeTimers.size, 1);
    scheduler.destroy();
    assert.equal(visibilityListener, undefined);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, 'document', originalDescriptor);
    else delete (globalThis as typeof globalThis & { document?: Document }).document;
  }
});
