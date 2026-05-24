// palantir-mini v4.15.0 — MCP tool handler: pm_lead_brief (1-call session-opener)
// Domain: LEARN (session-context substrate) + ACTION (emits skill_started)
//
// Subsumes: pm_preamble + session_resume + wake_session + query_session_duration
// Phase 4 W4.D will delete the superseded handlers and register this in mcp-server.ts.
//
// sprint-063 W3.B — Lead's first turn 5 calls → 2.
// Plan: ~/.claude/plans/gleaming-hopping-dijkstra.md §3 Phase 3 W3.B + §4 NEW #2
//
// Inputs: { project?: string (default cwd), skillName?: string, intent?: string }
//
// Returns:
//   session       — sessionId, branch, repoMode, sessionMinutes
//   recentSprints — last 5 sprint-NNN/contract.json (sprintNumber DESC)
//   valueGradeMetrics — count by grade in last 1000 events + T2plusRatio + T3count
//   recentT3Plus  — last 10 events with valueGrade in ["T3","T4"]
//   dispatchSuggestion — light heuristic when `intent` provided

import * as fs from "fs";
import * as path from "path";
import { getConfig } from "../../lib/config";
import type { EventEnvelope } from "../../lib/event-log/types";
import { emit, type LogEnvelope } from "../../scripts/log";
import { sessionMinutesFor } from "./pm-preamble/session";
import { currentBranch } from "./pm-preamble/vcs";
import {
  listPendingContextApprovals,
  type ContextApprovalSummary,
} from "../../lib/ontology-context/approval";
import { loadCapabilityRegistry } from "../../lib/capability-registry/index";
import type { CapabilityRegistryStats } from "../../lib/capability-registry/index";
import pmHealthAuditOntologyRuntime, {
  type OntologyRuntimeHealthResult,
} from "./pm-health-audit/ontology-runtime";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PmLeadBriefArgs {
  project?: string;
  skillName?: string;
  intent?: string;
}

export interface SprintBriefEntry {
  sprintNumber: number;
  theme: string;
  mode: string;
  boundAt: string;
}

export interface ValueGradeMetrics {
  T0: number;
  T1: number;
  T2: number;
  T3: number;
  T4: number;
  T2plusRatio: number;
  T3count: number;
}

export interface T3PlusEvent {
  eventId: string;
  type: string;
  when: string;
  valueGrade: string;
  reasoning?: string;
}

export { type ContextApprovalSummary };

