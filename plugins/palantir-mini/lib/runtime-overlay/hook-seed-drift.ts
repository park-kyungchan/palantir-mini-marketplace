// palantir-mini — hook self-Ontology seed drift helper
//
// runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts is a
// HAND-MAINTAINED seed: it declares the Hook ObjectType and seeds HOOK_INSTANCES
// (one entry per live hook file, with its wired/orphan axis). The snapshot OWNS
// the seed (it is the authority, so it does NOT import the hooks layer uphill),
// which means adding a hooks/<id>.ts + wiring it in hooks/hooks.json does NOT
// auto-register a HOOK_INSTANCES entry nor bump the EXPECTED_* pins. That drift
// recurred twice (bd-012). This helper computes that drift IN-PLACE over the live
// hooks/ surface so the release self-check can FAIL LOUD the moment the seed no
// longer matches the live hook surface.
//
// It is the single source of truth shared by:
//   - bridge/handlers/pm-plugin-self-check/check-hook-seed.ts (release gate axis)
//
// Pins (EXPECTED_*) are derived from the SEED here, not hard-coded a second time:
// the seed length IS the expected total, and the seed's wired/orphan split IS the
// expected split. The gate then asserts the LIVE filesystem + hooks.json wiring
// equal those seed-derived expectations, so any of the three drifting apart fails.
//
// Authority:
//   - rules/08-schema-versioning.md (schema semver as tracked interface)
//   - runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts (the seed)
//   - tests/ontology/self/hook-registration.test.ts (the paired bun-test guard)

import * as fs from "fs";
import * as path from "path";
import { HOOK_INSTANCES } from "#schemas/ontology/self";
import { resolvePalantirMiniRoot } from "../config/root";

/** Absolute path to the live hooks/ directory. */
export function hooksDir(pluginRoot = resolvePalantirMiniRoot()): string {
  return path.join(pluginRoot, "hooks");
}

// HOOK-3 coalesce (mirrors tests/ontology/self/hook-registration.test.ts): the
// four emit_event PostToolUse consumers are NOT listed individually in hooks.json
// — they fire as in-process members of the `emit-event-postdispatch` aggregator
// (the single wired hooks.json entry). They remain genuinely wired
// (orphanInRegistry:false). The wiring parse below reads commands literally, so a
// wired aggregator transitively wires its declared members.
const AGGREGATOR_MEMBERS: Record<string, readonly string[]> = {
  "emit-event-postdispatch": [
    "outcome-pair-tracker",
    "memory-layer-validator",
    "t3-circuit-feeder",
    "t4-canonical-emit-watch",
  ],
};

/** Top-level hook file basenames (the live hook surface). Subdirectory helper dirs are not hooks. */
export function liveHookIds(pluginRoot = resolvePalantirMiniRoot()): string[] {
  const dir = hooksDir(pluginRoot);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".ts"))
    .map((e) => e.name.slice(0, -3))
    .sort();
}

/**
 * The set of hookIds the live hooks/hooks.json literally wires, resolving each
 * command's hookId from either a direct `hooks/<id>.ts` command or the
 * `scripts/run.ts <id>` dispatcher form, then expanding in-process aggregators.
 * JSON.parse is the faithful read (the wiring SoT is JSON; raw-text regex over the
 * file would be defeated by JSON quote-escaping).
 */
export function liveWiredHookIds(pluginRoot = resolvePalantirMiniRoot()): Set<string> {
  const hooksJsonPath = path.join(hooksDir(pluginRoot), "hooks.json");
  const wired = new Set<string>();
  let parsed: { hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>> };
  try {
    parsed = JSON.parse(fs.readFileSync(hooksJsonPath, "utf8"));
  } catch {
    return wired;
  }
  const events = parsed.hooks ?? (parsed as Record<string, unknown>);
  for (const arr of Object.values(events)) {
    if (!Array.isArray(arr)) continue;
    for (const matcher of arr as Array<{ hooks?: Array<{ command?: string }> }>) {
      for (const h of matcher.hooks ?? []) {
        const cmd = h.command ?? "";
        const direct = cmd.match(/\/hooks\/([a-z0-9-]+)\.ts/);
        if (direct) {
          wired.add(direct[1]!);
          continue;
        }
        const disp = cmd.match(/\/scripts\/run\.ts"?\s+([a-z0-9-]+)/);
        if (disp) wired.add(disp[1]!);
      }
    }
  }
  for (const [aggregator, members] of Object.entries(AGGREGATOR_MEMBERS)) {
    if (wired.has(aggregator)) {
      for (const m of members) wired.add(m);
    }
  }
  return wired;
}

export interface HookSeedDrift {
  /** Live hook files present on disk but absent from the HOOK_INSTANCES seed. */
  liveOnly: string[];
  /** Seed entries with no matching live hook file. */
  seedOnly: string[];
  /** Live-wired hooks whose seed entry is (wrongly) marked orphan, or vice versa. */
  wiringMismatches: string[];
  /** Seed total (HOOK_INSTANCES.length) vs live top-level hook-file count. */
  seedTotal: number;
  liveTotal: number;
  /** Seed wired/orphan split (derived from orphanInRegistry) vs live wired count. */
  seedWired: number;
  seedOrphan: number;
  liveWired: number;
  /** True when the seed has no duplicate hookIds. */
  seedUnique: boolean;
}

export interface HookSeedVerifyResult {
  inSync: boolean;
  drift: HookSeedDrift;
}

/**
 * Verify the HOOK_INSTANCES seed against the live hooks/ filesystem + hooks.json
 * wiring. Pure read — never writes. inSync is false when:
 *   - a live hook file has no seed entry (a hook was added without seeding it),
 *   - a seed entry has no live hook file (a hook was removed without de-seeding),
 *   - a seed entry's orphanInRegistry disagrees with the live hooks.json wiring,
 *   - the seed/live totals or wired counts disagree, or the seed has duplicates.
 */
export function verifyHookSeed(
  pluginRoot = resolvePalantirMiniRoot(),
): HookSeedVerifyResult {
  const seedIds = HOOK_INSTANCES.map((h) => h.hookId);
  const seedSet = new Set(seedIds);
  const seedUnique = seedSet.size === seedIds.length;

  const liveIds = liveHookIds(pluginRoot);
  const liveSet = new Set(liveIds);

  const liveOnly = [...liveSet].filter((id) => !seedSet.has(id)).sort();
  const seedOnly = [...seedSet].filter((id) => !liveSet.has(id)).sort();

  const wiredLive = liveWiredHookIds(pluginRoot);
  // A seed entry's orphanInRegistry must equal "id is NOT in the live wired set".
  const wiringMismatches = HOOK_INSTANCES.filter(
    (h) => h.orphanInRegistry !== !wiredLive.has(h.hookId),
  )
    .map((h) => h.hookId)
    .sort();

  const seedOrphan = HOOK_INSTANCES.filter((h) => h.orphanInRegistry).length;
  const seedWired = HOOK_INSTANCES.length - seedOrphan;

  const inSync =
    liveOnly.length === 0 &&
    seedOnly.length === 0 &&
    wiringMismatches.length === 0 &&
    seedUnique &&
    HOOK_INSTANCES.length === liveIds.length &&
    seedWired === wiredLive.size;

  return {
    inSync,
    drift: {
      liveOnly,
      seedOnly,
      wiringMismatches,
      seedTotal: HOOK_INSTANCES.length,
      liveTotal: liveIds.length,
      seedWired,
      seedOrphan,
      liveWired: wiredLive.size,
      seedUnique,
    },
  };
}
