import type { ProviderId } from "./world";

/** Small deterministic hash for source identifiers; not intended for cryptographic use. */
export function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function namespacedId(providerId: ProviderId, providerStableId: string): string {
  return `${providerId}:${providerStableId}`;
}

export function compositeId(providerId: ProviderId, ...parts: Array<string | number | null | undefined>): string {
  const key = parts.map((part) => String(part ?? "").trim()).join("|");
  return namespacedId(providerId, stableHash(key));
}
