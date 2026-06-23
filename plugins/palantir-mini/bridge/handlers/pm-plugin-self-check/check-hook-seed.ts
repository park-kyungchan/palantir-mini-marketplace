// palantir-mini — pm-plugin-self-check hook self-Ontology SEED drift check
//
// runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts hand-seeds
// HOOK_INSTANCES (one entry per live hook, with its wired/orphan axis). Adding a
// hooks/<id>.ts + wiring it in hooks/hooks.json does NOT auto-register a seed entry
// nor bump the EXPECTED_* pins, so the self-model silently drifts (bd-012 recurred
// twice). This release axis fails loud when the seed no longer matches the live
// hooks/ filesystem + hooks.json wiring, so a hook added/removed/re-wired without
// updating the seed is caught at release time — not only by the paired bun test.
//
// Fix: update runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts
// (and the EXPECTED_* pins in tests/ontology/self/hook-registration.test.ts) to
// match the live hook surface.
//
// Authority:
//   - rules/08-schema-versioning.md (schema semver as tracked interface)
//   - runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts (the seed)

import { verifyHookSeed } from "../../../lib/runtime-overlay/hook-seed-drift";

export interface HookSeedCheckResult {
  status: "pass" | "fail";
  details: string;
  liveOnly: number;
  seedOnly: number;
  wiringMismatches: number;
  seedTotal: number;
  liveTotal: number;
  countsMatch: boolean;
}

export function checkHookSeed(): HookSeedCheckResult {
  try {
    const { inSync, drift } = verifyHookSeed();
    const countsMatch =
      drift.seedTotal === drift.liveTotal && drift.seedWired === drift.liveWired;
    if (inSync) {
      return {
        status: "pass",
        details:
          `hook self-Ontology seed in sync with live hooks/ surface ` +
          `(${drift.seedTotal} hooks, ${drift.seedWired} wired / ${drift.seedOrphan} orphan)`,
        liveOnly: 0,
        seedOnly: 0,
        wiringMismatches: 0,
        seedTotal: drift.seedTotal,
        liveTotal: drift.liveTotal,
        countsMatch: true,
      };
    }
    return {
      status: "fail",
      details:
        `hook self-Ontology seed is STALE: ` +
        `liveOnly=${drift.liveOnly.length}${drift.liveOnly.length ? ` [${drift.liveOnly.join(",")}]` : ""} ` +
        `seedOnly=${drift.seedOnly.length}${drift.seedOnly.length ? ` [${drift.seedOnly.join(",")}]` : ""} ` +
        `wiringMismatches=${drift.wiringMismatches.length}${drift.wiringMismatches.length ? ` [${drift.wiringMismatches.join(",")}]` : ""} ` +
        `seedTotal=${drift.seedTotal} liveTotal=${drift.liveTotal} ` +
        `seedWired=${drift.seedWired} liveWired=${drift.liveWired} seedUnique=${drift.seedUnique} ` +
        `— update runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts (HOOK_INSTANCES) ` +
        `and the EXPECTED_* pins in tests/ontology/self/hook-registration.test.ts`,
      liveOnly: drift.liveOnly.length,
      seedOnly: drift.seedOnly.length,
      wiringMismatches: drift.wiringMismatches.length,
      seedTotal: drift.seedTotal,
      liveTotal: drift.liveTotal,
      countsMatch,
    };
  } catch (err) {
    return {
      status: "fail",
      details: `hook self-Ontology seed check error: ${err instanceof Error ? err.message : String(err)}`,
      liveOnly: 0,
      seedOnly: 0,
      wiringMismatches: 0,
      seedTotal: 0,
      liveTotal: 0,
      countsMatch: false,
    };
  }
}
