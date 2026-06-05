// palantir-mini v6.16.0 — lib/ontology-context/retrieval-context.ts
//
// Sprint-095 PR 3.3 (canonical AIP-aligned plan v2 §4 row 3.3; Phase 3 PR 3/7).
// Per proposal §8 Stage 3: RetrievalContext =
//   official research docs + project docs + schema primitives + plugin source files
//   + rules + hooks + skills + recent lineage + value-grade metrics
//   + impact graph neighborhood (REFERENCE) + eval coverage
//
// Pure composition function. Each helper is independently degrade-able via
// try/catch — a single sub-field failure NEVER poisons the whole projection.
// Sub-fields not derivable from the project root carry `available: false`
// plus an `error` string for caller introspection.
//
// Predecessor: plugin v6.15.0 (sprint-094 PR 3.2) — RetrievalContextProjection
// was declared as a typed placeholder `{ status: "pending-pr-3.3", retrievedDocs:[] }`.
// This module replaces that placeholder with a real composition while keeping
// the public projection name.
//
// Mirrors lib/ontology-context/application-state.ts (PR 3.2) structural pattern.
//
// @owner palantirkc-ontology
// @since palantir-mini v6.16.0 (sprint-095 PR 3.3; Phase 3 PR 3/7)

import * as fs from "node:fs";
import * as path from "node:path";

import pmValueGradeMetrics from "../../bridge/handlers/pm-value-grade-metrics";
import pmWorkflowLineageQuery from "../../bridge/handlers/pm-workflow-lineage-query";
import { resolvePalantirMiniRoot } from "../config/root";
import {
  composeCodexMountedHookEvents,
  composeCompatibilityHookEventsAlias,
  composeSharedHookIntentEvents,
  type HookEventsCompatibilitySubField,
  type HookEventsSubField,
} from "./hook-events";

// ─── Public types ───────────────────────────────────────────────────────────

export interface OfficialResearchDocsSubField {
  readonly available: boolean;
  readonly count?: number;
  readonly paths?: ReadonlyArray<string>;
  readonly error?: string;
}

export interface ProjectDocsSubField {
  readonly available: boolean;
  readonly browsePath?: string | null;
  readonly indexPath?: string | null;
  readonly claudeMdPath?: string | null;
  readonly error?: string;
}

export interface SchemaPrimitivesSubField {
  readonly available: boolean;
  readonly count?: number;
  readonly axisFilteredCount?: number;
  readonly names?: ReadonlyArray<string>;
  readonly error?: string;
}

export interface PluginSourceFilesSubField {
  readonly available: boolean;
  readonly count?: number;
  readonly scopedFiles?: ReadonlyArray<string>;
  readonly error?: string;
}

export interface RulesSubField {
  readonly available: boolean;
  readonly count?: number;
  readonly ruleIds?: ReadonlyArray<number>;
  readonly error?: string;
}

export type HooksSubField = HookEventsCompatibilitySubField;

export interface SkillsSubField {
  readonly available: boolean;
  readonly count?: number;
  readonly names?: ReadonlyArray<string>;
  readonly error?: string;
}

export interface RecentLineageSubField {
  readonly available: boolean;
  readonly t3PlusCount?: number;
  readonly windowDays?: number;
  readonly error?: string;
}

export interface ValueGradeMetricsSubField {
  readonly available: boolean;
  readonly totalEvents?: number;
  readonly t2PlusRatio?: number;
  readonly t3CircuitInputs?: number;
  readonly error?: string;
}

export interface ImpactGraphNeighborhoodSubField {
  readonly available: boolean;
  readonly referenceField: "impactContext";
  readonly axisRidCount?: number;
  readonly error?: string;
}

export interface EvalCoverageSubField {
  readonly available: boolean;
  readonly suiteCount?: number;
  readonly suitePaths?: ReadonlyArray<string>;
  readonly error?: string;
}

export interface RetrievalContextProjection {
  readonly status: "composed";
  readonly project: string;
  readonly officialResearchDocs: OfficialResearchDocsSubField;
  readonly projectDocs: ProjectDocsSubField;
  readonly schemaPrimitives: SchemaPrimitivesSubField;
  readonly pluginSourceFiles: PluginSourceFilesSubField;
  readonly rules: RulesSubField;
  readonly hooks: HooksSubField;
  readonly sharedHookIntentEvents: HookEventsSubField;
  readonly codexMountedHookEvents: HookEventsSubField;
  readonly skills: SkillsSubField;
  readonly recentLineage: RecentLineageSubField;
  readonly valueGradeMetrics: ValueGradeMetricsSubField;
  readonly impactGraphNeighborhood: ImpactGraphNeighborhoodSubField;
  readonly evalCoverage: EvalCoverageSubField;
  readonly composedAt: string;
}

