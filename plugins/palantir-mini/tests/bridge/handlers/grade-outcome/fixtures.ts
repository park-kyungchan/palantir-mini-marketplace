// palantir-mini v3.3.0 — grade-outcome shared test fixtures (B.2 split)
// Extracted from grade-outcome-with-rubric.test.ts. Keeps individual test files
// under the 200-LOC budget by removing per-test boilerplate.

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDirs: string[] = [];

export function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grade-rubric-test-"));
  tmpDirs.push(dir);
  return dir;
}

export function cleanupTmpDirs(): void {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function writeArtifact(dir: string, content: string = "hello world"): string {
  const filePath = path.join(dir, "artifact.txt");
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

// Override events file so test runs don't pollute real project events.jsonl.
// Idempotent — safe to call from each test file's top-level.
export function setIsolatedEventsFile(label: string): void {
  process.env["PALANTIR_MINI_EVENTS_FILE"] = path.join(os.tmpdir(), `test-events-${label}.jsonl`);
}

interface RuleCriterion {
  criterionId: string;
  title: string;
  rubricDomain: "rule";
  passFailLogic: { threshold: number; scale: "0-1" };
  weightInRubric: number;
  validationExpression: string;
}

interface HybridCriterion {
  criterionId: string;
  title: string;
  rubricDomain: "hybrid";
  passFailLogic: { threshold: number; scale: "0-1" | "0-10"; combinator: "min" | "avg" | "weighted" | "all-pass" };
  weightInRubric: number;
  subCriteriaRids?: string[];
  subCriteria?: string[];
}

/** Build a rule-domain criterion in one line. */
export function makeRule(
  id: string,
  weight: number,
  expr: string,
  threshold = 0.5,
): RuleCriterion {
  return {
    criterionId: id,
    title: id,
    rubricDomain: "rule",
    passFailLogic: { threshold, scale: "0-1" },
    weightInRubric: weight,
    validationExpression: expr,
  };
}

/** Build a hybrid-domain criterion with the given combinator + sub RIDs. */
export function makeHybrid(
  id: string,
  combinator: "min" | "avg" | "weighted" | "all-pass",
  subs: string[],
  weight = 0.2,
  threshold = 0.5,
  scale: "0-1" | "0-10" = "0-1",
): HybridCriterion {
  return {
    criterionId: id,
    title: id,
    rubricDomain: "hybrid",
    passFailLogic: { threshold, scale, combinator },
    weightInRubric: weight,
    subCriteriaRids: subs,
  };
}
