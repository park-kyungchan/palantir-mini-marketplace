// Sprint-062 W0-gamma — propagation_audit_forward audit test
// Handler: bridge/handlers/propagation-audit-forward.ts
// Coverage: INVALID (project with no schema root), VALID-A (real filesystem chain),
//           VALID-B (startStep skips earlier steps), LINEAGE

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import propagationAuditForward from "../../../bridge/handlers/propagation-audit-forward";

// ── Helpers ────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-prop-forward-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  // Minimal project structure so contracts+runtime steps pass
  fs.mkdirSync(path.join(dir, "ontology"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "test-project", version: "0.0.1" }),
    "utf8",
  );
  return dir;
}

beforeEach(() => {
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE_FORCE"] = process.env["PALANTIR_MINI_EVENTS_FILE_FORCE"];
  const evFile = path.join(os.tmpdir(), `paf-events-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  process.env["PALANTIR_MINI_EVENTS_FILE"] = evFile;
  process.env["PALANTIR_MINI_EVENTS_FILE_FORCE"] = "1";
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* noop */ }
  }
});

// ── INVALID ────────────────────────────────────────────────────────────────

describe("propagation_audit_forward — INVALID", () => {
  test("INVALID-A: project with no ontology or package.json → fail verdict for project-ontology step", async () => {
    // Create a minimal dir with no ontology sub-directory
    const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-paf-bare-"));
    tmpDirs.push(bareDir);
    fs.mkdirSync(path.join(bareDir, ".palantir-mini", "session"), { recursive: true });

    // Start from project-ontology step so we isolate the failure
    const result = await propagationAuditForward({
      project: bareDir,
      startStep: "project-ontology",
    });

    expect(result.verdict).toBe("fail");
    expect(result.firstFailureStep).toBe("project-ontology");
    expect(result.perStepResult["project-ontology"]!.pass).toBe(false);
  });

  test("INVALID-B: nonexistent project path → project-ontology or earlier step fails", async () => {
    // Starting from project-ontology to ensure we don't depend on HOME filesystem
    const result = await propagationAuditForward({
      project: "/nonexistent-path-99999",
      startStep: "project-ontology",
    });
    expect(result.verdict).toBe("fail");
    expect(result.firstFailureStep).toBe("project-ontology");
  });
});

// ── VALID ──────────────────────────────────────────────────────────────────

describe("propagation_audit_forward — VALID", () => {
  test("VALID-A: full chain walk starting from project-ontology → realistic pass", async () => {
    const project = makeProject();
    // Start from project-ontology to avoid HOME dependency (research/schema steps
    // validate ~/.claude/ paths which may vary by environment)
    const result = await propagationAuditForward({
      project,
      startStep: "project-ontology",
    });

    // With ontology/ dir and package.json present, project-ontology + contracts + runtime should pass
    expect(result.verdict).toBe("pass");
    expect(result.firstFailureStep).toBeNull();
    expect(result.perStepResult["project-ontology"]!.pass).toBe(true);
    expect(result.perStepResult["contracts"]!.pass).toBe(true);
    expect(result.perStepResult["runtime"]!.pass).toBe(true);
  });

  test("VALID-B: startStep=contracts skips earlier steps (perStepResult has only walked steps)", async () => {
    const project = makeProject();
    const result = await propagationAuditForward({
      project,
      startStep: "contracts",
    });

    // Steps before contracts should not be in perStepResult
    expect(result.perStepResult["research"]).toBeUndefined();
    expect(result.perStepResult["schema"]).toBeUndefined();
    expect(result.perStepResult["shared-core"]).toBeUndefined();
    expect(result.perStepResult["project-ontology"]).toBeUndefined();

    // contracts + runtime should be present
    expect(result.perStepResult["contracts"]).toBeDefined();
    expect(result.perStepResult["runtime"]).toBeDefined();

    // chainSteps should reflect only walked steps
    expect(result.chainSteps).toContain("contracts");
    expect(result.chainSteps).toContain("runtime");
    expect(result.chainSteps).not.toContain("research");
  });

  test("VALID-C: result shape has required fields (PropagationAuditPayload)", async () => {
    const project = makeProject();
    const result = await propagationAuditForward({ project, startStep: "contracts" });

    expect(typeof result.auditId).toBe("string");
    expect(Array.isArray(result.chainSteps)).toBe(true);
    expect(["pass", "fail"]).toContain(result.verdict);
    expect(typeof result.auditedAt).toBe("string");
    expect(result.perStepResult).toBeDefined();
  });

  test("VALID-D: runtime step fails when package.json is malformed", async () => {
    const project = makeProject();
    // Overwrite package.json with invalid JSON
    fs.writeFileSync(path.join(project, "package.json"), "{ invalid json }", "utf8");

    const result = await propagationAuditForward({
      project,
      startStep: "runtime",
    });

    expect(result.verdict).toBe("fail");
    expect(result.firstFailureStep).toBe("runtime");
    expect(result.perStepResult["runtime"]!.pass).toBe(false);
  });

  test("VALID-E: fail-fast stops at first failure (perStepResult has only walked steps)", async () => {
    const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-paf-failfast-"));
    tmpDirs.push(bareDir);
    fs.mkdirSync(path.join(bareDir, ".palantir-mini", "session"), { recursive: true });
    // No ontology dir, no package.json → project-ontology fails

    const result = await propagationAuditForward({
      project: bareDir,
      startStep: "project-ontology",
    });

    expect(result.verdict).toBe("fail");
    expect(result.firstFailureStep).toBe("project-ontology");
    // contracts/runtime not walked (fail-fast)
    expect(result.perStepResult["contracts"]).toBeUndefined();
    expect(result.perStepResult["runtime"]).toBeUndefined();
  });
});

// ── LINEAGE ────────────────────────────────────────────────────────────────

describe("propagation_audit_forward — LINEAGE", () => {
  test("LINEAGE: emits validation_phase_completed with errorClass=propagation_audit_forward", async () => {
    const project = makeProject();
    const evFile = process.env["PALANTIR_MINI_EVENTS_FILE"]!;

    await propagationAuditForward({ project, startStep: "contracts" });

    expect(fs.existsSync(evFile)).toBe(true);
    const lines = fs.readFileSync(evFile, "utf8").trim().split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload: Record<string, unknown> });

    const fwdEvent = events.find(
      (e) =>
        e.type === "validation_phase_completed" &&
        e.payload.errorClass === "propagation_audit_forward",
    );
    expect(fwdEvent).toBeDefined();
    // passed matches verdict
    const result = await propagationAuditForward({ project, startStep: "contracts" });
    expect(typeof (fwdEvent!.payload.passed as boolean)).toBe("boolean");
    expect(fwdEvent!.payload.passed).toBe(result.verdict === "pass");
  });
});