export interface ComposeRetrievalContextOpts {
  readonly scopePaths?: ReadonlyArray<string>;
  readonly requestedAxes?: ReadonlyArray<string>;
  readonly axisRidCount?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HOME_DEFAULT = process.env["HOME"] ?? "/home/palantirkc";
const RULES_DIR_DEFAULT = path.join(HOME_DEFAULT, ".claude", "rules");
const RESEARCH_OFFICIAL_DIR = path.join(
  HOME_DEFAULT,
  ".claude",
  "research",
  "palantir-official",
);
const SCHEMAS_PRIMITIVES_DIR = path.join(
  HOME_DEFAULT,
  ".claude",
  "schemas",
  "ontology",
  "primitives",
);
const RULE_FILE_PATTERN = /^(\d{2})-.+\.md$/;
const LINEAGE_WINDOW_DAYS = 7;
const SCOPED_FILE_CAP = 200;
const RESEARCH_PATH_CAP = 200;
const PRIMITIVE_NAME_CAP = 200;
const SKILL_NAME_CAP = 200;
const EVAL_SUITE_CAP = 50;
const EVAL_SCAN_MAX_DEPTH = 3;

// ─── FS helpers ────────────────────────────────────────────────────────────

function listMarkdownRecursive(root: string, cap: number): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0 && out.length < cap) {
    const dir = stack.pop();
    if (dir === undefined) break;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile() && p.endsWith(".md")) {
        out.push(p);
        if (out.length >= cap) break;
      }
    }
  }
  return out;
}

function listTsRecursive(root: string, cap: number): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0 && out.length < cap) {
    const dir = stack.pop();
    if (dir === undefined) break;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile() && p.endsWith(".ts") && !p.endsWith(".d.ts")) {
        out.push(p);
        if (out.length >= cap) break;
      }
    }
  }
  return out;
}

function findEvalSuites(projectRoot: string): string[] {
  const out: string[] = [];
  const stack: Array<{ dir: string; depth: number }> = [
    { dir: projectRoot, depth: 0 },
  ];
  while (stack.length > 0 && out.length < EVAL_SUITE_CAP) {
    const frame = stack.pop();
    if (frame === undefined) break;
    const { dir, depth } = frame;
    if (depth > EVAL_SCAN_MAX_DEPTH) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name.startsWith(".git")) continue;
        if (ent.name === "evals" || ent.name === ".palantir-mini") {
          stack.push({ dir: p, depth: depth + 1 });
        } else if (depth < EVAL_SCAN_MAX_DEPTH) {
          stack.push({ dir: p, depth: depth + 1 });
        }
      } else if (
        ent.isFile() &&
        ent.name.endsWith(".json") &&
        /eval/i.test(p)
      ) {
        out.push(p);
        if (out.length >= EVAL_SUITE_CAP) break;
      }
    }
  }
  return out;
}

// ─── Composers ──────────────────────────────────────────────────────────────

