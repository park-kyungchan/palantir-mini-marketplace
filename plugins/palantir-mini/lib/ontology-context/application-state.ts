// palantir-mini v6.15.0 — lib/ontology-context/application-state.ts
//
// Sprint-094 PR 3.2 (canonical AIP-aligned plan v2 §4 row 3.2; Phase 3 PR 2/7).
// Per proposal §8 Stage 2: ApplicationState =
//   project + repo state + branch + active worktree + prompt identity +
//   scope paths + user non-goals + runtime capability surface +
//   visible MCP tools + active rules + active hooks + current dirty state +
//   active other-session work signals
//
// Pure composition function. Each helper is independently degrade-able via
// try/catch — a single sub-field failure NEVER poisons the whole projection.
// Sub-fields not derivable from the project root carry `available: false`
// plus an `error` string for caller introspection.
//
// Predecessor: plugin v6.14.0 (sprint-093 PR 3.1) — ApplicationStateProjection
// was declared as a typed placeholder `{ status: "pending-pr-3.2", notes:[] }`.
// This module replaces that placeholder with a real composition while keeping
// the public projection name.
//
// @owner palantirkc-ontology
// @since palantir-mini v6.15.0 (sprint-094 PR 3.2; Phase 3 PR 2/7)

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { loadCapabilityRegistry } from "../capability-registry";
import { resolvePalantirMiniRoot } from "../config/root";
import { resolveExternalRoots } from "../runtime/external-roots";
import { OVERLAY_RULES_DIR } from "../runtime-overlay/resolve-rule";
import {
  composeCodexMountedHookEvents,
  composeCompatibilityHookEventsAlias,
  composeSharedHookIntentEvents,
  type HookEventsCompatibilitySubField,
  type HookEventsSubField,
} from "./hook-events";
import {
  composeSubrepoReadOnlyApplicationState,
  type SubrepoReadOnlyApplicationState,
} from "./subrepo-read-only-index";

// ─── Public types ───────────────────────────────────────────────────────────

export interface RepoStateSubField {
  readonly available: boolean;
  readonly modifiedCount?: number;
  readonly stagedCount?: number;
  readonly untrackedCount?: number;
  readonly error?: string;
}

export interface BranchSubField {
  readonly available: boolean;
  readonly name?: string;
  readonly error?: string;
}

export interface WorktreeEntry {
  readonly path: string;
  readonly branch?: string;
  readonly head?: string;
}

export interface ActiveWorktreeSubField {
  readonly available: boolean;
  readonly worktrees?: ReadonlyArray<WorktreeEntry>;
  readonly error?: string;
}

export interface PromptIdentitySubField {
  readonly promptId: string | null;
  readonly promptHash: string | null;
}

export interface RuntimeCapabilitySubField {
  readonly available: boolean;
  readonly totalCapabilities?: number;
  readonly perCategory?: Readonly<Record<string, number>>;
  readonly error?: string;
}

export interface VisibleMcpToolsSubField {
  readonly available: boolean;
  readonly count?: number;
  readonly names?: ReadonlyArray<string>;
  readonly error?: string;
}

export interface ActiveRulesSubField {
  readonly available: boolean;
  readonly count?: number;
  readonly ruleIds?: ReadonlyArray<number>;
  readonly error?: string;
}

export type ActiveHooksSubField = HookEventsCompatibilitySubField;

export interface DirtyStateSubField {
  readonly available: boolean;
  readonly dirtyFileCount?: number;
  readonly error?: string;
}

export interface OtherSessionSignalsSubField {
  readonly available: boolean;
  readonly signals?: ReadonlyArray<string>;
  readonly error?: string;
}

