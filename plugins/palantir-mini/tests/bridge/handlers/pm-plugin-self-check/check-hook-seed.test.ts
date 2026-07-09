// palantir-mini — check-hook-seed tests (bd-012 P2-4 hook self-Ontology seed gate)
//
// Covers:
//   1. Live-repo green gate: checkHookSeed() → pass (seed matches live hooks/).
//   2. Lib drift detection — added hook: a live hooks/<id>.ts with no HOOK_INSTANCES
//      seed entry is reported liveOnly (the exact bd-012 recurrence: add a hook,
//      forget the seed).
//   3. Lib drift detection — wiring flip: a live hook left UNWIRED in hooks.json
//      while the seed still marks it wired is reported as a wiring mismatch.
//   4. Release-mode wiring: pmPluginSelfCheck({ mode: "release" }) carries
//      hookSeedResult and lists "hook-seed" in activeChecks. (The narrow "hooks"
//      mode stays scoped to lifecycle-hook timeout/forbidden-command policy — the
//      seed drift axis is a release/CI integrity gate, like schemas-snapshot-manifest.)

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pmPluginSelfCheck } from "../../../../bridge/handlers/pm-plugin-self-check";
import { checkHookSeed } from "../../../../bridge/handlers/pm-plugin-self-check/check-hook-seed";
import { verifyHookSeed } from "../../../../lib/runtime-overlay/hook-seed-drift";
import { resolvePalantirMiniRoot } from "../../../../lib/config/root";

const originalProjectEnv = process.env.PALANTIR_MINI_PROJECT;
const originalEventsFileEnv = process.env.PALANTIR_MINI_EVENTS_FILE;

// g10 fix follow-through: PALANTIR_MINI_PROJECT is now the highest-priority
// root override (resolveEmitRoot()), so leaving it set after this file's
// tests would hijack every other test file's emit() calls in the same bun
// test process. Restore it (and the paired events-file override) afterward.
afterEach(() => {
  if (originalProjectEnv === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = originalProjectEnv;
  if (originalEventsFileEnv === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = originalEventsFileEnv;
});

const eventsEnv = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-hookseed-"));
  process.env.PALANTIR_MINI_PROJECT = dir;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(dir, "events.jsonl");
};

/**
 * Build a throwaway pluginRoot whose hooks/ is a copy of the live hooks dir, so a
 * test can mutate the LIVE side (add/un-wire a hook) while HOOK_INSTANCES (the
 * statically-imported seed) stays fixed — exactly the silent-drift scenario.
 */
function tempPluginRootFromLiveHooks(): string {
  const liveHooks = path.join(resolvePalantirMiniRoot(), "hooks");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-hookseed-root-"));
  fs.cpSync(liveHooks, path.join(root, "hooks"), { recursive: true });
  return root;
}

describe("check-hook-seed", () => {
  test("1. live repo: hook self-Ontology seed is in sync with live hooks/ surface", () => {
    const result = checkHookSeed();
    expect(result.status).toBe("pass");
    expect(result.liveOnly).toBe(0);
    expect(result.seedOnly).toBe(0);
    expect(result.wiringMismatches).toBe(0);
    expect(result.countsMatch).toBe(true);
  });

  test("2. drift: an added live hook with no seed entry fails loud (liveOnly)", () => {
    const root = tempPluginRootFromLiveHooks();
    // Simulate the recurring bd-012 defect: drop in a new hook file but never
    // touch the seed. Seeded HOOK_INSTANCES count stays at its live total.
    fs.writeFileSync(
      path.join(root, "hooks", "simulated-missing-seed-hook.ts"),
      "// simulated new hook with no HOOK_INSTANCES seed entry\nexport {};\n",
    );

    const { inSync, drift } = verifyHookSeed(root);
    expect(inSync).toBe(false);
    expect(drift.liveOnly).toContain("simulated-missing-seed-hook");
    expect(drift.liveTotal).toBe(drift.seedTotal + 1);

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("3. drift: un-wiring a seeded-wired hook in hooks.json fails loud (wiringMismatch)", () => {
    const root = tempPluginRootFromLiveHooks();
    const hooksJsonPath = path.join(root, "hooks", "hooks.json");
    const raw = fs.readFileSync(hooksJsonPath, "utf8");
    // Remove every reference to a hook the seed marks WIRED so the live wiring no
    // longer agrees with the seed's orphanInRegistry:false. session-start is wired
    // via the scripts/run.ts dispatcher form. Stripping its command entries drops
    // it from the live wired set while the seed still claims it is wired.
    const parsed = JSON.parse(raw) as {
      hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
    };
    const events = parsed.hooks ?? {};
    for (const arr of Object.values(events)) {
      if (!Array.isArray(arr)) continue;
      for (const matcher of arr) {
        matcher.hooks = (matcher.hooks ?? []).filter(
          (h) => !(typeof h.command === "string" && h.command.includes("session-start")),
        );
      }
    }
    fs.writeFileSync(hooksJsonPath, JSON.stringify(parsed, null, 2) + "\n");

    const { inSync, drift } = verifyHookSeed(root);
    expect(inSync).toBe(false);
    expect(drift.wiringMismatches).toContain("session-start");

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("4. release mode carries the hook-seed axis", async () => {
    eventsEnv();
    const release = await pmPluginSelfCheck({ mode: "release" });
    expect(release.hookSeedResult).toBeDefined();
    expect(release.hookSeedResult.status).toBe("pass");
    expect(release.activeChecks).toContain("hook-seed");
  });

  test("5. hook-seed mode narrowly gates only the seed drift axis", async () => {
    eventsEnv();
    const result = await pmPluginSelfCheck({ mode: "hook-seed" });
    // The narrow per-edit mode runs ONLY the seed axis in its overall-status set.
    expect(result.mode).toBe("hook-seed");
    expect(result.activeChecks).toEqual(["hook-seed"]);
    expect(result.hookSeedResult.status).toBe("pass");
    // hook-seed != the "hooks" registry mode: the registry check is NOT gated here.
    expect(result.activeChecks).not.toContain("hooks");
  });
});
