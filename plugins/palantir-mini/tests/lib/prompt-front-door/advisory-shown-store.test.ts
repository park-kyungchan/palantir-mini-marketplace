/**
 * Tests for lib/prompt-front-door/advisory-shown-store.ts — G-ADV-N advisory
 * boilerplate token diet (pm auth-friction closure, slice 2).
 *
 * Coverage:
 *   - first check for a class is false.
 *   - after markAdvisoryBoilerplateShown, the SAME class reads true.
 *   - a DIFFERENT class in the same session is still false (per-class
 *     independence, not a global session-wide "shown anything" flag).
 *   - a different sessionId is false (no cross-session leakage).
 *   - a corrupt/missing file fails open to false, never throws.
 *   - PALANTIR_MINI_GLOBAL_STATE_DIR overrides the root (hermeticity).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  advisoryShownStoreRootDir,
  hasAdvisoryBoilerplateBeenShown,
  markAdvisoryBoilerplateShown,
} from "../../../lib/prompt-front-door/advisory-shown-store";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpGlobalStateDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pm-advisory-shown-store-"));
  tmpDirs.push(dir);
  return dir;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR = process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = makeTmpGlobalStateDir();
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR === undefined) {
    delete process.env.PALANTIR_MINI_GLOBAL_STATE_DIR;
  } else {
    process.env.PALANTIR_MINI_GLOBAL_STATE_DIR = savedEnv.PALANTIR_MINI_GLOBAL_STATE_DIR;
  }
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("advisory-shown-store", () => {
  test("root dir is rooted under the PALANTIR_MINI_GLOBAL_STATE_DIR override", () => {
    const root = advisoryShownStoreRootDir();
    expect(root.startsWith(process.env.PALANTIR_MINI_GLOBAL_STATE_DIR!)).toBe(true);
    expect(root).toContain(".palantir-mini");
    expect(root.endsWith(path.join("session", "prompt-dtc-advisory-shown"))).toBe(true);
  });

  test("first check for a class is false", async () => {
    const shown = await hasAdvisoryBoilerplateBeenShown("claude", "session-first", "scoped-advisory");
    expect(shown).toBe(false);
  });

  test("after markAdvisoryBoilerplateShown, the same class reads true", async () => {
    await markAdvisoryBoilerplateShown("claude", "session-mark", "scoped-advisory");
    const shown = await hasAdvisoryBoilerplateBeenShown("claude", "session-mark", "scoped-advisory");
    expect(shown).toBe(true);
  });

  test("a different class in the same session is still false (per-class independence)", async () => {
    await markAdvisoryBoilerplateShown("claude", "session-per-class", "scoped-advisory");
    const sicMissShown = await hasAdvisoryBoilerplateBeenShown(
      "claude",
      "session-per-class",
      "sic-miss",
    );
    expect(sicMissShown).toBe(false);
    const genericShown = await hasAdvisoryBoilerplateBeenShown(
      "claude",
      "session-per-class",
      "generic-blocking",
    );
    expect(genericShown).toBe(false);
    const deliveryShown = await hasAdvisoryBoilerplateBeenShown(
      "claude",
      "session-per-class",
      "delivery-blocking",
    );
    expect(deliveryShown).toBe(false);
    // The originally-marked class is unaffected by the reads above.
    const scopedShown = await hasAdvisoryBoilerplateBeenShown(
      "claude",
      "session-per-class",
      "scoped-advisory",
    );
    expect(scopedShown).toBe(true);
  });

  test("a different sessionId is false (no cross-session leakage)", async () => {
    await markAdvisoryBoilerplateShown("claude", "session-a", "generic-blocking");
    const shownB = await hasAdvisoryBoilerplateBeenShown("claude", "session-b", "generic-blocking");
    expect(shownB).toBe(false);
  });

  test("a different runtime for the same sessionId is tracked independently", async () => {
    await markAdvisoryBoilerplateShown("claude", "session-shared", "delivery-blocking");
    const codexShown = await hasAdvisoryBoilerplateBeenShown(
      "codex",
      "session-shared",
      "delivery-blocking",
    );
    expect(codexShown).toBe(false);
  });

  test("corrupt file fails open to false, never throws", async () => {
    const root = advisoryShownStoreRootDir();
    mkdirSync(root, { recursive: true });
    const filePath = path.join(root, "claude-session-corrupt.json");
    writeFileSync(filePath, "{ not valid json", "utf8");

    const shown = await hasAdvisoryBoilerplateBeenShown("claude", "session-corrupt", "scoped-advisory");
    expect(shown).toBe(false);
  });

  test("missing file fails open to false", async () => {
    const shown = await hasAdvisoryBoilerplateBeenShown("claude", "session-missing", "sic-miss");
    expect(shown).toBe(false);
  });

  test("markAdvisoryBoilerplateShown is idempotent for the same class", async () => {
    await markAdvisoryBoilerplateShown("claude", "session-idempotent", "generic-blocking");
    await markAdvisoryBoilerplateShown("claude", "session-idempotent", "generic-blocking");
    const shown = await hasAdvisoryBoilerplateBeenShown(
      "claude",
      "session-idempotent",
      "generic-blocking",
    );
    expect(shown).toBe(true);
  });

  test("marking a second class accumulates rather than overwriting the first", async () => {
    await markAdvisoryBoilerplateShown("claude", "session-accumulate", "scoped-advisory");
    await markAdvisoryBoilerplateShown("claude", "session-accumulate", "sic-miss");
    expect(
      await hasAdvisoryBoilerplateBeenShown("claude", "session-accumulate", "scoped-advisory"),
    ).toBe(true);
    expect(
      await hasAdvisoryBoilerplateBeenShown("claude", "session-accumulate", "sic-miss"),
    ).toBe(true);
  });
});
