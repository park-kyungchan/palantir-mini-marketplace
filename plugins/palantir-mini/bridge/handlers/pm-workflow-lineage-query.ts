// palantir-mini v6.55.0 — pm_workflow_lineage_query MCP handler (W5.0b, P5)
//
// Per harness-base-mode blueprint §4-P5 + cold-start §3 W5.0b + plan §3 W5.0b.
// Cross-project Workflow Lineage query — joins events.jsonl across registered
// + auto-discovered palantir-mini projects via 5-dim filter, returns events
// + executionGraph (nodes + edges) + perProjectCounts + discovered list.
//
// Closes blueprint §9 G6 (cross-project lineage query returns multi-project
// results). Decouples per-project replay-lineage (single-project) from the
// cross-project view; replay-lineage handler stays unchanged.
//
// Read/write separation (Plan agent §5): query handler READS registry +
// fs walk; emits advisory events for unregistered projects but NEVER
// writes to registered-projects.json. Auto-registration is an explicit
// project_register call.
//
// Authority: ~/.claude/plans/glowing-frolicking-raven.md §3 W5.0b
//            ~/.claude/research/palantir-vision/aipcon-devcon/workflow-lineage.md L9-13

import * as path from "path";
import {
  discoverProjects,
  readMultiProjectEvents,
  type ProjectEntry,
  type AnnotatedEvent,
} from "../../lib/event-log/multi-project-reader";
import { readPromotedEvents } from "../../lib/event-log/promoted-index";
import { emit } from "../../scripts/log";
import { deriveProjectSlug } from "../../lib/project/slug";

export interface PmWorkflowLineageQueryArgs {
  /** Optional explicit project list (absolute paths). When omitted, uses discoverProjects(). */
  projects?: string[];
  /** Optional projectsRoot override for fs-walk discovery (default ~/projects). */
  projectsRoot?: string;
  /**
   * PR 4.7 — When true, skip the promoted-index path and scan all events
   * regardless of grade. Default false (promoted-index T3+ per project).
   */
  includeLegacyRaw?: boolean;
  /** 5-dim filter — same semantics as LineageFilter from lib/event-log/replay.ts. */
  filter?: {
    /** ATOP_WHICH glob substring of CommitSha */
    atopWhich?: string;
    /** Sequence range bounds (inclusive) */
    fromSequence?: number;
    toSequence?:   number;
    /** Event type filter — if set, only matching variants are returned */
    eventTypes?: string[];
    /** BY_WHOM filter */
    byWhom?: { identity?: string; agentName?: string; teamName?: string };
    /** THROUGH_WHICH filter */
    throughWhich?: { sessionId?: string; toolName?: string; cwd?: string };
    /** WITH_WHAT regex against reasoning text */
    withWhat?: string;
    /** Temporal window on `when` (ISO8601 inclusive) */
    whenRange?: { from?: string; to?: string };
    /**
     * v3.13.0+ — Project slug filter (crystalline-resilient-narwhal P-EXTRA,
     * 2026-05-01). Matches `payload.projectSlug` when present on an event,
     * else falls back to deriving slug from `__sourceProject` basename.
     * Use this to scope a cross-project query to a single project (e.g.
     * "all sprint events from palantir-math") without resorting to
     * `throughWhich.cwd` substring matching.
     */
    projectSlug?: string;
    /**
     * PR-10 — OntologyWorkflowTrace traceId filter.
     * When provided, only events whose payload.traceId === traceId are returned.
     * Enables per-trace lifecycle queries: workflow_trace_opened → transitioned → closed.
     * Additive: existing behavior unchanged when traceId absent.
     */
    traceId?: string;
    /** Result cap (default 1000) */
    limit?: number;
  };
}

export interface ExecutionGraphNode {
  id:       string;
  type:     string;
  project:  string;
  when:     string;
  byWhom:   string;
  sequence: number;
}

export interface ExecutionGraphEdge {
  from:     string;
  to:       string;
  relation: "follows" | "cited" | "impacted";
}

export interface PmWorkflowLineageQueryResult {
  events: AnnotatedEvent[];
  executionGraph: {
    nodes: ExecutionGraphNode[];
    edges: ExecutionGraphEdge[];
  };
  perProjectCounts: Record<string, number>;
  /** Project paths found via fs walk but NOT in registry (advisory). */
  discovered: string[];
  /** When result was truncated to filter.limit, true. */
  truncated: boolean;
  /** Total matching events BEFORE limit truncation. */
  totalMatched: number;
}

const DEFAULT_LIMIT = 1000;

