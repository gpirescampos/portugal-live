import test from "node:test";
import assert from "node:assert/strict";
import { isWarningRecord, warningValidityFor } from "../../src/domain/warnings.ts";
import type { WorldRecord } from "../../src/domain/world.ts";

test("warning domain model", async (t) => {
  const now = new Date("2026-09-22T12:00:00Z");

  await t.test("distinguishes upcoming, active and expired validity", () => {
    assert.equal(warningValidityFor("2026-09-22T13:00:00Z", "2026-09-23T00:00:00Z", now), "upcoming");
    assert.equal(warningValidityFor("2026-09-22T00:00:00Z", "2026-09-23T00:00:00Z", now), "active");
    assert.equal(warningValidityFor("2026-09-21T00:00:00Z", "2026-09-22T12:00:00Z", now), "expired");
  });

  await t.test("rejects malformed warning records at the domain boundary", () => {
    const base = {
      id: "ipma-warning:LIS:heat",
      providerId: "ipma-warnings",
      kind: "weather-warning",
      geometry: { type: "Point", coordinates: [-9.14, 38.72] },
      observedAt: null,
      fetchedAt: now.toISOString(),
      temporalClass: "current",
      freshness: "current",
      quality: "reported",
      provenance: {
        providerName: "IPMA", dataset: "weather warnings", sourceUrl: "https://api.ipma.pt",
        attribution: "IPMA", transport: "direct",
      },
    } satisfies Omit<WorldRecord, "properties">;
    assert.equal(isWarningRecord({ ...base, properties: {
      areaCode: "LIS", warningType: "Tempo Quente", severity: "yellow", validity: "active",
    } }), true);
    assert.equal(isWarningRecord({ ...base, properties: {
      areaCode: "LIS", warningType: "Tempo Quente", severity: "blue", validity: "active",
    } }), false);
  });
});
