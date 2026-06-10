// palantir-mini v6.55.0 — MCP tool handler: pm_substrate_query
// Domain: LEARN (7-handler mode-dispatched merger — sprint-063 W4.B + sprint-119 PR 5.8)
//
// Unifies 7 lineage/replay/query handlers under a single mode-dispatched
// entry-point. Each mode lazy-imports the corresponding existing handler and
// delegates all arg passing through the `filter` field.
//
// Modes:
//   "lineage"        → replay-lineage.ts            (single-project 5-dim replay)
//   "workflow"       → pm-workflow-lineage-query.ts  (cross-project graph)
//   "by-grade"       → pm-event-query-by-grade.ts   (rule 26 T0-T4 filter)
//   "retro"          → pm-retro-query.ts             (session retrospective)
//   "learn"          → pm-learn-query.ts             (learning_captured view)
//   "agent-export"   → pm-agent-lineage-export.ts    (per-agent markdown)
//   "post-merge"     → pm-substrate-query-post-merge.ts (T2+ replay between merge SHAs)
//   "session-opener" → pm-lead-brief.ts              (1-call session brief; folds pm_lead_brief)
//
// Returns: { ok: boolean, mode: string, data?: unknown, error?: string }
// Best-effort: handler throws → ok=false, error captured, data=undefined.
//
// Authority:
//   ~/.claude/plans/gleaming-hopping-dijkstra.md §3 Phase 4 W4.B + §6
//   canonical plan v2 §4 row 5.8 (sprint-119 PR 5.8 — post-merge mode)
//   canonical plan v2 §4 row 4.7 (sprint-109 PR 4.7 — promoted-index cutover)
//   rules/10-events-jsonl.md (events.jsonl substrate, 5-dim)
//   rules/26-valuable-data-standard.md (grade filtering)

export type SubstrateMode =
  | "lineage"
  | "workflow"
  | "by-grade"
  | "retro"
  | "learn"
  | "agent-export"
  | "post-merge"
  | "session-opener";

export interface PmSubstrateQueryArgs {
  /**
   * Project root path. Defaults to process.cwd() when omitted.
   * Passed through to delegated handlers as `project` or `projectRoot`
   * depending on the handler's arg schema.
   */
  project?: string;
  /** Dispatch mode — selects the underlying handler. Required. */
  mode: SubstrateMode;
  /**
   * Handler-specific filter arguments. Shape varies per mode:
   *   - "lineage"      → LineageFilter fields + optional projectSlug, verbose
   *   - "workflow"     → PmWorkflowLineageQueryArgs.filter + optional projects, projectsRoot
   *   - "by-grade"     → { gradeFilter, eventTypeFilter?, sinceWhen?, limit? }
   *   - "retro"        → { sessionLast?, byAgent? }
   *   - "learn"        → { limit?, minConfidence?, topic? }
   *   - "agent-export" → { agentIdentity?, agentName?, agentNameRegex?, sessionId?,
   *                         whenFrom?, whenTo?, limit? }
   *   - "post-merge"   → (use newMergeSha + previousMainSha top-level fields instead)
   */
  filter?: Record<string, unknown>;
  /**
   * For mode="post-merge": the new merge commit SHA (required).
   * Identifies the upper bound of the commit range to replay.
   */
  newMergeSha?: string;
  /**
   * For mode="post-merge": the previous main HEAD SHA (optional).
   * When omitted, derived from `git rev-parse <newMergeSha>^`.
   */
  previousMainSha?: string;
  /**
   * Convenience arg for "agent-export" mode — forwarded as agentName in filter.
   * Ignored for other modes.
   */
  agentName?: string;
  /**
   * For mode="session-opener" (folds former pm_lead_brief): 1-2 sentence task
   * description. When present, the brief includes a dispatch suggestion. Ignored
   * by other modes.
   */
  intent?: string;
  /**
   * For mode="session-opener": skill name recorded on the emitted skill_started
   * event. Defaults to "pm_lead_brief" in the delegated handler. Ignored by other modes.
   */
  skillName?: string;
  /**
   * PR 4.7 — Forwarded to delegated handlers that support it (lineage, workflow,
   * retro). When true, those handlers skip the promoted-index path and perform a
   * full raw scan of events.jsonl + archives. Default false (promoted-index T3+).
   * Ignored by modes that do not support the flag (by-grade, learn, agent-export,
   * post-merge) — they always read all events by design.
   */
  includeLegacyRaw?: boolean;
}

export interface PmSubstrateQueryResult {
  ok: boolean;
  mode: SubstrateMode;
  /** Delegated handler result on success. */
  data?: unknown;
  /** Error message when ok=false. */
  error?: string;
}

const VALID_MODES: ReadonlySet<string> = new Set([
  "lineage",
  "workflow",
  "by-grade",
  "retro",
  "learn",
  "agent-export",
  "post-merge",
  "session-opener",
]);

/**
 * Build the args object to forward to the delegated handler.
 * Each handler has a slightly different arg schema; we normalise here.
 */
