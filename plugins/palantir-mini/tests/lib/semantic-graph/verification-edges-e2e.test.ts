/**
 * palantir-mini v3.7.0 — verification edges end-to-end sibling (A.5 split)
 * Coverage: semantic-query populates affectedEvals/Docs/Monitoring from neighborhood.
 */

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runSemanticQuery } from "../../../lib/semantic-graph/semantic-query";
import type { SemanticRid } from "../../../lib/semantic-graph/types";

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFileEnsuring(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

describe("semantic-query affected fields — populated from neighborhood (was hardcoded [])", () => {
  test("targetRids includes ontology RID referenced by eval rubric → affectedEvals non-empty", async () => {
    const dir = tmp("pm-vr1-e2e-evals-");
    writeFileEnsuring(
      path.join(dir, ".palantir-mini/harness/eval-rubric.md"),
      `## C1 — Student Coverage\n\nVerify ontology:data.Student carries derived properties.\n`,
    );

    const plan = await runSemanticQuery({
      projectRoot: dir,
      targetRids: ["eval:c1-student-coverage" as SemanticRid],
      writeManifest: false,
    });

    expect(plan.affectedEvals.length).toBeGreaterThanOrEqual(1);
    expect(plan.affectedEvals.map((r) => r as string)).toContain("eval:c1-student-coverage");
    expect(plan.affectedSemanticRids.map((r) => r as string)).toContain("ontology:data.Student");
  });

  test("targetRids includes a file referenced by doc → affectedDocs non-empty", async () => {
    const dir = tmp("pm-vr1-e2e-docs-");
    writeFileEnsuring(
      path.join(dir, "docs/ARCHITECTURE.md"),
      `# Architecture\n\nThe emit function lives in [emit-event](bridge/handlers/emit-event.ts).\n`,
    );

    const plan = await runSemanticQuery({
      projectRoot: dir,
      targetRids: ["file:bridge/handlers/emit-event.ts" as SemanticRid],
      writeManifest: false,
    });

    expect(plan.affectedDocs.length).toBeGreaterThanOrEqual(1);
    expect(plan.affectedDocs.map((r) => r as string).some((r) => r.startsWith("doc:"))).toBe(true);
  });

  test("monitoring RID output stays empty after monitors sunset", async () => {
    const dir = tmp("pm-vr1-e2e-mon-");
    writeFileEnsuring(path.join(dir, "ontology/data.ts"), "export const X = 1;\n");

    const plan = await runSemanticQuery({
      projectRoot: dir,
      targetRids: ["file:ontology/data.ts" as SemanticRid],
      writeManifest: false,
    });

    expect(plan.affectedMonitoring).toEqual([]);
  });

  test("empty targetRids → all affected* arrays empty (no accidental global walk)", async () => {
    const dir = tmp("pm-vr1-e2e-empty-target-");
    writeFileEnsuring(path.join(dir, "ontology/data.ts"), "export const X = 1;\n");
    writeFileEnsuring(
      path.join(dir, ".palantir-mini/harness/eval-rubric.md"),
      `## C1 — X\n\nSomething.\n`,
    );

    const plan = await runSemanticQuery({
      projectRoot: dir,
      targetRids: [],
      writeManifest: false,
    });

    expect(plan.affectedEvals.length).toBe(0);
    expect(plan.affectedDocs.length).toBe(0);
    expect(plan.affectedMonitoring.length).toBe(0);
    expect(plan.affectedSemanticRids.length).toBe(0);
  });
});
