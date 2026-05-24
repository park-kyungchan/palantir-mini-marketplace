/**
 * lib/ontology-graph/indexers/tests-evals.ts — Seventh-in-sequence concrete indexer
 * for the in-memory OntologyGraphStore (PR 2.11 sprint-088; FIRST PR of Sprint X3 /
 * opener of the final 5 Phase 2 PRs). Walks `*.test.ts` / `*.spec.ts` test files +
 * `AIPEvaluation*.json` declaration files.
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/aip-evaluation.ts (AIPEvaluationSuiteDeclaration)
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, NodeRid, EdgeRid,
 *                                    NodeTypeKind literals "Test" + "AIPEvaluationSuite",
 *                                    EdgeKindUnion literal "validates")
 *     → lib/ontology-graph/indexers/source-files.ts (recursive-walk + glob-resolve pattern;
 *                                                    read-only reference)
 *     → lib/ontology-graph/store.ts (OntologyGraphStore consumer — NOT called here)
 *     → this file (pure fragment producer; no live store mutation)
 *     → PR 2.14 (orchestration layer — reconciles `tests-evals-target:` synthetic
 *                NodeRids to SourceFile NodeRids emitted by PR 2.10)
 *
 * D/L/A domain: DATA — walks filesystem test + eval files under opts.testTargetGlob
 * / opts.evalTargetGlob and emits a flat { nodes, edges } fragment. No event
 * emission, no store mutation, no Convex.
 *
 * IMPLEMENTATION NOTE: Uses generic-only emission (Option A per sprint-088/spec.md §2
 * inheriting sprint-081/spec.md §2.2). Local payload interfaces TestPayload +
 * EvalSuitePayload + ValidatesEdgePayload mirror the PR 2.1 wrapper-primitive field
 * shape but do NOT import from @palantirKC/ontology-shared-core (snapshot at
 * runtime-overlay/ predates PR 2.1+2.2; importing fails with TS2307). When snapshot
 * is refreshed, local interfaces become drop-in compatible.
 *
 * NAMING NOTE: The canonical NodeTypeKind discriminator literal for eval suites is
 * `"AIPEvaluationSuite"` (lib/ontology-graph/types.ts line 137). The user-facing
 * label "EvalSuite" used in canonical plan §4 row 2.1 is informal — this indexer
 * uses the canonical literal verbatim so future TypedGraphNode union projection
 * binds without rename.
 *
 * Walk targets:
 *   - {projectRoot}/<opts.testTargetGlob || "tests/**\/*.test.ts"> (recursive readdir;
 *     matches both `.test.ts` and `.spec.ts` suffixes regardless of glob exact form;
 *     framework discriminator detected via regex on `import` lines)
 *   - {projectRoot}/<opts.evalTargetGlob || ".palantir-mini/aip-evals/**\/*.json">
 *     (recursive readdir; JSON.parse + presence-check for AIPEvaluationSuiteDeclaration
 *     shape; only well-formed suites emit nodes; invalid JSON or missing required
 *     fields skipped silently)
 *
 * Excluded:
 *   - GLOB:.codex-plugin (auto-regen mirror per rule 25 v1.1.0)
 *   - GLOB:node_modules, GLOB:.git, GLOB:worktrees, GLOB:runtime-overlay, GLOB:.archived,
 *     GLOB:cache, GLOB:marketplaces, GLOB:dist
 *   - GLOB:*.d.ts (declaration files)
 *   NOTE: *.test.ts / *.spec.ts are NOT excluded (they are the walk targets here —
 *   inverse of PR 2.10 source-files.ts which DOES exclude them).
 *
 * Node kinds emitted:
 *   - "Test"               (one per .test.ts / .spec.ts file;
 *                           payload.framework ∈ {"bun","vitest","playwright","unknown"};
 *                           payload.kind ∈ {"unit","integration","e2e"} via path heuristic)
 *   - "AIPEvaluationSuite" (one per JSON file that parses to a valid
 *                           AIPEvaluationSuiteDeclaration shape; payload.suite carries
 *                           the parsed declaration)
 *
 * Edge kinds emitted:
 *   - "validates"  (governance-edge cluster; one per Test node;
 *                   confidence 1.0 when path heuristic resolves to an in-tree file,
 *                   0.5 otherwise; payload.targetRelativePath carries strip-result)
 *
 * EvalSuite nodes do NOT emit edges in this PR — orchestration layer (PR 2.14) will
 * wire `evaluates` edges from AIPEvaluationSuite → target later.
 *
 * Perf cap (spec §3.3): opts.maxFiles defaults to 200, applied per category
 * (test files + eval files counted independently). Test fixtures stay small.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.9.0 (sprint-088 PR 2.11; Sprint X3 PR 1/5)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../types";

// ─── Local payload interfaces (Option A — no shared-core import) ──────────────

/**
 * Payload for a Test node. Mirrors PR 2.1 TestDeclaration field shape.
 */
