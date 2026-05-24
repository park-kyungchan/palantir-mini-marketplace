// palantir-mini — Prompt-to-DTC eval-like regression suite helpers.
//
// These helpers keep Prompt-to-DTC behavior measurable as a suite instead of
// scattering only isolated unit assertions across handlers and hooks.

export type PromptDtcEvalCategory =
  | "prompt_identity"
  | "semantic_contract"
  | "digital_twin_contract"
  | "routing"
  | "gate";

export interface PromptDtcEvalObservation {
  passed: boolean;
  details: string;
  evidence?: readonly string[];
  metrics?: Record<string, string | number | boolean>;
}

export interface PromptDtcEvalCase {
  id: string;
  title: string;
  category: PromptDtcEvalCategory;
  run: () => Promise<PromptDtcEvalObservation> | PromptDtcEvalObservation;
}

export interface PromptDtcEvalCaseResult extends PromptDtcEvalObservation {
  id: string;
  title: string;
  category: PromptDtcEvalCategory;
  durationMs: number;
}

export interface PromptDtcEvalCategoryMetrics {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export interface PromptDtcEvalReport {
  suiteId: string;
  generatedAt: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  byCategory: Record<PromptDtcEvalCategory, PromptDtcEvalCategoryMetrics>;
  results: PromptDtcEvalCaseResult[];
}

export interface RunPromptDtcEvalSuiteOptions {
  suiteId?: string;
  generatedAt?: string;
}

const CATEGORIES: readonly PromptDtcEvalCategory[] = [
  "prompt_identity",
  "semantic_contract",
  "digital_twin_contract",
  "routing",
  "gate",
];

function emptyCategoryMetrics(): Record<PromptDtcEvalCategory, PromptDtcEvalCategoryMetrics> {
  return {
    prompt_identity: { total: 0, passed: 0, failed: 0, passRate: 0 },
    semantic_contract: { total: 0, passed: 0, failed: 0, passRate: 0 },
    digital_twin_contract: { total: 0, passed: 0, failed: 0, passRate: 0 },
    routing: { total: 0, passed: 0, failed: 0, passRate: 0 },
    gate: { total: 0, passed: 0, failed: 0, passRate: 0 },
  };
}

export async function runPromptDtcEvalSuite(
  cases: readonly PromptDtcEvalCase[],
  options: RunPromptDtcEvalSuiteOptions = {},
): Promise<PromptDtcEvalReport> {
  const results: PromptDtcEvalCaseResult[] = [];

  for (const testCase of cases) {
    const started = Date.now();
    try {
      const observation = await testCase.run();
      results.push({
        id: testCase.id,
        title: testCase.title,
        category: testCase.category,
        durationMs: Date.now() - started,
        ...observation,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: testCase.id,
        title: testCase.title,
        category: testCase.category,
        durationMs: Date.now() - started,
        passed: false,
        details: `Eval case threw: ${message}`,
      });
    }
  }

  const byCategory = emptyCategoryMetrics();
  for (const result of results) {
    const bucket = byCategory[result.category];
    bucket.total += 1;
    if (result.passed) {
      bucket.passed += 1;
    } else {
      bucket.failed += 1;
    }
  }
  for (const category of CATEGORIES) {
    const bucket = byCategory[category];
    bucket.passRate = bucket.total === 0 ? 0 : bucket.passed / bucket.total;
  }

  const passed = results.filter((result) => result.passed).length;
  const total = results.length;
  const failed = total - passed;

  return {
    suiteId: options.suiteId ?? "suite:prompt-to-dtc-regression",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    total,
    passed,
    failed,
    passRate: total === 0 ? 0 : passed / total,
    byCategory,
    results,
  };
}

export function formatPromptDtcEvalReport(report: PromptDtcEvalReport): string {
  const categoryLines = CATEGORIES.map((category) => {
    const metrics = report.byCategory[category];
    return `| ${category} | ${metrics.passed}/${metrics.total} | ${metrics.failed} | ${metrics.passRate.toFixed(2)} |`;
  });
  const caseLines = report.results.map((result) => {
    const mark = result.passed ? "PASS" : "FAIL";
    return `| ${result.id} | ${result.category} | ${mark} | ${result.details.replace(/\|/g, "\\|")} |`;
  });

  return [
    `# Prompt-to-DTC Eval Report`,
    ``,
    `Suite: ${report.suiteId}`,
    `Generated: ${report.generatedAt}`,
    `Aggregate: ${report.passed}/${report.total} passed (${report.passRate.toFixed(2)})`,
    ``,
    `## Category Metrics`,
    ``,
    `| Category | Passed | Failed | Pass Rate |`,
    `|---|---:|---:|---:|`,
    ...categoryLines,
    ``,
    `## Case Results`,
    ``,
    `| Case | Category | Verdict | Details |`,
    `|---|---|---|---|`,
    ...caseLines,
  ].join("\n");
}