/** Match an annotated event against the 5-dim filter. */
function matchesFilter(ev: AnnotatedEvent, f: PmWorkflowLineageQueryArgs["filter"]): boolean {
  if (!f) return true;
  if (f.fromSequence !== undefined && ev.sequence < f.fromSequence) return false;
  if (f.toSequence !== undefined && ev.sequence > f.toSequence) return false;

  if (f.eventTypes && f.eventTypes.length > 0 && !f.eventTypes.includes(ev.type)) return false;

  if (f.atopWhich && !(ev.atopWhich as string).includes(f.atopWhich)) return false;

  if (f.byWhom) {
    // Defense-in-depth: multi-project-reader chokepoint already filters
    // malformed events lacking byWhom, but archive-reader paths or future
    // legacy emitters could still slip through. Treat absent byWhom as
    // identity="unknown" so filter behaves predictably.
    const bw = ev.byWhom ?? { identity: "unknown" as const };
    if (f.byWhom.identity && bw.identity !== f.byWhom.identity) return false;
    if (f.byWhom.agentName && bw.agentName !== f.byWhom.agentName) return false;
    if (f.byWhom.teamName && bw.teamName !== f.byWhom.teamName) return false;
  }

  if (f.throughWhich) {
    if (f.throughWhich.sessionId && (ev.throughWhich.sessionId as string) !== f.throughWhich.sessionId) return false;
    if (f.throughWhich.toolName && ev.throughWhich.toolName !== f.throughWhich.toolName) return false;
    if (f.throughWhich.cwd && ev.throughWhich.cwd !== f.throughWhich.cwd) return false;
  }

  if (f.whenRange?.from && ev.when < f.whenRange.from) return false;
  if (f.whenRange?.to && ev.when > f.whenRange.to) return false;

  if (f.withWhat) {
    const reasoning = ev.withWhat?.reasoning ?? "";
    try {
      const re = new RegExp(f.withWhat, "i");
      if (!re.test(reasoning)) return false;
    } catch {
      // Invalid regex → no match
      return false;
    }
  }

  // v3.13.0+ crystalline-resilient-narwhal — projectSlug filter.
  // Match payload.projectSlug exactly when the event carries one; else
  // fall back to deriveProjectSlug(__sourceProject) basename comparison
  // (legacy events without explicit slug).
  if (f.projectSlug && f.projectSlug.length > 0) {
    const payloadSlug = (ev.payload as { projectSlug?: string }).projectSlug;
    if (typeof payloadSlug === "string" && payloadSlug.length > 0) {
      if (payloadSlug !== f.projectSlug) return false;
    } else {
      const fallbackSlug = deriveProjectSlug(ev.__sourceProject);
      if (fallbackSlug !== f.projectSlug) return false;
    }
  }

  // PR-10 — OntologyWorkflowTrace traceId filter (additive; back-compat when absent).
  if (f.traceId && f.traceId.length > 0) {
    const payloadTraceId = (ev.payload as { traceId?: string }).traceId;
    if (payloadTraceId !== f.traceId) return false;
  }

  return true;
}

/** Build executionGraph from filtered events. */
function buildExecutionGraph(events: AnnotatedEvent[]): {
  nodes: ExecutionGraphNode[];
  edges: ExecutionGraphEdge[];
} {
  const nodes: ExecutionGraphNode[] = events.map((ev) => ({
    id: `${ev.__sourceProject}:${ev.eventId}`,
    type: ev.type,
    project: ev.__sourceProject,
    when: ev.when,
    // Defense-in-depth optional chaining; multi-project-reader chokepoint
    // already drops events without byWhom, "unknown" is a hard-fallback signal.
    byWhom: ev.byWhom?.agentName ?? ev.byWhom?.identity ?? "unknown",
    sequence: ev.sequence,
  }));

  const edges: ExecutionGraphEdge[] = [];

  // "follows" edges: sequential events within same (project, sessionId)
  // Group + sort by sequence ASC, then chain consecutive nodes.
  const groups = new Map<string, AnnotatedEvent[]>();
  for (const ev of events) {
    const key = `${ev.__sourceProject}::${ev.throughWhich.sessionId}`;
    const arr = groups.get(key) ?? [];
    arr.push(ev);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    for (let i = 1; i < arr.length; i++) {
      edges.push({
        from: `${arr[i - 1]!.__sourceProject}:${arr[i - 1]!.eventId}`,
        to: `${arr[i]!.__sourceProject}:${arr[i]!.eventId}`,
        relation: "follows",
      });
    }
  }

  // "cited" edges: dryRunRef cross-references. Prefer the typed
  // lineageRefs.dryRunRef carrier added in rule 10/rule 26 work, and keep the
  // legacy withWhat.reasoning fallback for older append-only events.
  const refMap = new Map<string, AnnotatedEvent[]>();
  for (const ev of events) {
    const typedRef = ev.lineageRefs?.dryRunRef;
    const reasoning = ev.withWhat?.reasoning ?? "";
    const legacyMatch = /dryRunRef=([a-f0-9]+)/i.exec(reasoning);
    const ref = typedRef ?? legacyMatch?.[1];
    if (ref) {
      const arr = refMap.get(ref) ?? [];
      arr.push(ev);
      refMap.set(ref, arr);
    }
  }
  for (const arr of refMap.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => (a.when < b.when ? -1 : 1));
    for (let i = 1; i < arr.length; i++) {
      edges.push({
        from: `${arr[0]!.__sourceProject}:${arr[0]!.eventId}`,
        to: `${arr[i]!.__sourceProject}:${arr[i]!.eventId}`,
        relation: "cited",
      });
    }
  }

  return { nodes, edges };
}

