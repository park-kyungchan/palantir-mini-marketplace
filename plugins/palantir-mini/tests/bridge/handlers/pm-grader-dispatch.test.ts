/**
 * palantir-mini — pm_grader_dispatch (W3e-1) tests.
 *
 * Covers the dispatch adapter (lib/grader/dispatch-adapter.ts) with an injected
 * exec function (CI never spawns a real claude/codex binary): effort routing,
 * runtime selection via PALANTIR_MINI_HOST_RUNTIME, JSON parse + clamp, and
 * graceful degrade (binary-unavailable / malformed). Plus handler validation.
 */

import { test, expect, describe, afterEach } from "bun:test";
import handler from "../../../bridge/handlers/pm-grader-dispatch";
import {
  dispatchGrader,
  parseLastJsonScore,
  type GraderExecFn,
} from "../../../lib/grader/dispatch-adapter";

const ORIG_RUNTIME = process.env.PALANTIR_MINI_HOST_RUNTIME;
const now0 = () => 0;

afterEach(() => {
  if (ORIG_RUNTIME === undefined) delete process.env.PALANTIR_MINI_HOST_RUNTIME;
  else process.env.PALANTIR_MINI_HOST_RUNTIME = ORIG_RUNTIME;
});

describe("dispatchGrader", () => {
  test("tier=none short-circuits without spawning", async () => {
    let called = false;
    const exec: GraderExecFn = () => {
      called = true;
      return "{}";
    };
    const r = await dispatchGrader(
      { criterionId: "c", scoringPrompt: "p", tier: "none" },
      exec,
      now0,
    );
    expect(called).toBe(false);
    expect(r.score).toBe(0);
    expect(r.reasoning).toContain("no model-dispatch");
  });

  test("successful JSON parse returns clamped score", async () => {
    const exec: GraderExecFn = () => 'preamble prose\n{"score":7,"reasoning":"ok"}';
    const r = await dispatchGrader(
      { criterionId: "c", scoringPrompt: "p", scale: "0-10" },
      exec,
      now0,
    );
    expect(r.score).toBe(7);
    expect(r.reasoning).toBe("ok");
  });

  test("score above scale max is clamped", async () => {
    const exec: GraderExecFn = () => '{"score":99}';
    const r = await dispatchGrader(
      { criterionId: "c", scoringPrompt: "p", scale: "0-10" },
      exec,
      now0,
    );
    expect(r.score).toBe(10);
  });

  test("default runtime = claude-code; cmd targets claude CLI", async () => {
    delete process.env.PALANTIR_MINI_HOST_RUNTIME;
    let cmd = "";
    const exec: GraderExecFn = (c) => {
      cmd = c;
      return '{"score":5}';
    };
    const r = await dispatchGrader({ criterionId: "c", scoringPrompt: "judge", tier: "normal" }, exec, now0);
    expect(r.runtime).toBe("claude-code");
    expect(cmd).toContain("claude -p");
    expect(cmd).not.toContain("--effort"); // normal => no effort flag
  });

  test("tier=critical routes --effort xhigh + opus model label", async () => {
    delete process.env.PALANTIR_MINI_HOST_RUNTIME;
    let cmd = "";
    const exec: GraderExecFn = (c) => {
      cmd = c;
      return '{"score":9}';
    };
    const r = await dispatchGrader({ criterionId: "c", scoringPrompt: "judge", tier: "critical" }, exec, now0);
    expect(cmd).toContain("--effort xhigh");
    expect(r.model).toBe("opus");
  });

  test("runtime=codex selects codex exec", async () => {
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";
    let cmd = "";
    const exec: GraderExecFn = (c) => {
      cmd = c;
      return '{"score":5}';
    };
    const r = await dispatchGrader({ criterionId: "c", scoringPrompt: "judge" }, exec, now0);
    expect(r.runtime).toBe("codex");
    expect(cmd).toContain("codex exec");
  });

  test("binary unavailable (ENOENT) degrades to score 0", async () => {
    const exec: GraderExecFn = () => {
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    };
    const r = await dispatchGrader({ criterionId: "c", scoringPrompt: "p" }, exec, now0);
    expect(r.score).toBe(0);
    expect(r.reasoning).toContain("binary unavailable");
  });

  test("malformed output degrades to score 0", async () => {
    const exec: GraderExecFn = () => "this is not json at all";
    const r = await dispatchGrader({ criterionId: "c", scoringPrompt: "p" }, exec, now0);
    expect(r.score).toBe(0);
    expect(r.reasoning).toContain("not parseable");
  });
});

describe("parseLastJsonScore", () => {
  test("picks the last JSON object with a numeric score", () => {
    const parsed = parseLastJsonScore('{"score":1}\nnoise\n{"score":4,"reasoning":"final"}');
    expect(parsed?.score).toBe(4);
    expect(parsed?.reasoning).toBe("final");
  });
  test("returns null when no JSON score present", () => {
    expect(parseLastJsonScore("just prose")).toBeNull();
  });
});

describe("pm_grader_dispatch handler validation", () => {
  test("missing criterionId throws", async () => {
    await expect(handler({ scoringPrompt: "p" })).rejects.toThrow(/criterionId/);
  });
  test("missing scoringPrompt throws", async () => {
    await expect(handler({ criterionId: "c" })).rejects.toThrow(/scoringPrompt/);
  });
});
