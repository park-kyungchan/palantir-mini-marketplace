/**
 * Legacy baseline wrapper for `bun test` inside the protected
 * `plugins/palantir-mini/` tree.
 *
 * With the successor tree (`plugins/palantir-ontology/**`) present on this
 * branch, two legacy testcases are premise-dead by construction (they
 * assert the pre-successor single-plugin topology the campaign Goal of
 * record intentionally supersedes — see
 * decisions/pm1-ci-gate-adjudication.md):
 *
 *   - "semantic root fork detector > accepts the current marketplace root layout"
 *   - "semantic root fork detector > detector script passes the checked-in marketplace"
 *
 * This wrapper runs the FULL, unmodified legacy suite and exits 0 IFF:
 *   (a) every failing testcase is one of the two pinned names above, and
 *   (b) at least one test passed (guards against a total suite wipeout
 *       silently satisfying the subset check).
 *
 * Any other failing testcase is fatal (exit 1, full failure list printed).
 * Legacy source files under plugins/palantir-mini/ are never modified by
 * this script.
 *
 * Strategy: prefer bun's machine-readable `--reporter=junit` output (a temp
 * file, parsed for exact testcase pass/fail/skip status). If the installed
 * bun does not produce a usable junit file, fall back to parsing the plain
 * console `(fail) <full name> [<elapsed>]` lines and the ` N pass` / ` N
 * fail` summary — both strategies are exercised against the real legacy
 * suite output (see outputs/p350-ci-enablement.md, gate E).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..");
const LEGACY_DIR = join(REPOSITORY_ROOT, "plugins", "palantir-mini");

const EXPECTED_DIVERGENT_FAILURES = new Set<string>([
  "semantic root fork detector > accepts the current marketplace root layout",
  "semantic root fork detector > detector script passes the checked-in marketplace",
]);

type TestStatus = "pass" | "fail" | "skip";

interface TestCaseResult {
  readonly fullName: string;
  readonly status: TestStatus;
}

interface BaselineResult {
  readonly strategy: "junit" | "console-fallback";
  readonly failingFullNames: string[];
  readonly totalPass: number | null;
  readonly totalTests: number | null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttrs(tagOpening: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([\w:-]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(tagOpening)) !== null) {
    const key = m[1];
    const value = m[2];
    if (key === undefined || value === undefined) continue;
    attrs[key] = decodeXmlEntities(value);
  }
  return attrs;
}

/** Parses bun's `--reporter=junit` XML output into per-testcase results. */
function parseJUnit(xml: string): TestCaseResult[] {
  const results: TestCaseResult[] = [];
  const testcaseRe = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m: RegExpExecArray | null;
  while ((m = testcaseRe.exec(xml)) !== null) {
    const attrs = parseAttrs(m[1] ?? "");
    const body = m[3] ?? "";
    const name = attrs.name ?? "(unnamed)";
    const classname = attrs.classname ?? "";
    const fullName = classname ? `${classname} > ${name}` : name;
    let status: TestStatus = "pass";
    if (/<failure\b/.test(body) || /<error\b/.test(body)) status = "fail";
    else if (/<skipped\b/.test(body)) status = "skip";
    results.push({ fullName, status });
  }
  return results;
}

/** Fallback: parse bun's plain console output when junit isn't usable. */
function parseConsoleFailures(output: string): string[] {
  const failRe = /^\(fail\) (.+?) \[[0-9.]+m?s\]\s*$/gm;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = failRe.exec(output)) !== null) {
    const name = m[1];
    if (name !== undefined) names.push(name.trim());
  }
  return names;
}

function parseConsoleSummaryCount(output: string, label: "pass" | "fail"): number | null {
  const m = new RegExp(`^\\s*(\\d+)\\s+${label}\\s*$`, "m").exec(output);
  return m ? Number(m[1]) : null;
}

function runLegacySuite(): BaselineResult {
  const tmpDir = mkdtempSync(join(tmpdir(), "pm-legacy-baseline-"));
  const junitPath = join(tmpDir, "junit.xml");
  try {
    const junitRun = spawnSync(
      "bun",
      ["test", "--reporter=junit", `--reporter-outfile=${junitPath}`],
      { cwd: LEGACY_DIR, encoding: "utf8" },
    );
    const combined = `${junitRun.stdout ?? ""}\n${junitRun.stderr ?? ""}`;

    if (existsSync(junitPath)) {
      const xml = readFileSync(junitPath, "utf8");
      if (xml.includes("<testsuites")) {
        const cases = parseJUnit(xml);
        if (cases.length > 0) {
          return {
            strategy: "junit",
            failingFullNames: cases.filter((c) => c.status === "fail").map((c) => c.fullName),
            totalPass: cases.filter((c) => c.status === "pass").length,
            totalTests: cases.length,
          };
        }
      }
    }

    // junit reporter unavailable/unusable on this bun install: fall back to
    // the plain console run already captured above (junitRun still executed
    // `bun test`, just without a consumable --reporter=junit file — rerun
    // plain to get the unadorned console format defensively).
    const plainRun = spawnSync("bun", ["test"], { cwd: LEGACY_DIR, encoding: "utf8" });
    const plainCombined = `${plainRun.stdout ?? ""}\n${plainRun.stderr ?? ""}`;
    return {
      strategy: "console-fallback",
      failingFullNames: parseConsoleFailures(plainCombined),
      totalPass: parseConsoleSummaryCount(plainCombined, "pass"),
      totalTests: null,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function main(): void {
  const result = runLegacySuite();
  const expectedObserved = result.failingFullNames.filter((n) => EXPECTED_DIVERGENT_FAILURES.has(n));
  const unexpected = result.failingFullNames.filter((n) => !EXPECTED_DIVERGENT_FAILURES.has(n));
  const hasPassed = (result.totalPass ?? 0) > 0;

  console.log(`[legacy-baseline] strategy: ${result.strategy}`);
  console.log(`[legacy-baseline] total pass: ${result.totalPass ?? "unknown"}`);
  console.log(
    `[legacy-baseline] expected-divergent failures observed: ${expectedObserved.length}/${EXPECTED_DIVERGENT_FAILURES.size}`,
  );
  for (const name of expectedObserved) console.log(`[legacy-baseline]   (expected) ${name}`);

  if (unexpected.length > 0 || !hasPassed) {
    console.error(`[legacy-baseline] unexpected failing testcases: ${unexpected.length}`);
    for (const name of unexpected) console.error(`[legacy-baseline]   (unexpected) ${name}`);
    if (!hasPassed) {
      console.error(
        "[legacy-baseline] no passing tests observed — treating as a suite-level failure, not a clean subset match.",
      );
    }
    console.error("[legacy-baseline] verdict: FAIL");
    process.exit(1);
  }

  console.log("[legacy-baseline] verdict: OK (failures are exactly the pinned premise-dead subset)");
}

main();
