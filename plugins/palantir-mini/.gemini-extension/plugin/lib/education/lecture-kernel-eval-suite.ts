// palantir-mini - Lecture Delivery Kernel v0 eval helpers.

export type LectureKernelEvalCategory =
  | "ingestion"
  | "sequence"
  | "sequencer_draft"
  | "presenter_readiness"
  | "governance";

export interface LectureKernelEvalObservation {
  readonly passed: boolean;
  readonly details: string;
  readonly evidence?: readonly string[];
  readonly metrics?: Record<string, string | number | boolean>;
}

export interface LectureKernelEvalCase {
  readonly id: string;
  readonly title: string;
  readonly category: LectureKernelEvalCategory;
  readonly run: () => Promise<LectureKernelEvalObservation> | LectureKernelEvalObservation;
}

export interface LectureKernelEvalCaseResult extends LectureKernelEvalObservation {
  readonly id: string;
  readonly title: string;
  readonly category: LectureKernelEvalCategory;
  readonly durationMs: number;
}

export interface LectureKernelEvalCategoryMetrics {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export interface LectureKernelEvalReport {
  readonly suiteId: string;
  readonly generatedAt: string;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly passRate: number;
  readonly byCategory: Record<LectureKernelEvalCategory, LectureKernelEvalCategoryMetrics>;
  readonly results: readonly LectureKernelEvalCaseResult[];
}

export interface RunLectureKernelEvalSuiteOptions {
  readonly suiteId?: string;
  readonly generatedAt?: string;
}

const CATEGORIES: readonly LectureKernelEvalCategory[] = [
  "ingestion",
  "sequence",
  "sequencer_draft",
  "presenter_readiness",
  "governance",
];

function emptyCategoryMetrics(): Record<
  LectureKernelEvalCategory,
  LectureKernelEvalCategoryMetrics
> {
  return {
    ingestion: { total: 0, passed: 0, failed: 0, passRate: 0 },
    sequence: { total: 0, passed: 0, failed: 0, passRate: 0 },
    sequencer_draft: { total: 0, passed: 0, failed: 0, passRate: 0 },
    presenter_readiness: { total: 0, passed: 0, failed: 0, passRate: 0 },
    governance: { total: 0, passed: 0, failed: 0, passRate: 0 },
  };
}

export async function runLectureKernelEvalSuite(
  cases: readonly LectureKernelEvalCase[],
  options: RunLectureKernelEvalSuiteOptions = {},
): Promise<LectureKernelEvalReport> {
  const results: LectureKernelEvalCaseResult[] = [];

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
    suiteId: options.suiteId ?? "suite:lecture-delivery-kernel-v0",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    total,
    passed,
    failed,
    passRate: total === 0 ? 0 : passed / total,
    byCategory,
    results,
  };
}

export function formatLectureKernelEvalReport(report: LectureKernelEvalReport): string {
  const categoryLines = CATEGORIES.map((category) => {
    const metrics = report.byCategory[category];
    return `| ${category} | ${metrics.passed}/${metrics.total} | ${metrics.failed} | ${metrics.passRate.toFixed(2)} |`;
  });
  const caseLines = report.results.map((result) => {
    const mark = result.passed ? "PASS" : "FAIL";
    return `| ${result.id} | ${result.category} | ${mark} | ${result.details.replace(/\|/g, "\\|")} |`;
  });

  return [
    "# Lecture Delivery Kernel Eval Report",
    "",
    `Suite: ${report.suiteId}`,
    `Generated: ${report.generatedAt}`,
    `Aggregate: ${report.passed}/${report.total} passed (${report.passRate.toFixed(2)})`,
    "",
    "## Category Metrics",
    "",
    "| Category | Passed | Failed | Pass Rate |",
    "|---|---:|---:|---:|",
    ...categoryLines,
    "",
    "## Case Results",
    "",
    "| Case | Category | Verdict | Details |",
    "|---|---|---|---|",
    ...caseLines,
  ].join("\n");
}