interface TestPayload {
  readonly projectRoot: string;
  /** Absolute path to the .test.ts / .spec.ts file. */
  readonly filePath: string;
  /** ISO timestamp of last indexing (injectable for test determinism). */
  readonly lastIndexed: string;
  readonly byteSize: number;
  /**
   * Test framework auto-detected from import lines via regex:
   *   "bun"        — file contains `from "bun:test"` or `import "bun:test"`
   *   "vitest"     — file contains `from "vitest"` or `import "vitest"`
   *   "playwright" — file contains `from "@playwright/test"` OR file path
   *                  contains `/playwright/` segment
   *   "unknown"    — no matching pattern found
   */
  readonly framework: "bun" | "vitest" | "playwright" | "unknown";
  /**
   * Test kind heuristic from path (deterministic — no AST inspection):
   *   "integration" — path contains `/tests/integration/` segment
   *   "e2e"         — path contains `/tests/e2e/` OR `/playwright/` segment
   *                    OR framework === "playwright"
   *   "unit"        — everything else (default)
   */
  readonly kind: "unit" | "integration" | "e2e";
}

/**
 * Payload for an AIPEvaluationSuite node. Mirrors schemas v1.37.0
 * AIPEvaluationSuiteDeclaration interface (kept as plain readonly shape
 * to avoid the cross-module brand import).
 */
interface EvalSuitePayload {
  readonly projectRoot: string;
  /** Absolute path to the AIPEvaluation*.json file. */
  readonly filePath: string;
  readonly lastIndexed: string;
  readonly byteSize: number;
  /** Parsed AIPEvaluationSuiteDeclaration (raw — presence-check already passed). */
  readonly suite: {
    readonly suiteId: string;
    readonly name: string;
    readonly target: {
      readonly kind: string;
      readonly rid: string;
      readonly versionRef?: string;
    };
    readonly testCaseIds: ReadonlyArray<string>;
    readonly criteria: ReadonlyArray<string>;
    readonly evaluatorPolicy: {
      readonly allowedDomains: ReadonlyArray<string>;
      readonly requireHumanReviewForMutation?: boolean;
      readonly minimumPassingScore: number;
    };
    readonly baselineRunId?: string;
  };
}

/** Edge payload carrying confidence + target relative path. */
interface ValidatesEdgePayload {
  /** Best-effort path of the file under test (relative to projectRoot). */
  readonly targetRelativePath: string;
  /**
   * confidence:
   *   1.0 = heuristic resolved to an in-tree file (existsSync check)
   *   0.5 = heuristic did not resolve (synthetic toRid; reconciliation deferred)
   */
  readonly confidence: 1.0 | 0.5;
}

// ─── Brand helpers (local; mirrors PR 2.4-2.10 indexer pattern) ───────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

// ─── RID derivation ───────────────────────────────────────────────────────────

/**
 * Deterministic NodeRid for a Test from absolute file path.
 * sha256(absolutePath + "#Test") — consistent across runs.
 */
function ridFromTestPath(absolutePath: string): NodeRid {
  const hash = createHash("sha256").update(`${absolutePath}#Test`).digest("hex");
  return nodeRid(`test:${hash}`);
}

/**
 * Deterministic NodeRid for an AIPEvaluationSuite from absolute file path.
 * sha256(absolutePath + "#AIPEvaluationSuite") — consistent across runs.
 */
function ridFromEvalSuitePath(absolutePath: string): NodeRid {
  const hash = createHash("sha256")
    .update(`${absolutePath}#AIPEvaluationSuite`)
    .digest("hex");
  return nodeRid(`aip-evaluation-suite:${hash}`);
}

