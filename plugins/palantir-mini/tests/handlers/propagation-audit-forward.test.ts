// palantir-mini v4.0.0 — handler test: propagation_audit_forward
// Covers: happy path (all steps pass), startStep skip, step failure, event emission.

import { test, expect, describe, afterAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDirs: string[] = [];
afterAll(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "paf-"));
  tmpDirs.push(d);
  return d;
}

function sessionDir(project: string): void {
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
}

async function importHandler(project: string) {
  process.env.PALANTIR_MINI_PROJECT = project;
  sessionDir(project);
  const mod = await import("../../bridge/handlers/propagation-audit-forward");
  return mod.default;
}

describe("propagation_audit_forward", () => {
  test("happy: all steps resolve, verdict=pass or fail based on actual fs", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.auditId).toBeTypeOf("string");
    expect(result.auditId.length).toBeGreaterThan(0);
    expect(["pass", "fail"]).toContain(result.verdict);
    expect(result.auditedAt).toBeTypeOf("string");
    expect(result.chainSteps.length).toBeGreaterThan(0);
    // perStepResult has at least one entry
    expect(Object.keys(result.perStepResult).length).toBeGreaterThan(0);
  });

  test("startStep=schema: skips research, walks schema→runtime", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project, startStep: "schema" });

    expect(result.chainSteps).not.toContain("research");
    expect(result.chainSteps).toContain("schema");
  });

  test("startStep=runtime: only runtime step walked", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project, startStep: "runtime" });

    expect(result.chainSteps).toEqual(["runtime"]);
    expect(result.perStepResult["runtime"]).toBeDefined();
    expect(result.perStepResult["research"]).toBeUndefined();
  });

  test("project with package.json: runtime step passes", async () => {
    const project = tmp();
    fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));
    const handler = await importHandler(project);
    const result = await handler({ project, startStep: "runtime" });

    expect(result.perStepResult["runtime"]?.pass).toBe(true);
    expect(result.verdict).toBe("pass");
  });

  test("project with malformed package.json: runtime step fails", async () => {
    const project = tmp();
    fs.writeFileSync(path.join(project, "package.json"), "{ not valid json }}}");
    const handler = await importHandler(project);
    const result = await handler({ project, startStep: "runtime" });

    expect(result.perStepResult["runtime"]?.pass).toBe(false);
    expect(result.verdict).toBe("fail");
    expect(result.firstFailureStep).toBe("runtime");
  });

  test("project with ontology dir: project-ontology step passes", async () => {
    const project = tmp();
    fs.mkdirSync(path.join(project, "ontology"), { recursive: true });
    const handler = await importHandler(project);
    const result = await handler({ project, startStep: "project-ontology" });

    expect(result.perStepResult["project-ontology"]?.pass).toBe(true);
  });

  test("firstFailureStep is null when all walked steps pass", async () => {
    const project = tmp();
    fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ name: "x" }));
    const handler = await importHandler(project);
    const result = await handler({ project, startStep: "runtime" });

    expect(result.firstFailureStep).toBeNull();
  });

  test("event emission: emits propagation_audit_forward_completed", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    await handler({ project });

    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload?: { errorClass?: string } });
    expect(events.some((e) => e.type === "validation_phase_completed" && e.payload?.errorClass === "propagation_audit_forward")).toBe(true);
  });

  test("result shape: all required PropagationAuditPayload fields present", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result).toHaveProperty("auditId");
    expect(result).toHaveProperty("chainSteps");
    expect(result).toHaveProperty("firstFailureStep");
    expect(result).toHaveProperty("perStepResult");
    expect(result).toHaveProperty("verdict");
    expect(result).toHaveProperty("auditedAt");
  });
});
