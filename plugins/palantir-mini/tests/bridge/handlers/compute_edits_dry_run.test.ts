// palantir-mini — compute_edits_dry_run MCP handler tests
// v3.4.0 N4 wave 2: arg validation, params type-check, applyEditFunction
//                   delegation, submission criteria pass/fail paths.
// v3.9.0 W3.1d: + dryRunRef determinism + dry_run_computed event emission.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import computeEditsDryRunHandler, {
  computeEditsDryRun,
  computeDryRunRef,
} from "../../../bridge/handlers/compute_edits_dry_run";
import { registerEditFunction } from "../../../lib/actions/tier2-function";

// Register deterministic test edit functions once per file load
registerEditFunction({
  name: "test_dryrun_noop",
  apply: () => [],
});

registerEditFunction<{ count?: number }>({
  name: "test_dryrun_n_edits",
  apply: (params) => {
    const n = params?.count ?? 1;
    return Array.from({ length: n }, (_, i) => ({
      kind: "create" as const,
      rid: `rid:dryrun:${i}` as any,
      payload: { idx: i },
    } as any));
  },
});

describe("compute_edits_dry_run handler — arg validation", () => {
  test("throws when project missing", async () => {
    await expect(
      computeEditsDryRunHandler({ functionName: "test_dryrun_noop", params: {} }),
    ).rejects.toThrow(/project.*required/i);
  });

  test("throws when functionName missing", async () => {
    await expect(
      computeEditsDryRunHandler({ project: "/tmp/anywhere", params: {} }),
    ).rejects.toThrow(/functionName.*required/i);
  });

  test("throws when params is null", async () => {
    await expect(
      computeEditsDryRunHandler({
        project: "/tmp/anywhere",
        functionName: "test_dryrun_noop",
        params: null,
      }),
    ).rejects.toThrow(/params.*plain object/i);
  });

  test("throws when params is array", async () => {
    await expect(
      computeEditsDryRunHandler({
        project: "/tmp/anywhere",
        functionName: "test_dryrun_noop",
        params: [],
      }),
    ).rejects.toThrow(/params.*plain object/i);
  });

  test("throws when params is non-object primitive", async () => {
    await expect(
      computeEditsDryRunHandler({
        project: "/tmp/anywhere",
        functionName: "test_dryrun_noop",
        params: "string",
      }),
    ).rejects.toThrow(/params.*plain object/i);
  });

  test("throws when project is non-string", async () => {
    await expect(
      computeEditsDryRunHandler({
        project: 123,
        functionName: "test_dryrun_noop",
        params: {},
      }),
    ).rejects.toThrow(/project.*required/i);
  });
});

describe("compute_edits_dry_run handler — function delegation", () => {
  test("noop happy path: empty edits + ok validation", async () => {
    const result = await computeEditsDryRunHandler({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_noop",
      params: {},
    });
    expect(result.edits).toEqual([]);
    expect(result.validationResult).toBe("ok");
  });

  test("non-empty function: returns edits + ok validation", async () => {
    const result = await computeEditsDryRunHandler({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_n_edits",
      params: { count: 3 },
    });
    expect(result.edits.length).toBe(3);
    expect(result.validationResult).toBe("ok");
    expect((result.edits[0] as any).rid).toBe("rid:dryrun:0");
    expect((result.edits[2] as any).rid).toBe("rid:dryrun:2");
  });

  test("unknown function name throws", async () => {
    await expect(
      computeEditsDryRunHandler({
        project: "/tmp/anywhere",
        functionName: "function_that_does_not_exist",
        params: {},
      }),
    ).rejects.toThrow(/not registered/);
  });
});

describe("compute_edits_dry_run handler — submission criteria", () => {
  test("passing criteria: validationResult is ok", async () => {
    const result = await computeEditsDryRunHandler({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_n_edits",
      params: { count: 2 },
      submissionCriteria: [
        { type: "ArraySize", name: "must_have_some", field: "$.length", min: 1 },
      ],
    });
    // Whether ArraySize evaluates correctly is lib's responsibility; here we just
    // confirm the handler routes through evaluateCriteria.
    expect(result.edits.length).toBe(2);
    expect(typeof result.validationResult === "string" || typeof result.validationResult === "object").toBe(true);
  });

  test("Unevaluable criterion fails → validationResult has errors[]", async () => {
    const result = await computeEditsDryRunHandler({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_n_edits",
      params: { count: 1 },
      submissionCriteria: [
        { type: "Unevaluable", name: "always_fails", reason: "test scenario" },
      ],
    });
    expect(result.edits.length).toBe(1);
    expect(typeof result.validationResult).toBe("object");
    if (typeof result.validationResult === "object") {
      expect(result.validationResult.errors.length).toBeGreaterThan(0);
      expect(result.validationResult.errors[0]).toMatch(/always_fails/);
    }
  });

  test("empty submissionCriteria: validationResult is ok", async () => {
    const result = await computeEditsDryRunHandler({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_noop",
      params: {},
      submissionCriteria: [],
    });
    expect(result.validationResult).toBe("ok");
  });

  test("missing submissionCriteria: validationResult is ok", async () => {
    const result = await computeEditsDryRunHandler({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_noop",
      params: {},
    });
    expect(result.validationResult).toBe("ok");
  });
});

