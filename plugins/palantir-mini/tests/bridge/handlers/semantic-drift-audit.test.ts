/**
 * palantir-mini — semantic_drift_audit MCP handler tests
 * Task #29 (W3.6)
 *
 * Covers: missing project arg throws; valid project returns SemanticDriftAuditResult shape.
 * Smoke test targets the plugin root (guaranteed to have ontology/ + src/generated/).
 */

import { test, expect, describe } from "bun:test";
import semanticDriftAudit from "../../../bridge/handlers/semantic-drift-audit";


describe("semantic_drift_audit handler", () => {
  test("throws when project is missing or invalid", async () => {
    await expect(semanticDriftAudit({})).rejects.toThrow("project");
    await expect(semanticDriftAudit(null)).rejects.toThrow("project");
    await expect(semanticDriftAudit({ project: 123 })).rejects.toThrow("project");
  });

  test("returns SemanticDriftAuditResult shape against palantir-math", async () => {
    const result = await semanticDriftAudit({
      project: "/home/palantirkc/projects/palantir-math",
    });

    // Top-level shape
    expect(typeof result.project).toBe("string");
    expect(typeof result.overallAligned).toBe("boolean");
    expect(typeof result.auditedAt).toBe("string");
    // auditedAt must be a valid ISO-8601 string
    expect(Number.isNaN(Date.parse(result.auditedAt))).toBe(false);

    // Layers present
    expect(typeof result.layers).toBe("object");
    for (const key of ["ontology", "codegen", "runtime", "verification"] as const) {
      const layer = result.layers[key];
      expect(typeof layer.nodeCount).toBe("number");
      expect(layer.nodeCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(layer.uncertainties)).toBe(true);
      expect(typeof layer.durationMs).toBe("number");
    }

    // Findings array
    expect(Array.isArray(result.findings)).toBe(true);
    for (const finding of result.findings) {
      expect(["critical", "warn", "info"]).toContain(finding.severity);
      expect(typeof finding.layer).toBe("string");
      expect(typeof finding.message).toBe("string");
      expect(typeof finding.remediation).toBe("string");
    }

    // palantir-math has ontology nodes → smoke-check overallAligned reflects no critical issues
    // (prod test confirmed ontNodes=146, verifyNodes=25, aligned=true)
    expect(result.layers.ontology.nodeCount).toBeGreaterThan(0);
    expect(result.overallAligned).toBe(true);
  });
});