function composeOfficialResearchDocs(
  scopePaths: ReadonlyArray<string> | undefined,
): OfficialResearchDocsSubField {
  try {
    const all = listMarkdownRecursive(RESEARCH_OFFICIAL_DIR, RESEARCH_PATH_CAP);
    const filtered =
      scopePaths && scopePaths.length > 0
        ? all.filter((p) =>
            scopePaths.some((sp) => p.includes(sp) || sp.includes(p)),
          )
        : all;
    return { available: true, count: filtered.length, paths: filtered };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeProjectDocs(project: string): ProjectDocsSubField {
  try {
    const browsePath = path.join(project, "BROWSE.md");
    const indexPath = path.join(project, "INDEX.md");
    const claudeMdPath = path.join(project, "CLAUDE.md");
    return {
      available: true,
      browsePath: fs.existsSync(browsePath) ? browsePath : null,
      indexPath: fs.existsSync(indexPath) ? indexPath : null,
      claudeMdPath: fs.existsSync(claudeMdPath) ? claudeMdPath : null,
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeSchemaPrimitives(
  requestedAxes: ReadonlyArray<string> | undefined,
): SchemaPrimitivesSubField {
  try {
    const all = listTsRecursive(SCHEMAS_PRIMITIVES_DIR, PRIMITIVE_NAME_CAP);
    const names = all.map((p) => path.basename(p, ".ts"));
    let axisFilteredCount = names.length;
    let filteredNames: ReadonlyArray<string> = names;
    if (requestedAxes && requestedAxes.length > 0) {
      const normalized = requestedAxes.map((a) =>
        a.replace(/^(rid:|axis:|file:)/, "").toLowerCase(),
      );
      filteredNames = names.filter((n) =>
        normalized.some((a) => n.toLowerCase().includes(a) || a.includes(n.toLowerCase())),
      );
      axisFilteredCount = filteredNames.length;
    }
    return {
      available: true,
      count: names.length,
      axisFilteredCount,
      names: filteredNames,
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composePluginSourceFiles(
  scopePaths: ReadonlyArray<string> | undefined,
): PluginSourceFilesSubField {
  try {
    const libRoot = path.join(resolvePalantirMiniRoot(), "lib");
    const all = listTsRecursive(libRoot, SCOPED_FILE_CAP);
    let scopedFiles: ReadonlyArray<string> = all;
    if (scopePaths && scopePaths.length > 0) {
      scopedFiles = all.filter((p) =>
        scopePaths.some((sp) => p.includes(sp) || sp.includes(p)),
      );
    }
    return { available: true, count: scopedFiles.length, scopedFiles };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeRules(): RulesSubField {
  try {
    const entries = fs.readdirSync(RULES_DIR_DEFAULT, { withFileTypes: true });
    const ruleIds: number[] = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const m = ent.name.match(RULE_FILE_PATTERN);
      if (!m || m[1] === undefined) continue;
      const id = Number.parseInt(m[1], 10);
      if (Number.isFinite(id)) ruleIds.push(id);
    }
    ruleIds.sort((a, b) => a - b);
    return { available: true, count: ruleIds.length, ruleIds };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeSkills(): SkillsSubField {
  try {
    const skillsDir = path.join(resolvePalantirMiniRoot(), "skills");
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const names: string[] = [];
    for (const ent of entries) {
      if (ent.isDirectory() && !ent.name.startsWith("_")) names.push(ent.name);
    }
    names.sort();
    return {
      available: true,
      count: names.length,
      names: names.slice(0, SKILL_NAME_CAP),
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

async function composeRecentLineage(
  project: string,
): Promise<RecentLineageSubField> {
  try {
    const lineage = await pmWorkflowLineageQuery({
      projects: [project],
      filter: { limit: 200 },
    });
    const now = Date.now();
    const windowMs = LINEAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    let t3Plus = 0;
    for (const ev of lineage.events) {
      const grade = (ev.payload as { valueGrade?: unknown }).valueGrade;
      if (grade !== "T3" && grade !== "T4") continue;
      if (typeof ev.when !== "string") continue;
      const t = Date.parse(ev.when);
      if (Number.isFinite(t) && now - t <= windowMs) t3Plus += 1;
    }
    return {
      available: true,
      t3PlusCount: t3Plus,
      windowDays: LINEAGE_WINDOW_DAYS,
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

async function composeValueGradeMetrics(
  project: string,
): Promise<ValueGradeMetricsSubField> {
  try {
    const metrics = await pmValueGradeMetrics({
      project,
      windowDays: LINEAGE_WINDOW_DAYS,
    });
    return {
      available: true,
      totalEvents: metrics.totalEvents,
      t2PlusRatio: metrics.t2PlusRatio,
      t3CircuitInputs: metrics.t3CircuitInputs,
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeImpactGraphNeighborhood(
  axisRidCount: number | undefined,
): ImpactGraphNeighborhoodSubField {
  // Thin REFERENCE — does NOT duplicate impactContext content; that lives
  // on the parent OntologyContextQueryResult under `impactContext`.
  return {
    available: true,
    referenceField: "impactContext",
    axisRidCount: axisRidCount ?? 0,
  };
}

function composeEvalCoverage(project: string): EvalCoverageSubField {
  try {
    if (!fs.existsSync(project)) {
      return { available: true, suiteCount: 0, suitePaths: [] };
    }
    const suites = findEvalSuites(project);
    return {
      available: true,
      suiteCount: suites.length,
      suitePaths: suites,
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

// ─── Public composition function ────────────────────────────────────────────

export async function composeRetrievalContext(
  project: string,
  opts: ComposeRetrievalContextOpts,
): Promise<RetrievalContextProjection> {
  const officialResearchDocs = composeOfficialResearchDocs(opts.scopePaths);
  const projectDocs = composeProjectDocs(project);
  const schemaPrimitives = composeSchemaPrimitives(opts.requestedAxes);
  const pluginSourceFiles = composePluginSourceFiles(opts.scopePaths);
  const rules = composeRules();
  const sharedHookIntentEvents = composeSharedHookIntentEvents();
  const hooks = composeCompatibilityHookEventsAlias(
    sharedHookIntentEvents,
    "hooks",
  );
  const codexMountedHookEvents = composeCodexMountedHookEvents();
  const skills = composeSkills();
  const recentLineage = await composeRecentLineage(project);
  const valueGradeMetrics = await composeValueGradeMetrics(project);
  const impactGraphNeighborhood = composeImpactGraphNeighborhood(
    opts.axisRidCount,
  );
  const evalCoverage = composeEvalCoverage(project);

  return {
    status: "composed",
    project,
    officialResearchDocs,
    projectDocs,
    schemaPrimitives,
    pluginSourceFiles,
    rules,
    hooks,
    sharedHookIntentEvents,
    codexMountedHookEvents,
    skills,
    recentLineage,
    valueGradeMetrics,
    impactGraphNeighborhood,
    evalCoverage,
    composedAt: new Date().toISOString(),
  };
}