export interface ApplicationStateProjection {
  readonly status: "composed";
  readonly project: string;
  readonly repoState: RepoStateSubField;
  readonly branch: BranchSubField;
  readonly activeWorktree: ActiveWorktreeSubField;
  readonly promptIdentity: PromptIdentitySubField;
  readonly scopePaths: ReadonlyArray<string>;
  readonly userNonGoals: ReadonlyArray<string>;
  readonly runtimeCapabilitySurface: RuntimeCapabilitySubField;
  readonly visibleMcpTools: VisibleMcpToolsSubField;
  readonly activeRules: ActiveRulesSubField;
  readonly activeHooks: ActiveHooksSubField;
  readonly sharedHookIntentEvents: HookEventsSubField;
  readonly codexMountedHookEvents: HookEventsSubField;
  readonly currentDirtyState: DirtyStateSubField;
  readonly subrepoReadOnlyApplicationState: SubrepoReadOnlyApplicationState;
  readonly otherSessionWorkSignals: OtherSessionSignalsSubField;
  readonly composedAt: string;
}

export interface ComposeApplicationStateOpts {
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly scopePaths?: ReadonlyArray<string>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RULE_FILE_PATTERN = /^(\d{2})-.+\.md$/;
const RULES_DIR_DEFAULT = resolveExternalRoots().rulesDir;

// ─── Git helpers ────────────────────────────────────────────────────────────

function runGit(project: string, args: ReadonlyArray<string>): string {
  return execFileSync("git", ["-C", project, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
}

function composeRepoState(project: string): RepoStateSubField {
  try {
    const stdout = runGit(project, ["status", "--porcelain"]);
    const lines = stdout.split("\n").filter((l) => l.length > 0);
    let modified  = 0;
    let staged    = 0;
    let untracked = 0;
    for (const line of lines) {
      const xy = line.slice(0, 2);
      if (xy === "??") {
        untracked += 1;
        continue;
      }
      const x = xy[0];
      const y = xy[1];
      if (x !== undefined && x !== " " && x !== "?") staged   += 1;
      if (y !== undefined && y !== " " && y !== "?") modified += 1;
    }
    return {
      available: true,
      modifiedCount:  modified,
      stagedCount:    staged,
      untrackedCount: untracked,
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeBranch(project: string): BranchSubField {
  try {
    const stdout = runGit(project, ["branch", "--show-current"]);
    const name = stdout.trim();
    if (name.length === 0) {
      return { available: false, error: "detached HEAD or empty branch" };
    }
    return { available: true, name };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeActiveWorktree(project: string): ActiveWorktreeSubField {
  try {
    const stdout = runGit(project, ["worktree", "list", "--porcelain"]);
    const blocks = stdout.split("\n\n").filter((b) => b.trim().length > 0);
    const worktrees: WorktreeEntry[] = [];
    for (const block of blocks) {
      const lines = block.split("\n");
      const entry: { path?: string; branch?: string; head?: string } = {};
      for (const line of lines) {
        if (line.startsWith("worktree "))    entry.path   = line.slice("worktree ".length).trim();
        else if (line.startsWith("HEAD "))   entry.head   = line.slice("HEAD ".length).trim();
        else if (line.startsWith("branch ")) entry.branch = line.slice("branch ".length).trim();
      }
      if (entry.path) {
        const e: WorktreeEntry = {
          path: entry.path,
          ...(entry.branch !== undefined ? { branch: entry.branch } : {}),
          ...(entry.head   !== undefined ? { head:   entry.head   } : {}),
        };
        worktrees.push(e);
      }
    }
    return { available: true, worktrees };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

function composeDirtyState(project: string): DirtyStateSubField {
  try {
    const stdout = runGit(project, ["status", "--porcelain"]);
    const dirtyFileCount = stdout.split("\n").filter((l) => l.length > 0).length;
    return { available: true, dirtyFileCount };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

// ─── Non-goals helper (mirrors readNonGoals in PR 3.1 handler) ─────────────

function composeUserNonGoals(project: string): ReadonlyArray<string> {
  const scopePath = path.join(project, ".palantir-mini", "project-scope.json");
  if (!fs.existsSync(scopePath)) return [];
  try {
    const raw = fs.readFileSync(scopePath, "utf8");
    const parsed = JSON.parse(raw) as { nonGoals?: unknown };
    if (Array.isArray(parsed.nonGoals)) {
      return parsed.nonGoals.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // best-effort: malformed JSON yields empty
  }
  return [];
}

// ─── Capability registry composer ───────────────────────────────────────────

function composeRuntimeCapability(project: string): RuntimeCapabilitySubField {
  try {
    const { registry, stats } = loadCapabilityRegistry(project);
    const perCategory: Record<string, number> = {
      skills:               registry.skills.length,
      mcpTools:             registry.mcpTools.length,
      agents:               registry.agents.length,
      projectActions:       registry.projectActions.length,
      validationPacks:      registry.validationPacks.length,
      knownIssues:          registry.knownIssues.length,
      ontologyIndexEntries: registry.ontologyIndexEntries.length,
    };
    return {
      available: true,
      totalCapabilities: stats.totalContracts,
      perCategory,
    };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

// ─── MCP TOOLS composer (dynamic import to avoid circular deps) ────────────

async function composeVisibleMcpTools(): Promise<VisibleMcpToolsSubField> {
  try {
    const mod = (await import("../../bridge/mcp-server")) as {
      readonly TOOLS?: ReadonlyArray<{ readonly name: string }>;
    };
    if (!Array.isArray(mod.TOOLS)) {
      return { available: false, error: "TOOLS export missing or not an array" };
    }
    const names = mod.TOOLS.map((t) => t.name);
    return { available: true, count: names.length, names };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

// ─── Active rules composer ──────────────────────────────────────────────────

function composeActiveRules(): ActiveRulesSubField {
  try {
    // Rules are runtime-scoped: prefer the external ~/.claude/rules/ overlay
    // when present, falling back to the plugin-bundled runtime-overlay/rules/ copy only when
    // the external ~/.claude/rules/ overlay is absent (external-preferred =
    // author-machine behavior unchanged; portability fix only). Identical fix
    // applied to lib/ontology-context/retrieval-context.ts.
    const rulesDir = fs.existsSync(RULES_DIR_DEFAULT)
      ? RULES_DIR_DEFAULT
      : OVERLAY_RULES_DIR;
    const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
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

// ─── Other-session work signals (heuristic) ─────────────────────────────────

function composeOtherSessionSignals(project: string): OtherSessionSignalsSubField {
  try {
    const sessionDir = path.join(project, ".palantir-mini", "session");
    if (!fs.existsSync(sessionDir)) {
      return { available: true, signals: [] };
    }
    const entries = fs.readdirSync(sessionDir, { withFileTypes: true });
    const signals: string[] = [];
    for (const ent of entries) {
      if (ent.isDirectory()) signals.push(ent.name);
    }
    signals.sort();
    return { available: true, signals };
  } catch (err) {
    return { available: false, error: String(err) };
  }
}

// ─── Public composition function ────────────────────────────────────────────

export async function composeApplicationState(
  project: string,
  opts: ComposeApplicationStateOpts,
): Promise<ApplicationStateProjection> {
  const repoState                = composeRepoState(project);
  const branch                   = composeBranch(project);
  const activeWorktree           = composeActiveWorktree(project);
  const userNonGoals             = composeUserNonGoals(project);
  const runtimeCapabilitySurface = composeRuntimeCapability(project);
  const visibleMcpTools          = await composeVisibleMcpTools();
  const activeRules              = composeActiveRules();
  const sharedHookIntentEvents   = composeSharedHookIntentEvents();
  const activeHooks              = composeCompatibilityHookEventsAlias(
    sharedHookIntentEvents,
    "activeHooks",
  );
  const codexMountedHookEvents   = composeCodexMountedHookEvents();
  const currentDirtyState        = composeDirtyState(project);
  const subrepoReadOnlyApplicationState = composeSubrepoReadOnlyApplicationState(project);
  const otherSessionWorkSignals  = composeOtherSessionSignals(project);

  const promptIdentity: PromptIdentitySubField = {
    promptId:   opts.promptId   ?? null,
    promptHash: opts.promptHash ?? null,
  };

  return {
    status: "composed",
    project,
    repoState,
    branch,
    activeWorktree,
    promptIdentity,
    scopePaths: opts.scopePaths ?? [],
    userNonGoals,
    runtimeCapabilitySurface,
    visibleMcpTools,
    activeRules,
    activeHooks,
    sharedHookIntentEvents,
    codexMountedHookEvents,
    currentDirtyState,
    subrepoReadOnlyApplicationState,
    otherSessionWorkSignals,
    composedAt: new Date().toISOString(),
  };
}