function buildDelegateArgs(
  mode: SubstrateMode,
  rawArgs: PmSubstrateQueryArgs,
): Record<string, unknown> {
  const project = rawArgs.project ?? process.cwd();
  const filter = rawArgs.filter ?? {};

  switch (mode) {
    case "lineage":
      // replay-lineage: { project, filter?, projectSlug?, verbose?, includeLegacyRaw? }
      return {
        project,
        filter,
        projectSlug:      filter.projectSlug,
        verbose:          filter.verbose,
        includeLegacyRaw: rawArgs.includeLegacyRaw,
      };

    case "workflow":
      // pm-workflow-lineage-query: { projects?, projectsRoot?, filter?, includeLegacyRaw? }
      return {
        projects:         filter.projects,
        projectsRoot:     filter.projectsRoot,
        includeLegacyRaw: rawArgs.includeLegacyRaw,
        filter: {
          ...filter,
          // strip workflow-top-level fields from the nested filter
          projects:     undefined,
          projectsRoot: undefined,
        },
      };

    case "by-grade":
      // pm-event-query-by-grade: { project, gradeFilter, eventTypeFilter?, sinceWhen?, limit? }
      return {
        project,
        gradeFilter: filter.gradeFilter ?? "all",
        eventTypeFilter: filter.eventTypeFilter,
        sinceWhen: filter.sinceWhen,
        limit: filter.limit,
      };

    case "retro":
      // pm-retro-query: { projectRoot?, sessionLast?, byAgent?, includeLegacyRaw? }
      return {
        projectRoot:      project,
        sessionLast:      filter.sessionLast,
        byAgent:          filter.byAgent,
        includeLegacyRaw: rawArgs.includeLegacyRaw,
      };

    case "learn":
      // pm-learn-query: { projectRoot?, limit?, minConfidence?, topic? }
      return {
        projectRoot: project,
        limit: filter.limit,
        minConfidence: filter.minConfidence,
        topic: filter.topic,
      };

    case "agent-export":
      // pm-agent-lineage-export: { project, agentIdentity?, agentName?, agentNameRegex?,
      //                             sessionId?, whenFrom?, whenTo?, limit? }
      return {
        project,
        agentIdentity: filter.agentIdentity,
        agentName: rawArgs.agentName ?? filter.agentName,
        agentNameRegex: filter.agentNameRegex,
        sessionId: filter.sessionId,
        whenFrom: filter.whenFrom,
        whenTo: filter.whenTo,
        limit: filter.limit,
      };

    case "post-merge":
      // pm-substrate-query-post-merge: { project?, newMergeSha, previousMainSha? }
      return {
        project,
        newMergeSha: rawArgs.newMergeSha ?? filter.newMergeSha,
        previousMainSha: rawArgs.previousMainSha ?? filter.previousMainSha,
      };

    case "session-opener":
      // pm-lead-brief: { project?, skillName?, intent? } — 1-call session brief.
      return {
        project,
        intent: rawArgs.intent ?? filter.intent,
        skillName: rawArgs.skillName ?? filter.skillName,
      };
  }
}

/**
 * Lazy-import the handler module for the given mode and return its default export.
 * Using dynamic import keeps startup cost low; each handler is only loaded when called.
 */
async function loadHandler(mode: SubstrateMode): Promise<(args: unknown) => Promise<unknown>> {
  switch (mode) {
    case "lineage": {
      const mod = await import("./replay-lineage.js");
      return mod.default;
    }
    case "workflow": {
      const mod = await import("./pm-workflow-lineage-query.js");
      return mod.default;
    }
    case "by-grade": {
      const mod = await import("./pm-event-query-by-grade.js");
      return mod.default;
    }
    case "retro": {
      const mod = await import("./pm-retro-query.js");
      return mod.default;
    }
    case "learn": {
      const mod = await import("./pm-learn-query.js");
      return mod.default;
    }
    case "agent-export": {
      const mod = await import("./pm-agent-lineage-export.js");
      return mod.default;
    }
    case "post-merge": {
      const mod = await import("./pm-substrate-query-post-merge.js");
      return mod.default as unknown as (args: unknown) => Promise<unknown>;
    }
    case "session-opener": {
      const mod = await import("./pm-lead-brief.js");
      return mod.default;
    }
  }
}

export default async function pmSubstrateQuery(
  rawArgs: unknown,
): Promise<PmSubstrateQueryResult> {
  const args = (rawArgs ?? {}) as PmSubstrateQueryArgs;

  // Validate mode
  if (!args.mode || typeof args.mode !== "string") {
    throw new Error(
      "pm_substrate_query: `mode` is required. Valid modes: lineage | workflow | by-grade | retro | learn | agent-export | post-merge",
    );
  }
  if (!VALID_MODES.has(args.mode)) {
    throw new Error(
      `pm_substrate_query: unknown mode "${args.mode}". Valid modes: ${[...VALID_MODES].join(" | ")}`,
    );
  }

  const mode = args.mode as SubstrateMode;
  const delegateArgs = buildDelegateArgs(mode, args);

  try {
    const handler = await loadHandler(mode);
    const data = await handler(delegateArgs);
    return { ok: true, mode, data };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, mode, error };
  }
}