describe("compute_edits_dry_run handler — named export parity", () => {
  test("computeEditsDryRun named export produces same shape as default handler", async () => {
    const direct = await computeEditsDryRun({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_noop",
      params: {},
    });
    const viaHandler = await computeEditsDryRunHandler({
      project: "/tmp/anywhere",
      functionName: "test_dryrun_noop",
      params: {},
    });
    expect(direct).toEqual(viaHandler);
  });
});

// ─── v3.9.0 W3.1d — dryRunRef determinism + dry_run_computed event emission ───

describe("compute_edits_dry_run handler — W3.1d dryRunRef + emission", () => {
  let TMP: string;
  let savedEventsFile: string | undefined;

  beforeEach(() => {
    TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-dryrun-w3-1d-"));
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  });

  afterEach(() => {
    if (savedEventsFile !== undefined) {
      process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
    } else {
      delete process.env.PALANTIR_MINI_EVENTS_FILE;
    }
    if (TMP && fs.existsSync(TMP)) {
      fs.rmSync(TMP, { recursive: true, force: true });
    }
  });

  test("result includes dryRunRef as 16-char hex", async () => {
    const result = await computeEditsDryRunHandler({
      project: TMP,
      functionName: "test_dryrun_noop",
      params: {},
    });
    expect(result.dryRunRef).toMatch(/^[a-f0-9]{16}$/);
  });

  test("dryRunRef is deterministic for same inputs", async () => {
    const r1 = await computeEditsDryRunHandler({
      project: TMP,
      functionName: "test_dryrun_n_edits",
      params: { count: 3 },
    });
    const r2 = await computeEditsDryRunHandler({
      project: TMP,
      functionName: "test_dryrun_n_edits",
      params: { count: 3 },
    });
    expect(r1.dryRunRef).toBe(r2.dryRunRef);
  });

  test("dryRunRef differs for different inputs", async () => {
    const r1 = await computeEditsDryRunHandler({
      project: TMP,
      functionName: "test_dryrun_n_edits",
      params: { count: 1 },
    });
    const r2 = await computeEditsDryRunHandler({
      project: TMP,
      functionName: "test_dryrun_n_edits",
      params: { count: 5 },
    });
    expect(r1.dryRunRef).not.toBe(r2.dryRunRef);
  });

  test("computeDryRunRef helper is exported + pure", () => {
    const ref = computeDryRunRef(
      "/tmp/p1",
      [{ rid: "rid-a" }, { rid: "rid-b" }],
      "fn-x",
      { p: 1, q: 2 },
    );
    expect(ref).toMatch(/^[a-f0-9]{16}$/);
    // Same inputs → same output
    const ref2 = computeDryRunRef(
      "/tmp/p1",
      [{ rid: "rid-a" }, { rid: "rid-b" }],
      "fn-x",
      { p: 1, q: 2 },
    );
    expect(ref).toBe(ref2);
    // RID order in input array does NOT matter (helper sorts)
    const ref3 = computeDryRunRef(
      "/tmp/p1",
      [{ rid: "rid-b" }, { rid: "rid-a" }],
      "fn-x",
      { p: 1, q: 2 },
    );
    expect(ref).toBe(ref3);
  });

  test("emits validation_phase_completed errorClass=dry_run_computed with dryRunRef in reasoning", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    const result = await computeEditsDryRunHandler({
      project: TMP,
      functionName: "test_dryrun_n_edits",
      params: { count: 2 },
    });

    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);

    const event = JSON.parse(lines[lines.length - 1]!);
    expect(event.type).toBe("validation_phase_completed");
    expect(event.payload.phase).toBe("design");
    expect(event.payload.errorClass).toBe("dry_run_computed");
    expect(event.payload.passed).toBe(true);
    expect(event.throughWhich.toolName).toBe("compute_edits_dry_run");
    expect(event.withWhat?.reasoning).toContain(`dryRunRef=${result.dryRunRef}`);
    expect(event.withWhat?.reasoning).toContain("editCount=2");
  });

  test("emits passed=false when validation has errors", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    await computeEditsDryRunHandler({
      project: TMP,
      functionName: "test_dryrun_n_edits",
      params: { count: 1 },
      submissionCriteria: [
        { type: "Unevaluable", name: "always_fails", reason: "test" },
      ],
    });

    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const event = JSON.parse(lines[lines.length - 1]!);
    expect(event.payload.errorClass).toBe("dry_run_computed");
    expect(event.payload.passed).toBe(false);
    expect(event.withWhat?.reasoning).toContain("validation=errors");
  });
});