/**
 * Deterministic EdgeRid for a validates edge.
 */
function edgeRidFromValidates(from: NodeRid, to: NodeRid): EdgeRid {
  const hash = createHash("sha256")
    .update(`${from}:validates:${to}`)
    .digest("hex");
  return edgeRid(`tests-evals-edge:${hash}`);
}

// ─── Glob helpers (mirrors PR 2.4-2.10 indexer pattern) ───────────────────────

/**
 * Returns true if any exclude glob pattern matches the given absolute path.
 */
function matchesAnyGlob(absolutePath: string, globs: ReadonlyArray<string>): boolean {
  for (const glob of globs) {
    if (globMatches(glob, absolutePath)) return true;
  }
  return false;
}

/**
 * Lightweight glob → regex conversion.
 * Supports `*` (any segment char, not `/`) and `**` (any chars including `/`).
 */
function globMatches(glob: string, target: string): boolean {
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__\//g, "(?:.+/)?")
    .replace(/__DOUBLE_STAR__/g, ".*");
  const regex = new RegExp(`(^|/)${regexStr}(/|$)`, "i");
  return regex.test(target);
}

// ─── targetGlob → base directory resolution ───────────────────────────────────

/**
 * Resolves a targetGlob (e.g. "tests/**\/*.test.ts") to an absolute base directory
 * under projectRoot. Strips common trailing glob patterns; falls back to literal
 * subdirectory. The recursive walker collects files matching the relevant
 * suffix (.test.ts / .spec.ts / .json) under the resolved base.
 */
function resolveBaseFromTargetGlob(projectRoot: string, targetGlob: string): string {
  let stripped = targetGlob;
  const trailingPatterns = [
    "/**/*.test.ts",
    "/**/*.spec.ts",
    "/**/*.json",
    "/**/*.ts",
    "/**/*.tsx",
    "/**/*",
    "/**",
    "/*",
  ];
  for (const tp of trailingPatterns) {
    if (stripped.endsWith(tp)) {
      stripped = stripped.slice(0, -tp.length);
      break;
    }
  }
  if (stripped === "" || stripped === ".") {
    return projectRoot;
  }
  if (path.isAbsolute(stripped)) {
    return stripped;
  }
  return path.join(projectRoot, stripped);
}

// ─── File collection helpers ──────────────────────────────────────────────────

/**
 * Recursively collects all test file paths (.test.ts + .spec.ts) under baseDir,
 * honoring excludeGlobs. Returns empty array when baseDir does not exist.
 */
async function collectTestFiles(
  baseDir: string,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(baseDir, excludeGlobs)) return [];

  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (matchesAnyGlob(dir, excludeGlobs)) return;

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const candidate = path.join(dir, entry.name);
      if (matchesAnyGlob(candidate, excludeGlobs)) continue;

      if (entry.isDirectory()) {
        await walk(candidate);
        continue;
      }

      if (!entry.isFile()) continue;
      if (entry.name.endsWith(".d.ts")) continue;
      if (!entry.name.endsWith(".test.ts") && !entry.name.endsWith(".spec.ts")) {
        continue;
      }

      results.push(candidate);
    }
  }

  await walk(baseDir);
  return results;
}

/**
 * Recursively collects all .json file paths under baseDir, honoring excludeGlobs.
 * Returns empty array when baseDir does not exist.
 */
async function collectEvalFiles(
  baseDir: string,
  excludeGlobs: ReadonlyArray<string>,
): Promise<string[]> {
  if (matchesAnyGlob(baseDir, excludeGlobs)) return [];

  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (matchesAnyGlob(dir, excludeGlobs)) return;

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const candidate = path.join(dir, entry.name);
      if (matchesAnyGlob(candidate, excludeGlobs)) continue;

      if (entry.isDirectory()) {
        await walk(candidate);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".json")) continue;

      results.push(candidate);
    }
  }

  await walk(baseDir);
  return results;
}

// ─── Framework + kind heuristic (regex-only; no AST) ──────────────────────────

