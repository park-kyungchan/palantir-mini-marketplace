// palantir-mini v4.12.0 — pm-preamble --effort flag deprecation probe tests
// Sprint-060 W1.6 — closes P1.SP3 / architecture review F.4.
//
// Coverage:
//   (1) Probe success — exec succeeds, no deprecation signal → ok=true cached
//   (2) Probe deprecated stderr — deprecation keyword in stderr → ok=false, warning returned
//   (3) Probe missing CLI (ENOENT) → ok=true skipped, no warning
//   (4) Cached result reuse — second call reads cache, no re-probe

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  effortProbeCachePath,
  readProbeCache,
  runEffortProbe,
  sessionEffortProbe,
  type ExecFn,
} from "../../../bridge/handlers/pm-preamble/effort-probe";

// ─── Setup / teardown ─────────────────────────────────────────────────────────

const tmpRoots: string[] = [];

function makeTmpRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `effort-probe-${label}-`));
  tmpRoots.push(root);
  return root;
}

function ensureSessionDir(root: string): void {
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) {
    fs.rmSync(r, { recursive: true, force: true });
  }
});

// ─── Helpers: injectable exec fns ─────────────────────────────────────────────

/** Exec fn that succeeds (no throw). */
function successExec(): ExecFn {
  return (_cmd, _opts) => { /* noop — exit 0 */ };
}

/** Exec fn that throws with a deprecation signal in stderr. */
function deprecatedExec(keyword: string = "deprecated"): ExecFn {
  return (_cmd, _opts) => {
    const err = new Error(`--effort flag ${keyword}`) as Error & {
      code?: string;
      stderr?: string;
      status?: number;
    };
    err.code = "1";
    err.status = 1;
    err.stderr = `--effort flag is ${keyword}, use --thinking-budget instead`;
    throw err;
  };
}

/** Exec fn that throws ENOENT (binary not found). */
function enoentExec(): ExecFn {
  return (_cmd, _opts) => {
    const err = new Error("spawn claude ENOENT") as Error & { code?: string };
    err.code = "ENOENT";
    throw err;
  };
}

/** Exec fn that throws ETIMEDOUT. */
function etimedoutExec(): ExecFn {
  return (_cmd, _opts) => {
    const err = new Error("Command timed out") as Error & { code?: string };
    err.code = "ETIMEDOUT";
    throw err;
  };
}

/** Exec fn that counts calls and succeeds. */
function countingSuccessExec(): { execFn: ExecFn; callCount: () => number } {
  let count = 0;
  return {
    execFn: (_cmd, _opts) => { count += 1; },
    callCount: () => count,
  };
}

// ─── Case 1: probe success ────────────────────────────────────────────────────

describe("effort probe — success path", () => {
  test("exec succeeds → ok=true, cache written", () => {
    const root = makeTmpRoot("success");

    const result = runEffortProbe(root, successExec());

    expect(result.ok).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.deprecatedStderr).toBeUndefined();
    expect(typeof result.probedAt).toBe("string");

    // Cache must be written
    const cached = readProbeCache(root);
    expect(cached).not.toBeNull();
    expect(cached!.ok).toBe(true);
  });

  test("sessionEffortProbe returns null on success (no warning needed)", () => {
    const root = makeTmpRoot("session-success");

    const warning = sessionEffortProbe(root, successExec());
    expect(warning).toBeNull();
  });

  test("success → cache file exists at expected path", () => {
    const root = makeTmpRoot("cache-exists");

    runEffortProbe(root, successExec());

    const cachePath = effortProbeCachePath(root);
    expect(fs.existsSync(cachePath)).toBe(true);
  });
});

// ─── Case 2: deprecation signal detected ─────────────────────────────────────

describe("effort probe — deprecation signal path", () => {
  test("stderr contains 'deprecated' → ok=false, deprecatedStderr captured", () => {
    const root = makeTmpRoot("deprecated");

    const result = runEffortProbe(root, deprecatedExec("deprecated"));

    expect(result.ok).toBe(false);
    expect(typeof result.deprecatedStderr).toBe("string");
    expect(result.deprecatedStderr!.toLowerCase()).toContain("deprecated");

    // Cache must reflect the failure
    const cached = readProbeCache(root);
    expect(cached).not.toBeNull();
    expect(cached!.ok).toBe(false);
    expect(cached!.deprecatedStderr).toBeDefined();
  });

  test("stderr contains 'unknown flag' → ok=false", () => {
    const root = makeTmpRoot("unknown-flag");

    const result = runEffortProbe(root, deprecatedExec("unknown flag"));
    expect(result.ok).toBe(false);
    expect(result.deprecatedStderr).toBeDefined();
  });

  test("stderr contains 'unrecognized option' → ok=false", () => {
    const root = makeTmpRoot("unrecognized");

    const result = runEffortProbe(root, deprecatedExec("unrecognized option"));
    expect(result.ok).toBe(false);
  });

  test("sessionEffortProbe returns deprecation payload when probe fails", () => {
    const root = makeTmpRoot("session-deprecated");

    const warning = sessionEffortProbe(root, deprecatedExec("deprecated"));
    expect(warning).not.toBeNull();
    expect(warning!.deprecatedStderr).toBeDefined();
    expect(typeof warning!.probedAt).toBe("string");
  });

  test("non-deprecation stderr error → ok=true (not a deprecation signal)", () => {
    const root = makeTmpRoot("other-error");

    // Non-zero exit with irrelevant error message
    const otherErrorExec: ExecFn = (_cmd, _opts) => {
      const err = new Error("some unexpected internal error") as Error & {
        code?: string;
        stderr?: string;
        status?: number;
      };
      err.code = "1";
      err.status = 1;
      err.stderr = "Internal server error: unrelated to --effort";
      throw err;
    };

    const result = runEffortProbe(root, otherErrorExec);
    // "unrelated" doesn't match any deprecation signal
    expect(result.ok).toBe(true);
    expect(result.deprecatedStderr).toBeUndefined();
  });
});