export default async function pmWorkflowLineageQuery(
  rawArgs: unknown,
): Promise<PmWorkflowLineageQueryResult> {
  const args = (rawArgs ?? {}) as PmWorkflowLineageQueryArgs;
  const limit        = args.filter?.limit ?? DEFAULT_LIMIT;
  const useLegacyRaw = args.includeLegacyRaw === true;

  // Resolve project list
  let projects: ProjectEntry[];
  let discoveredPaths: string[] = [];
  if (args.projects && args.projects.length > 0) {
    projects = args.projects.map((p) => ({
      projectPath: p,
      eventsJsonlPath: `${p}/.palantir-mini/session/events.jsonl`,
      source: "registered" as const,
    }));
  } else {
    const discovery = discoverProjects({ projectsRoot: args.projectsRoot });
    projects = [...discovery.registered, ...discovery.discovered];
    discoveredPaths = discovery.discovered.map((d) => d.projectPath);

    // Emit advisory event for unregistered projects (read/write separation —
    // we do NOT auto-write to registered-projects.json from a query handler).
    // emit cwd = handler's caller cwd (not the discovered project's path) so we
    // don't pollute the discovered project's own events.jsonl with our advisory.
    if (discovery.discovered.length > 0) {
      try {
        await emit({
          type: "phase_completed",
          payload: {
            phaseTag: "project_auto_discovered",
            taskId: "pm-workflow-lineage-query-discovery",
            validations: discovery.discovered.map((d) => `fs-walk-found:${d.projectPath}`),
          },
          toolName: "pm_workflow_lineage_query",
          cwd: process.cwd(),
          identity: "monitor",
          reasoning: `pm_workflow_lineage_query: ${discovery.discovered.length} project(s) found in fs walk but not in registered-projects.json: ${discovery.discovered.map((d) => d.projectPath).join(", ")}. Run project_register on each to track explicitly.`,
        });
      } catch {
        // best-effort
      }
    }
  }

  // PR 4.7: build per-project promoted-event id sets when not in legacy-raw mode.
  let promotedIdsByProject: Map<string, Set<string>> | null = null;
  if (!useLegacyRaw) {
    promotedIdsByProject = new Map();
    for (const proj of projects) {
      const projectPath = proj.projectPath;
      const sessionDir  = path.join(projectPath, ".palantir-mini", "session");
      try {
        const promoted = readPromotedEvents({ sessionDir, gradeFilter: "T3+" });
        if (promoted.events.length > 0) {
          promotedIdsByProject.set(
            projectPath,
            new Set(promoted.events.map((e) => e.eventId)),
          );
        }
        // If no T3+ events for this project, leave entry absent → fallback to all events.
      } catch {
        // Unreadable project → skip promoted filter for that project (best-effort).
      }
    }
  }

  // Read + merge events across projects
  const { events: allEvents, perProjectCounts } = readMultiProjectEvents(projects);

  // Apply 5-dim filter + optional promoted-index gate (PR 4.7).
  const matched: AnnotatedEvent[] = [];
  for (const ev of allEvents) {
    if (!matchesFilter(ev, args.filter)) continue;
    // Promoted-index gate: when active, restrict to T3+ events per project.
    // If a project has no promoted set (entry absent from map), pass through
    // all its events (graceful fallback for projects with no T3+ events yet).
    if (promotedIdsByProject !== null) {
      const projSet = promotedIdsByProject.get(ev.__sourceProject);
      if (projSet !== undefined && !projSet.has(ev.eventId)) continue;
    }
    matched.push(ev);
  }
  const totalMatched = matched.length;
  const truncated = totalMatched > limit;
  const events = truncated ? matched.slice(0, limit) : matched;

  // Build executionGraph from truncated set
  const executionGraph = buildExecutionGraph(events);

  return {
    events,
    executionGraph,
    perProjectCounts,
    discovered: discoveredPaths,
    truncated,
    totalMatched,
  };
}
