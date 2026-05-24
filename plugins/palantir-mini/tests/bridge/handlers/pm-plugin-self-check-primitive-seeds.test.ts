/**
 * palantir-mini v3.5.0 — pm_plugin_self_check primitiveSeedAdvisories tests (B1 split sibling)
 *
 * v2.27.0 Phase 2d advisory cross-check between filesystem walk + primitive seed
 * registry. Filesystem REMAINS AUTHORITATIVE — advisories surface mismatches but
 * do NOT fail overallStatus. v1.28.0+ flips authority once seed accuracy is proven.
 *
 * Covers:
 *   8. result includes primitiveSeedAdvisories shape
 *   9. primitiveSeedAdvisories does NOT influence overallStatus
 *   10. cross-check parity: filesystem agents matched against seeded plugin agents
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as path from "path";
import { pmPluginSelfCheck } from "../../../bridge/handlers/pm-plugin-self-check";
import {
  cleanupTmpDirs,
  makeTmpDir,
  restoreEnv,
  saveEnv,
} from "./pm-plugin-self-check/fixtures";

beforeEach(() => {
  saveEnv();
});

afterEach(() => {
  restoreEnv();
  cleanupTmpDirs();
});

describe("pm_plugin_self_check — primitiveSeedAdvisories (v2.27.0)", () => {
  test("8. result includes primitiveSeedAdvisories shape", async () => {
    const eventsDir = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = eventsDir;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(eventsDir, "events.jsonl");

    const result = await pmPluginSelfCheck({});

    expect(result.primitiveSeedAdvisories).toBeDefined();
    expect(Array.isArray(result.primitiveSeedAdvisories.agents.filesystemOnly)).toBe(true);
    expect(Array.isArray(result.primitiveSeedAdvisories.agents.seedOnly)).toBe(true);
    expect(Array.isArray(result.primitiveSeedAdvisories.skills.filesystemOnly)).toBe(true);
    expect(Array.isArray(result.primitiveSeedAdvisories.skills.seedOnly)).toBe(true);
  });

  test("9. primitiveSeedAdvisories does NOT influence overallStatus", async () => {
    const eventsDir = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = eventsDir;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(eventsDir, "events.jsonl");

    const result = await pmPluginSelfCheck({});

    expect(result.schemaPinResult.status).toBe("pass");
    expect(result.declaredAgentsResult.status).toBe("pass");
    expect(result.declaredSkillsResult.status).toBe("pass");
    expect(result.overallStatus).toBe("pass");
  });

  test("10. cross-check parity: filesystem agents matched against seeded plugin agents", async () => {
    const eventsDir = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = eventsDir;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(eventsDir, "events.jsonl");

    const result = await pmPluginSelfCheck({});

    // v2.27.0 ship-time invariant: NO seeded entries that don't exist on disk
    expect(result.primitiveSeedAdvisories.agents.seedOnly).toEqual([]);
    expect(result.primitiveSeedAdvisories.skills.seedOnly).toEqual([]);
  });
});