export interface PmLeadBriefResult {
  session: {
    sessionId: string;
    branch: string;
    repoMode: string;
    sessionMinutes: number;
  };
  recentSprints: SprintBriefEntry[];
  valueGradeMetrics: ValueGradeMetrics;
  recentT3Plus: T3PlusEvent[];
  dispatchSuggestion?: "lead-direct" | "delegate";
  suggestionRationale?: string;
  /** Last 5 OntologyContextApproval records sorted by approvedAt desc. Empty when no approvals exist. */
  pendingContextApprovals: ContextApprovalSummary[];
  /**
   * Diagnostic stats from the unified CapabilityRegistry (PR-7).
   * Best-effort: undefined when registry load failed (e.g. no .palantir-mini/ dir).
   * Additive field — does not change pm_lead_brief routing behavior.
   */
  capabilityRegistryStats?: CapabilityRegistryStats;
  /**
   * Ontology-runtime health audit result (PR-8).
   * Best-effort: undefined when audit throws (e.g. no .palantir-mini/ dir).
   * Surfaces workflow-trace, approval-ref, schema-version, governance-ref, and
   * deprecation-map signals at session start so Lead sees them immediately.
   */
  ontologyRuntime?: OntologyRuntimeHealthResult | { mode: "ontology-runtime"; error: string };
  /**
   * Effective ModelTrustProfile for this session (PR-14).
   * Best-effort read from <project>/.palantir-mini/model-trust-profile.json.
   * Falls back to DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE when file is absent.
   * The 5 bypass flags are always false by invariant — governance is never waived.
   */
  modelTrustProfile?: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read last N lines of events.jsonl without loading the entire file. */
function readLastNEvents(eventsPath: string, n: number): Array<Record<string, unknown>> {
  if (!fs.existsSync(eventsPath)) return [];
  try {
    const content = fs.readFileSync(eventsPath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const slice = lines.slice(-n);
    const out: Array<Record<string, unknown>> = [];
    for (const l of slice) {
      try { out.push(JSON.parse(l) as Record<string, unknown>); } catch { /* skip */ }
    }
    return out;
  } catch {
    return [];
  }
}

/** Compute value-grade metrics from last 1000 events. */
function computeValueGradeMetrics(eventsPath: string): ValueGradeMetrics {
  const events = readLastNEvents(eventsPath, 1000);
  const counts: Record<string, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0 };
  for (const ev of events) {
    const g = ev["valueGrade"];
    if (typeof g === "string" && g in counts) {
      counts[g] = (counts[g] ?? 0) + 1;
    }
  }
  const total = events.length;
  const t2plus = (counts["T2"] ?? 0) + (counts["T3"] ?? 0) + (counts["T4"] ?? 0);
  const T2plusRatio = total > 0 ? Math.round((t2plus / total) * 1000) / 1000 : 0;
  return {
    T0: counts["T0"] ?? 0,
    T1: counts["T1"] ?? 0,
    T2: counts["T2"] ?? 0,
    T3: counts["T3"] ?? 0,
    T4: counts["T4"] ?? 0,
    T2plusRatio,
    T3count: counts["T3"] ?? 0,
  };
}

/** Extract last 10 T3/T4 events from events.jsonl (scan all events, return tail). */
function readRecentT3Plus(eventsPath: string): T3PlusEvent[] {
  if (!fs.existsSync(eventsPath)) return [];
  try {
    const content = fs.readFileSync(eventsPath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const t3plus: T3PlusEvent[] = [];
    for (const l of lines) {
      try {
        const ev = JSON.parse(l) as Record<string, unknown>;
        const grade = ev["valueGrade"];
        if (grade !== "T3" && grade !== "T4") continue;
        const withWhat = ev["withWhat"] as Record<string, unknown> | undefined;
        t3plus.push({
          eventId: typeof ev["eventId"] === "string" ? ev["eventId"] : "",
          type: typeof ev["type"] === "string" ? ev["type"] : "",
          when: typeof ev["when"] === "string" ? ev["when"] : "",
          valueGrade: grade,
          reasoning: typeof withWhat?.["reasoning"] === "string" ? withWhat["reasoning"] : undefined,
        });
      } catch { /* skip */ }
    }
    // Return last 10 in chronological order
    return t3plus.slice(-10);
  } catch {
    return [];
  }
}

/** Read last 5 sprint contracts from sprints/ dir, sorted by sprintNumber DESC. */
function readRecentSprints(projectRoot: string): SprintBriefEntry[] {
  const sprintsDir = path.join(projectRoot, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(sprintsDir);
  } catch {
    return [];
  }

  const results: SprintBriefEntry[] = [];
  for (const entry of entries) {
    const contractPath = path.join(sprintsDir, entry, "contract.json");
    if (!fs.existsSync(contractPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(contractPath, "utf8")) as Record<string, unknown>;
      const sprintNumber = typeof raw["sprintNumber"] === "number" ? raw["sprintNumber"] : 0;
      results.push({
        sprintNumber,
        theme: typeof raw["theme"] === "string" ? raw["theme"] : "",
        mode: typeof raw["mode"] === "string" ? raw["mode"] : "unknown",
        boundAt: typeof raw["boundAt"] === "string" ? raw["boundAt"] : "",
      });
    } catch { /* skip malformed */ }
  }

  // Sort by sprintNumber DESC, take top 5
  results.sort((a, b) => b.sprintNumber - a.sprintNumber);
  return results.slice(0, 5);
}

/** Light dispatch heuristic — full routing via pm_intent_router (W3.A). */
function computeDispatchSuggestion(intent: string): { suggestion: "lead-direct" | "delegate"; rationale: string } {
  const DELEGATE_KEYWORDS = ["implement", "refactor", "migrate", "add", "create", "build", "sprint", "harness"];
  const matchCount = DELEGATE_KEYWORDS.filter((kw) => intent.toLowerCase().includes(kw)).length;
  const longIntent = intent.length >= 200;
  const multiKeyword = matchCount >= 2;

  if (longIntent || multiKeyword) {
    return {
      suggestion: "delegate",
      rationale: longIntent
        ? `Intent is ${intent.length} chars (≥200 threshold) → likely multi-file/complex; delegate to subagent.`
        : `Intent matches ≥2 delegate keywords (${matchCount} matches: ${DELEGATE_KEYWORDS.filter(kw => intent.toLowerCase().includes(kw)).join(", ")}) → delegate.`,
    };
  }
  return {
    suggestion: "lead-direct",
    rationale: "Intent is short (<200 chars) with <2 delegate keywords — lead-direct sufficient. Use pm_intent_router for full routing.",
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function pmLeadBrief(rawArgs: unknown): Promise<PmLeadBriefResult> {
  const args = (rawArgs ?? {}) as PmLeadBriefArgs;

  const projectRoot =
    args.project ??
    process.env["PALANTIR_MINI_PROJECT"] ??
    process.cwd();

  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  const cfg = getConfig();

  // ── a) Session ctx ─────────────────────────────────────────────────────────
  const sessionMinutes = sessionMinutesFor(eventsPath);
  const branch = await currentBranch(projectRoot);
  const sessionId = `session-${Date.now().toString(36)}`;

  // ── b) Recent 5 sprints ────────────────────────────────────────────────────
  let recentSprints: SprintBriefEntry[] = [];
  try {
    recentSprints = readRecentSprints(projectRoot);
  } catch { /* best-effort */ }

  // ── c) Value-grade metrics (last 1000 events) ──────────────────────────────
  let valueGradeMetrics: ValueGradeMetrics = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0, T2plusRatio: 0, T3count: 0 };
  try {
    valueGradeMetrics = computeValueGradeMetrics(eventsPath);
  } catch { /* best-effort */ }

  // ── d) Recent T3+ lineage (last 10) ───────────────────────────────────────
  let recentT3Plus: T3PlusEvent[] = [];
  try {
    recentT3Plus = readRecentT3Plus(eventsPath);
  } catch { /* best-effort */ }

  // ── e) Dispatch suggestion ─────────────────────────────────────────────────
  let dispatchSuggestion: "lead-direct" | "delegate" | undefined;
  let suggestionRationale: string | undefined;
  if (args.intent && args.intent.length > 0) {
    const ds = computeDispatchSuggestion(args.intent);
    dispatchSuggestion = ds.suggestion;
    suggestionRationale = ds.rationale;
  }

  // ── f) Pending context approvals (last 5, sorted by approvedAt desc) ───────
  let pendingContextApprovals: ContextApprovalSummary[] = [];
  try {
    pendingContextApprovals = listPendingContextApprovals(projectRoot);
  } catch { /* best-effort */ }

  // ── g) Capability registry stats (additive diagnostic, PR-7) ─────────────
  let capabilityRegistryStats: CapabilityRegistryStats | undefined;
  try {
    const { stats } = loadCapabilityRegistry(projectRoot);
    capabilityRegistryStats = stats;
  } catch { /* best-effort — never blocks the brief */ }

  // ── h) Ontology-runtime health sweep (additive diagnostic, PR-8) ──────────
  let ontologyRuntime: OntologyRuntimeHealthResult | { mode: "ontology-runtime"; error: string } | undefined;
  try {
    ontologyRuntime = await pmHealthAuditOntologyRuntime({ project: projectRoot });
  } catch (err) {
    ontologyRuntime = { mode: "ontology-runtime" as const, error: String(err) };
  }

  // ── i) ModelTrustProfile (additive diagnostic, PR-14) ────────────────────
  let modelTrustProfile: unknown = undefined;
  try {
    const profilePath = path.join(projectRoot, ".palantir-mini", "model-trust-profile.json");
    if (fs.existsSync(profilePath)) {
      modelTrustProfile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
    }
  } catch { /* best-effort */ }

  // ── Emit skill_started (backward-compat with pm_preamble shape) ───────────
  const skillName = args.skillName ?? "pm_lead_brief";
  const logEnvelope: LogEnvelope = {
    type: "skill_started" as EventEnvelope["type"],
    payload: { skillName } as EventEnvelope["payload"],
    toolName: "pm_lead_brief",
    cwd: projectRoot,
    identity: "claude-code",
    hypothesis: "pm-lead-brief-unified-session-opener",
    reasoning: `skill=${skillName} branch=${branch} sessionMinutes=${sessionMinutes} T2plusRatio=${valueGradeMetrics.T2plusRatio} recentSprints=${recentSprints.length}`,
    memoryLayers: ["procedural", "semantic"],
  };
  try {
    await emit(logEnvelope);
  } catch {
    // Emission must never block the brief — degrade silently.
  }

  return {
    session: {
      sessionId,
      branch,
      repoMode: cfg.repoMode,
      sessionMinutes,
    },
    recentSprints,
    valueGradeMetrics,
    recentT3Plus,
    ...(dispatchSuggestion !== undefined ? { dispatchSuggestion, suggestionRationale } : {}),
    pendingContextApprovals,
    ...(capabilityRegistryStats !== undefined ? { capabilityRegistryStats } : {}),
    ...(ontologyRuntime !== undefined ? { ontologyRuntime } : {}),
    ...(modelTrustProfile !== undefined ? { modelTrustProfile } : {}),
  };
}

export default pmLeadBrief;