/**
 * Detects the test framework from raw file content via simple regex matching
 * on import / require lines. Returns "unknown" when no pattern matches.
 *
 * Detection order matters: playwright > bun > vitest. A file that imports
 * from both `@playwright/test` and `vitest` is treated as playwright (the
 * more specific framework typically owns the test runtime).
 */
function detectFramework(
  content: string,
  absolutePath: string,
): "bun" | "vitest" | "playwright" | "unknown" {
  // Path-based playwright signal (e.g. `playwright/specs/foo.spec.ts`)
  if (absolutePath.includes(`${path.sep}playwright${path.sep}`)) {
    return "playwright";
  }
  // Import-based playwright signal
  if (/from\s+["']@playwright\/test["']/.test(content)) {
    return "playwright";
  }
  // Bun signal — most common in this codebase
  if (/from\s+["']bun:test["']|import\s+["']bun:test["']/.test(content)) {
    return "bun";
  }
  // Vitest signal
  if (/from\s+["']vitest["']|import\s+["']vitest["']/.test(content)) {
    return "vitest";
  }
  return "unknown";
}

/**
 * Classifies the test kind from absolute file path + framework.
 *   "integration" — path contains `/tests/integration/`
 *   "e2e"         — path contains `/tests/e2e/` or `/playwright/`, OR framework=playwright
 *   "unit"        — default
 */
function classifyTestKind(
  absolutePath: string,
  framework: "bun" | "vitest" | "playwright" | "unknown",
): "unit" | "integration" | "e2e" {
  const normalized = absolutePath.split(path.sep).join("/");
  if (normalized.includes("/tests/e2e/") || normalized.includes("/playwright/")) {
    return "e2e";
  }
  if (framework === "playwright") {
    return "e2e";
  }
  if (normalized.includes("/tests/integration/")) {
    return "integration";
  }
  return "unit";
}

// ─── Validates-edge target heuristic ──────────────────────────────────────────

/**
 * Heuristically resolve the file under test for a test file.
 *
 * For a test file at `<projectRoot>/tests/<rest>/<name>.test.ts`:
 *   1. Strip leading `tests/` segment.
 *   2. Replace `.test.ts` / `.spec.ts` suffix with `.ts`.
 *   3. Resolve absolute path under projectRoot.
 *   4. If existsSync → confidence 1.0; else confidence 0.5.
 *
 * For test files outside the canonical `tests/` root (e.g. co-located
 * `src/foo.test.ts`), return the file's own relative path stripped of the
 * test suffix with confidence 0.5.
 */
function resolveValidatesTarget(
  projectRoot: string,
  testFileAbsolutePath: string,
): { readonly targetRelativePath: string; readonly confidence: 1.0 | 0.5; readonly resolvedAbsolute: string } {
  const relativeFromProject = path
    .relative(projectRoot, testFileAbsolutePath)
    .split(path.sep)
    .join("/");

  // Strip test/spec suffix on the basename
  const stripSuffix = (p: string): string => {
    if (p.endsWith(".test.ts")) return p.slice(0, -".test.ts".length) + ".ts";
    if (p.endsWith(".spec.ts")) return p.slice(0, -".spec.ts".length) + ".ts";
    return p;
  };

  // Canonical `tests/` root pattern
  if (relativeFromProject.startsWith("tests/")) {
    const stripped = stripSuffix(relativeFromProject.slice("tests/".length));
    const resolvedAbsolute = path.join(projectRoot, stripped);
    const confidence: 1.0 | 0.5 = fs.existsSync(resolvedAbsolute) ? 1.0 : 0.5;
    return { targetRelativePath: stripped, confidence, resolvedAbsolute };
  }

  // Co-located test (e.g. src/foo.test.ts) — self-reference path stripped of suffix
  const stripped = stripSuffix(relativeFromProject);
  const resolvedAbsolute = path.join(projectRoot, stripped);
  // Co-located test typically resolves (e.g. src/foo.ts exists alongside src/foo.test.ts)
  const confidence: 1.0 | 0.5 = fs.existsSync(resolvedAbsolute) ? 1.0 : 0.5;
  return { targetRelativePath: stripped, confidence, resolvedAbsolute };
}

// ─── AIPEvaluationSuite presence-check + parser ───────────────────────────────

/**
 * Returns true when the parsed object has the minimum required field shape of an
 * AIPEvaluationSuiteDeclaration per schemas/ontology/primitives/aip-evaluation.ts.
 *
 * Required: suiteId (string), name (string), target (object with kind+rid),
 * testCaseIds (array), criteria (array), evaluatorPolicy (object with
 * allowedDomains array + minimumPassingScore number).
 */
function looksLikeEvalSuite(parsed: unknown): parsed is {
  readonly suiteId: string;
  readonly name: string;
  readonly target: { readonly kind: string; readonly rid: string; readonly versionRef?: string };
  readonly testCaseIds: ReadonlyArray<string>;
  readonly criteria: ReadonlyArray<string>;
  readonly evaluatorPolicy: {
    readonly allowedDomains: ReadonlyArray<string>;
    readonly requireHumanReviewForMutation?: boolean;
    readonly minimumPassingScore: number;
  };
  readonly baselineRunId?: string;
} {
  if (typeof parsed !== "object" || parsed === null) return false;
  const o = parsed as Record<string, unknown>;
  if (typeof o.suiteId !== "string") return false;
  if (typeof o.name !== "string") return false;
  if (typeof o.target !== "object" || o.target === null) return false;
  const t = o.target as Record<string, unknown>;
  if (typeof t.kind !== "string" || typeof t.rid !== "string") return false;
  if (!Array.isArray(o.testCaseIds)) return false;
  if (!Array.isArray(o.criteria)) return false;
  if (typeof o.evaluatorPolicy !== "object" || o.evaluatorPolicy === null) return false;
  const ep = o.evaluatorPolicy as Record<string, unknown>;
  if (!Array.isArray(ep.allowedDomains)) return false;
  if (typeof ep.minimumPassingScore !== "number") return false;
  return true;
}

// ─── Main indexer function ────────────────────────────────────────────────────

/**
 * Walk test files (.test.ts + .spec.ts) and AIPEvaluation*.json files in scope and
 * produce a flat { nodes, edges } fragment consumable by OntologyGraphStore.
 *
 * Does NOT call store.addNode / store.addEdge — fragment emission only.
 * Cross-indexer endpoint reconciliation (e.g. wiring a `validates` edge's `toRid`
 * from `tests-evals-target:` synthetic to a SourceFile NodeRid from PR 2.10's
 * source-files indexer) is the orchestration layer's job (PR 2.14).
 *
 * @param projectRoot — absolute path to the project root to walk.
 * @param opts.testTargetGlob — glob pattern relative to projectRoot (default "tests/**\/*.test.ts").
 * @param opts.evalTargetGlob — glob pattern relative to projectRoot (default ".palantir-mini/aip-evals/**\/*.json").
 * @param opts.excludeGlobs — paths matching these globs are skipped.
 * @param opts.maxFiles — perf cap on # parsed files per category (default 200).
 * @param opts.nowIso — injectable ISO timestamp for test determinism (defaults to current time).
 */
export async function indexTestsAndEvals(
  projectRoot: string,
  opts?: {
    readonly testTargetGlob?: string;
    readonly evalTargetGlob?: string;
    readonly excludeGlobs?: ReadonlyArray<string>;
    readonly maxFiles?: number;
    readonly nowIso?: string;
  },
): Promise<{
  readonly nodes: ReadonlyArray<NodeRecord<unknown>>;
  readonly edges: ReadonlyArray<EdgeRecord<unknown>>;
}> {
  const nowIso = opts?.nowIso ?? new Date().toISOString();
  const testTargetGlob = opts?.testTargetGlob ?? "tests/**/*.test.ts";
  const evalTargetGlob = opts?.evalTargetGlob ?? ".palantir-mini/aip-evals/**/*.json";
  const maxFiles = opts?.maxFiles ?? 200;
  const excludeGlobs = opts?.excludeGlobs ?? [
    "**/node_modules/**",
    "**/.git/**",
    "**/worktrees/**",
    "**/runtime-overlay/**",
    "**/.archived/**",
    "**/.codex-plugin/**",
    "**/cache/**",
    "**/marketplaces/**",
    "**/dist/**",
    "**/*.d.ts",
  ];

  // ── Discovery: resolve targetGlobs → base dirs, walk recursively ──────────
  const testBaseDir = resolveBaseFromTargetGlob(projectRoot, testTargetGlob);
  const evalBaseDir = resolveBaseFromTargetGlob(projectRoot, evalTargetGlob);

  const allTestFiles = await collectTestFiles(testBaseDir, excludeGlobs);
  const allEvalFiles = await collectEvalFiles(evalBaseDir, excludeGlobs);

  // ── Perf cap (per category): sort alphabetically for determinism + slice ──
  allTestFiles.sort();
  allEvalFiles.sort();
  const cappedTestFiles = allTestFiles.slice(0, maxFiles);
  const cappedEvalFiles = allEvalFiles.slice(0, maxFiles);

  const nodes: NodeRecord<unknown>[] = [];
  const edges: EdgeRecord<unknown>[] = [];

  // ── Emit Test nodes + validates edges ─────────────────────────────────────
  for (const absPath of cappedTestFiles) {
    if (matchesAnyGlob(absPath, excludeGlobs)) continue;

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absPath);
    } catch {
      continue;
    }

    let raw: string;
    try {
      raw = await fs.promises.readFile(absPath, "utf-8");
    } catch {
      continue;
    }

    const framework = detectFramework(raw, absPath);
    const kind = classifyTestKind(absPath, framework);

    const testRid = ridFromTestPath(absPath);
    const testPayload: TestPayload = {
      projectRoot,
      filePath: absPath,
      lastIndexed: nowIso,
      byteSize: stat.size,
      framework,
      kind,
    };
    const testNode: NodeRecord<TestPayload> = {
      rid: testRid,
      kind: "Test",
      value: testPayload,
    };
    nodes.push(testNode);

    // Emit validates edge
    const resolved = resolveValidatesTarget(projectRoot, absPath);
    const targetSyntheticRid = nodeRid(`tests-evals-target:${resolved.resolvedAbsolute}`);
    const validatesEdge: EdgeRecord<ValidatesEdgePayload> = {
      rid: edgeRidFromValidates(testRid, targetSyntheticRid),
      kind: "validates",
      fromRid: testRid,
      toRid: targetSyntheticRid,
      value: {
        targetRelativePath: resolved.targetRelativePath,
        confidence: resolved.confidence,
      },
    };
    edges.push(validatesEdge);
  }

  // ── Emit AIPEvaluationSuite nodes (no edges in this PR) ───────────────────
  for (const absPath of cappedEvalFiles) {
    if (matchesAnyGlob(absPath, excludeGlobs)) continue;

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absPath);
    } catch {
      continue;
    }

    let raw: string;
    try {
      raw = await fs.promises.readFile(absPath, "utf-8");
    } catch {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt JSON — skip silently
      continue;
    }

    if (!looksLikeEvalSuite(parsed)) {
      // Doesn't match AIPEvaluationSuiteDeclaration shape — skip silently
      continue;
    }

    const evalRid = ridFromEvalSuitePath(absPath);
    const evalPayload: EvalSuitePayload = {
      projectRoot,
      filePath: absPath,
      lastIndexed: nowIso,
      byteSize: stat.size,
      suite: {
        suiteId: parsed.suiteId,
        name: parsed.name,
        target: {
          kind: parsed.target.kind,
          rid: parsed.target.rid,
          ...(parsed.target.versionRef !== undefined
            ? { versionRef: parsed.target.versionRef }
            : {}),
        },
        testCaseIds: parsed.testCaseIds,
        criteria: parsed.criteria,
        evaluatorPolicy: {
          allowedDomains: parsed.evaluatorPolicy.allowedDomains,
          ...(parsed.evaluatorPolicy.requireHumanReviewForMutation !== undefined
            ? {
                requireHumanReviewForMutation:
                  parsed.evaluatorPolicy.requireHumanReviewForMutation,
              }
            : {}),
          minimumPassingScore: parsed.evaluatorPolicy.minimumPassingScore,
        },
        ...(parsed.baselineRunId !== undefined ? { baselineRunId: parsed.baselineRunId } : {}),
      },
    };
    const evalNode: NodeRecord<EvalSuitePayload> = {
      rid: evalRid,
      kind: "AIPEvaluationSuite",
      value: evalPayload,
    };
    nodes.push(evalNode);
  }

  return { nodes, edges };
}