// ─── Case 3: missing CLI (ENOENT) ────────────────────────────────────────────

describe("effort probe — missing CLI path", () => {
  test("ENOENT → ok=true, skipped=true, no warning emitted", () => {
    const root = makeTmpRoot("enoent");

    const result = runEffortProbe(root, enoentExec());
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.deprecatedStderr).toBeUndefined();
  });

  test("ENOENT → sessionEffortProbe returns null (best-effort, no warning)", () => {
    const root = makeTmpRoot("session-enoent");

    const warning = sessionEffortProbe(root, enoentExec());
    expect(warning).toBeNull();
  });

  test("ETIMEDOUT → ok=true, skipped=true (CLI unresponsive, not deprecation)", () => {
    const root = makeTmpRoot("etimedout");

    const result = runEffortProbe(root, etimedoutExec());
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  test("ENOENT → cache written with ok=true, skipped=true", () => {
    const root = makeTmpRoot("enoent-cache");

    runEffortProbe(root, enoentExec());

    const cached = readProbeCache(root);
    expect(cached).not.toBeNull();
    expect(cached!.ok).toBe(true);
    expect(cached!.skipped).toBe(true);
  });
});

// ─── Case 4: cached result reuse ─────────────────────────────────────────────

describe("effort probe — cache reuse", () => {
  test("second sessionEffortProbe call reads cache — execFn NOT called again", () => {
    const root = makeTmpRoot("cache-reuse");

    const { execFn, callCount } = countingSuccessExec();

    // First call — runs probe
    sessionEffortProbe(root, execFn);
    expect(callCount()).toBe(1);

    // Second call — reads cache, probe must NOT re-run
    sessionEffortProbe(root, execFn);
    expect(callCount()).toBe(1);
  });

  test("pre-seeded ok cache → sessionEffortProbe returns null without probing", () => {
    const root = makeTmpRoot("pre-seeded-ok");
    ensureSessionDir(root);

    // Write a pre-existing ok cache
    const cachePath = effortProbeCachePath(root);
    fs.writeFileSync(
      cachePath,
      JSON.stringify({ ok: true, probedAt: "2026-05-09T00:00:00.000Z" }),
      "utf8",
    );

    const { execFn, callCount } = countingSuccessExec();

    const warning = sessionEffortProbe(root, execFn);
    expect(warning).toBeNull();
    expect(callCount()).toBe(0);
  });

  test("pre-seeded deprecated cache → sessionEffortProbe returns warning without probing", () => {
    const root = makeTmpRoot("pre-seeded-bad");
    ensureSessionDir(root);

    // Write a pre-existing deprecation cache
    const cachePath = effortProbeCachePath(root);
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        ok: false,
        deprecatedStderr: "--effort is deprecated (cached)",
        probedAt: "2026-05-09T00:00:00.000Z",
      }),
      "utf8",
    );

    const { execFn, callCount } = countingSuccessExec();

    const warning = sessionEffortProbe(root, execFn);
    expect(warning).not.toBeNull();
    expect(warning!.deprecatedStderr).toContain("deprecated");
    expect(callCount()).toBe(0);
  });

  test("malformed cache file → treated as cache miss, probe runs", () => {
    const root = makeTmpRoot("malformed-cache");
    ensureSessionDir(root);

    const cachePath = effortProbeCachePath(root);
    fs.writeFileSync(cachePath, "not-valid-json", "utf8");

    const { execFn, callCount } = countingSuccessExec();

    sessionEffortProbe(root, execFn);
    expect(callCount()).toBe(1);
  });
});

// ─── Cache path helper ────────────────────────────────────────────────────────

describe("effortProbeCachePath", () => {
  test("returns path inside .palantir-mini/session/", () => {
    const root = "/tmp/test-project";
    const cachePath = effortProbeCachePath(root);
    expect(cachePath).toContain(".palantir-mini");
    expect(cachePath).toContain("session");
    expect(cachePath).toContain(".effort-probe.json");
  });

  test("path is under the provided projectRoot", () => {
    const root = "/home/user/my-project";
    const cachePath = effortProbeCachePath(root);
    expect(cachePath.startsWith(root)).toBe(true);
  });
});
