// palantir-mini v1 — stdio MCP server (raw JSON-RPC 2.0, zero-dep)
// Domain: LOGIC (Harness API — prim-logic-04 Reducer + prim-action-03 AtomicCommit bridge)
//
// Implements the Model Context Protocol (MCP) over stdio. The live surface is
// declared by the TOOLS registry below and dispatched lazily via HANDLER_MODULES.
//
// Protocol reference: https://spec.modelcontextprotocol.io/specification/2024-11-05/
// MCP uses JSON-RPC 2.0 with these methods:
//   initialize, notifications/initialized, tools/list, tools/call
//
// The server is intentionally zero-dep. It reads line-delimited JSON messages
// from stdin and writes responses to stdout. Logs go to stderr.
//
// The public tool registry below is the source of truth for the live MCP surface.
// Historical deprecation mappings live in bridge/handlers/_deprecation-map.ts.
// events_log_rotate remains present to satisfy the pm-events-rotate skill contract.

import * as readline from "readline";
import type { EventType } from "../lib/event-log/types";
import {
  DEFAULT_MCP_TOOL_SURFACE_PROFILE,
  MCP_TOOL_SURFACE_PROFILE_ENV,
  getMcpToolCapability,
  isMcpToolVisibleInProfile,
  resolveMcpToolSurfaceProfile,
  type McpToolSurfaceMetadata,
  type McpToolSurfaceProfile,
} from "../lib/capability-registry/mcp-tool-capability";
import {
  classifyError,
  elapsedMs,
  emitToolInvocationCompleted,
  now as nowMs,
} from "../lib/event-log/timing";
import { isMcpFirstEvidenceToolName } from "../lib/hooks/tool-classifier";
import { PROMPT_RUNTIMES } from "../lib/prompt-front-door";
import { emit } from "../scripts/log";

// ─── JSON-RPC 2.0 types ────────────────────────────────────────────────────
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?:     number | string | null;
  method:  string;
  params?: unknown;
}
interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id:      number | string | null;
  result:  unknown;
}
interface JsonRpcError {
  jsonrpc: "2.0";
  id:      number | string | null;
  error:   { code: number; message: string; data?: unknown };
}
type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

// ─── Tool registry — Gap fill 2 JSON schemas ───────────────────────────────
export interface ToolSpec {
  name:        string;
  description: string;
  inputSchema: unknown;
  category?:    "ontology-engineering" | "harness-engineering" | "lead-routing" | "validation-health" | "hook-validation";
  audience?:    "public" | "skill-only" | "internal";
  lifecycle?:   "public" | "deprecated-candidate" | "deprecated" | "merged";
  ownerModule?: string;
  replacedBy?:  string;
  stableSince?: string;
  surface?:     McpToolSurfaceMetadata;
}

const TOOLS: ToolSpec[] = [
  // ─── A. Ontology Engineering (14) ─────────────────────────────────────────
  {
    name: "emit_event",
    description:
      "Atomically append an EventEnvelope to the project's events.jsonl. " +
      "Uses fs.mkdir mutex lock (proven 0-lost / 2000 at 2-writer race). " +
      "Returns the assigned monotonic sequence number.",
    inputSchema: {
      type: "object",
      required: ["project", "envelope"],
      properties: {
        project:  { type: "string", description: "Absolute path to the project root." },
        envelope: {
          type: "object",
          description: "EventEnvelope without sequence (sequence is assigned under the lock).",
          required: ["type", "eventId", "when", "atopWhich", "throughWhich", "byWhom", "payload"],
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_ontology",
    description:
      "Read the derived ontology snapshot for a project at an optional sequence cut-point. " +
      "Returns folded state from events.jsonl — the Reducer LOGIC primitive applied to the Session. " +
      "If atSequence is omitted, returns the latest snapshot.",
    inputSchema: {
      type: "object",
      required: ["project"],
      properties: {
        project:    { type: "string", description: "Absolute path to the project root (where .palantir-mini/session/ lives)." },
        domain:     { type: "string", enum: ["data", "logic", "action", "security", "learn", "all"], description: "D/L/A/S/LEARN domain filter." },
        atSequence: { type: "number", description: "Sequence cut-point for historical reads." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "ontology_schema_get",
    description:
      "Retrieve the canonical schema snapshot for a primitive RID. " +
      "Looks up palantir-mini runtime-overlay/schemas-snapshot or runtime-overlay/ontology-shared-core. " +
      "Returns the raw TypeScript source + file path. " +
      "References: prim-security-02 CapabilityToken, prim-learn-03 ScenarioSandbox, etc.",
    inputSchema: {
      type: "object",
      required: ["primitiveRid"],
      properties: {
        primitiveRid: { type: "string", description: "Primitive RID, e.g. 'CapabilityToken' or 'capability-token'." },
        schemaRoot:   { type: "string", description: "Optional override for schema root directory." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "impact_query",
    description:
      "Context Engineering core: ForwardProp/BackwardProp impact graph query for a RID. " +
      "Returns single-hop + transitive closure (depth 3). Call BEFORE any edit.",
    inputSchema: {
      type: "object",
      required: ["rid"],
      properties: {
        rid:         { type: "string" },
        depth:       { type: "number" },
        projectRoot: { type: "string", description: "Absolute project root for SQLite lookup (defaults to CWD)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "pre_edit_impact",
    description:
      "PreToolUse substrate: resolve proposed files → impact classification. " +
      "Returns affects[], tests[], docs[], risks[], transitiveRids[]. " +
      "Wired by hooks/pre-edit-impact-check.ts.",
    inputSchema: {
      type: "object",
      required: ["proposedFiles", "project"],
      properties: {
        proposedFiles: { type: "array", items: { type: "string" } },
        project:       { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "pm_pre_mutation_governance",
    description:
      "Compute-only pre-mutation governance gate for protected mutation authorization. " +
      "Returns a deterministic GovernanceDecisionV2 with stable reason codes and " +
      "does not commit edits, emit lineage events, or mutate project state.",
    inputSchema: {
      type: "object",
      required: ["toolName"],
      properties: {
        project: { type: "string", description: "Absolute project root. Either project or projectRoot is required; enforced by handler." },
        projectRoot: { type: "string", description: "Alias for project. Either project or projectRoot is required; enforced by handler." },
        promptId: { type: "string" },
        promptHash: { type: "string" },
        toolName: { type: "string", description: "Runtime tool name being evaluated." },
        toolInput: { type: "object", additionalProperties: true },
        targetFiles: { type: "array", items: { type: "string" } },
        resolvedTargetFiles: { type: "array", items: { type: "string" } },
        semanticIntentContractRef: { type: "string" },
        digitalTwinChangeContractRef: { type: "string" },
        workContractRef: { type: "string" },
        semanticIntentContract: { type: "object", additionalProperties: true },
        digitalTwinChangeContract: { type: "object", additionalProperties: true },
        semanticConsistencyResultRef: { type: "string" },
        semanticConsistencyResult: { type: "object", additionalProperties: true },
        projectScope: { type: "object", additionalProperties: true },
        mode: { type: "string", enum: ["advisory", "blocking"], default: "blocking" },
        dtcFill: {
          type: "object",
          properties: {
            complete: { type: "boolean" },
            status: { type: "string" },
            currentTurn: { type: "number" },
            requiredTurns: { type: "number" },
            evidenceRefs: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
        callerAllowed: { type: "boolean" },
        runtimeAllowed: { type: "boolean" },
        freeTextAuthorization: { type: "string" },
        explanation: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "apply_edit_function",
    description:
      "Execute a Tier-2 edit function and return OntologyEdit[] WITHOUT committing. " +
      "Mirrors Palantir authoring helper §LOGIC.FN-04. The returned edits are hypothetical " +
      "and require commit_edits to be applied. Emits an edit_proposed event on success.",
    inputSchema: {
      type: "object",
      required: ["project", "functionName", "params"],
      properties: {
        project:      { type: "string" },
        functionName: { type: "string", description: "Registered edit function name." },
        params:       { type: "object", description: "Params matching the function's signature.", additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  {
    name: "compute_edits_dry_run",
    description:
      "Invoke an edit function and return its computed OntologyEdit[] + validation result " +
      "WITHOUT committing. Tier-2 compute-only path. Emits edits_computed_dry_run event.",
    inputSchema: {
      type: "object",
      required: ["project", "functionName"],
      properties: {
        project:      { type: "string", description: "Absolute project root." },
        functionName: { type: "string", description: "Ontology function apiName." },
        params:       { type: "object", description: "Function parameters; shape per ontology logic declaration." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "pm_ontology_engineering_workflow",
    description:
      "Public Ontology Engineering workflow state machine. Owns start -> turn -> draft_sic -> status " +
      "around the internal FDEOntologyEngineeringSession and returns runtime-neutral workflow state.",
    inputSchema: {
      type: "object",
      required: ["action"],
      properties: {
        action: { type: "string", enum: ["start", "turn", "draft_sic", "status"] },
        project: { type: "string", description: "Absolute project root." },
        projectRoot: { type: "string", description: "Alias for project." },
        universalOntologyEntryRef: { type: "string" },
        universalOntologyEntryId: { type: "string" },
        sessionId: { type: "string" },
        fdeSessionRef: { type: "string" },
        ontologyContextQueryRef: { type: "string" },
        workflowTraceRef: { type: "string" },
        semanticIntentContractRef: { type: "string" },
        semanticIntentContractStatus: { type: "string", enum: ["draft", "approved", "superseded"] },
        digitalTwinChangeContractRef: { type: "string" },
        digitalTwinChangeContractStatus: { type: "string", enum: ["draft", "approved", "superseded"] },
        workContractRef: { type: "string" },
        affectedSurfaces: { type: "array", items: { type: "string" } },
        recordedDecisionNote: { type: "string" },
        rawUserMessage: { type: "string" },
        sanitizedTurnSummary: { type: "string" },
        userMessageHash: { type: "string" },
        turnId: { type: "string" },
        acceptedHypothesisIds: { type: "array", items: { type: "string" } },
        rejectedHypothesisIds: { type: "array", items: { type: "string" } },
        deferredHypothesisIds: { type: "array", items: { type: "string" } },
        choiceApplications: { type: "array", items: { type: "object" } },
        signal: { type: "object" },
        createdAt: { type: "string" },
        emittedAt: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "commit_edits",
    description:
      "Atomic commit of a set of OntologyEdit[] wrapped by an ActionTypeRid. " +
      "Pre-flight submission criteria gate (9 constraint classes) runs first. " +
      "Mirrors OSDK 2.0 $validateOnly / $returnEdits. Emits edit_committed or " +
      "submission_criteria_failed events. Set validateOnly:true for a dry-run.",
    inputSchema: {
      type: "object",
      required: ["project", "actionTypeRid", "edits"],
      properties: {
        project:       { type: "string" },
        actionTypeRid: { type: "string", description: "Action type identifier." },
        edits:         { type: "array", items: { type: "object", additionalProperties: true } },
        submissionCriteria: { type: "array", items: { type: "object", additionalProperties: true } },
        validateOnly:  { type: "boolean", default: false, description: "Dry-run: do not commit, return validation result only." },
      },
      additionalProperties: false,
    },
  },
  // ─── B. Harness Engineering (8) ────────────────────────────────────────────
  // Phase H2 (2026-04-20) — 3-agent harness (Prithvi Rajasekaran + AIP Evals 5-evaluator)
  {
    name: "grade_semantic_intent_contract",
    description:
      "Sprint-124 PR 5.13 — deterministic 7-criterion SIC grader. " +
      "Scores a SemanticIntentContract against: clarityOfIntent + scopeBoundedness + " +
      "nounVerbDisambiguation + nonGoalsClarity + downstreamBlastRadius + " +
      "fillSequenceCompleteness + evidenceGrounding. " +
      "Equal weights (1/7 each). Verdict: ≥0.7→pass, 0.5-0.7→revise, <0.5→reject. " +
      "No LLM calls — pure deterministic heuristics. Emits sic_graded event. " +
      "Per canonical plan v2 §4 row 5.13.",
    inputSchema: {
      type: "object",
      required: ["semanticIntentContract"],
      properties: {
        projectPath: {
          type: "string",
          description: "Absolute project path (defaults to CWD).",
        },
        semanticIntentContract: {
          type: "object",
          description: "SemanticIntentContract object to grade.",
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
    category: "harness-engineering" as const,
  },
  {
    name: "negotiate_sprint_contract",
    description:
      "File-based Generator↔Evaluator SprintContract negotiation. Append a round {role, action, contract?, rationale?} " +
      "to sprint-<NNN>/contract-negotiation.md. Both sides must post APPROVED to transition status from negotiating → bound. " +
      "Aborts after 15 rounds without agreement. Emits sprint_contract_negotiated per round + sprint_contract_bound on approval. " +
      "v3.13.0+ stamps `projectSlug` into the bound event payload (crystalline-resilient-narwhal P-EXTRA — cross-project disambiguation).",
    inputSchema: {
      type: "object",
      required: ["sprintNumber", "role", "action"],
      properties: {
        projectPath:   { type: "string", description: "Absolute project path (defaults to cwd)." },
        sprintNumber:  { type: "number", description: "1-based sprint number." },
        role:          { type: "string", enum: ["generator", "evaluator", "orchestrator"], description: "Which role is calling." },
        action:        { type: "string", enum: ["propose", "counter", "approve", "read"], description: "What the caller is doing this round." },
        contract:      { type: "object", description: "SprintContractDeclaration for propose/counter." },
        rationale:     { type: "string", description: "Free-text rationale appended to the log." },
        projectSlug:   {
          type: "string",
          description:
            "v3.13.0+ optional project slug override (crystalline-resilient-narwhal P-EXTRA). " +
            "When omitted, derived from `projectPath` via deriveProjectSlug() (package.json#name basename, scope stripped, sanitized). " +
            "Plumbed into sprint_contract_bound event payload + stamped onto the contract.json on disk.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "grade_outcome_with_rubric",
    description:
      "AIP Evals 5-evaluator dispatcher. Given an artifact + GradingRubric (ordered Set<GradingCriterion>), dispatches each " +
      "criterion to code/rule/model/human/hybrid grader and aggregates weighted score. Code criteria run validationExpression, " +
      "rule criteria regex/JSONSchema inline, model/human criteria return markers for agent dispatch. Emits grading_completed event. " +
      "v2.18.0: also emits evaluator_strictness_probe per criterion for W2 strictness audit.",
    inputSchema: {
      type: "object",
      required: ["artifactPath", "rubric"],
      properties: {
        projectPath:   { type: "string", description: "Absolute project path." },
        artifactPath:  { type: "string", description: "File or directory being graded (relative to project OK)." },
        rubric:        { type: "object", description: "GradingRubric JSON: { rubricId, criteria: [GradingCriterionLite, ...] }." },
        evidenceDir:   { type: "string", description: "Optional Playwright or scenario evidence bundle path." },
        specPath:      { type: "string", description: "Optional spec path for model graders to ground judgment." },
        loopId:        { type: "string", description: "FeedbackLoopRid cross-reference." },
        sprintNumber:  { type: "number", description: "Sprint context." },
        iteration:     { type: "number", description: "Iteration context." },
      },
      additionalProperties: false,
    },
  },
  // ─── v3.8.1 W2.1a P1 — Separate-context model-domain grader ───
  {
    name: "pm_grader_dispatch",
    description:
      "v3.8.1 W2.1a (P1): single-criterion model-domain grader. Delegates to gradeModel(), which gates model execution by host runtime; " +
      "Claude hosts may use a fresh Claude CLI adapter while non-Claude hosts return needs_human_review until a native grader exists. " +
      "Eliminates self-grading bias per Prithvi 2026-03-24 (rule 16 v3.1.0 §Roles). " +
      "Optional selfAssessmentPath augments scoringPrompt with Generator's transparency-only self-claim; grader cites " +
      "divergence as `[selfAssessmentDivergence:aligned|generator-overconfident|generator-underconfident|uncomparable]`. " +
      "Used by grade-outcome-with-rubric for domain=\"model\" criteria + standalone for Lead-direct inline grading.",
    inputSchema: {
      type: "object",
      required: ["project", "criterion", "artifactPath"],
      properties: {
        project:             { type: "string", description: "Absolute project path (events.jsonl scope)." },
        criterion:           { type: "object", description: "GradingCriterionLite — must have rubricDomain=\"model\" + scoringPrompt." },
        artifactPath:        { type: "string", description: "File or directory being graded (relative to project OK)." },
        specPath:            { type: "string", description: "Optional spec.md path for grader context." },
        evidenceDir:         { type: "string", description: "Optional evidence dir (Playwright snapshots / console logs)." },
        selfAssessmentPath:  { type: "string", description: "Optional Generator self-assessment-NNN.md path (rule 16 v3.1.0 §Roles)." },
        sprintNumber:        { type: "number", description: "Optional sprint context for replay and audit evidence." },
        iteration:           { type: "number", description: "Optional iteration context for replay and audit evidence." },
      },
      additionalProperties: false,
    },
  },
  // ─── C. Lead Routing — NEW (5) — sprint-063 W3.A/W3.B/W4.A/W4.B + Lead Intent gate
  {
    name: "pm_semantic_intent_gate",
    description:
      "Lead Intent -> Digital Twin contract gate. FDE sessions surface user meaning turn-by-turn; " +
      "this gate records the approved boundary as SemanticIntentContract and derives " +
      "DigitalTwinChangeContract evidence only from approved SIC plus FDE/context-engineering inputs " +
      "before pm_intent_router dispatches ontology-affecting execution.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:                  { type: "string", description: "Absolute project root." },
        rawIntent:                { type: "string", description: "User-authored prompt or Lead-captured summary used for gate continuity; not DTC authority by itself." },
        scopePaths:               { type: "array", items: { type: "string" } },
        complexityHint:           { type: "string", enum: ["trivial", "single-file", "multi-file", "cross-cutting"] },
        semanticIntentContractRef: { type: "string" },
        digitalTwinChangeContractRef: { type: "string" },
        semanticIntentContract:   { type: "object" },
        digitalTwinChangeContract: { type: "object" },
        promptId:                 { type: "string", description: "Prompt-front-door promptId captured by UserPromptSubmit." },
        promptHash:               { type: "string", description: "Expected prompt hash for prompt-front-door continuity validation." },
        sessionId:                { type: "string", description: "Runtime session that owns the prompt envelope." },
        runtime:                  { type: "string", enum: PROMPT_RUNTIMES },
        fdeOntologyEngineeringSessionRef: { type: "string", description: "FDE Ontology Engineering session provenance required for workflow-control-plane changes." },
        includeDrafts:            { type: "boolean" },
        draftMode:                { type: "string", enum: ["always", "required-only", "never"] },
        interactionMode:          { type: "string", enum: ["machine", "human_collaborative"] },
        userExpertise:            { type: "string", enum: ["non_programmer", "technical", "developer"] },
        preferredLanguage:        { type: "string", enum: ["ko", "en"] },
        turn:                     { type: "number", description: "Fill sequence turn index. For SIC, this records FDE/context-confirmed meaning into the contract boundary; raw prompt extraction remains draft-only." },
        turnUserInput:            { type: "string", description: "Free-text user answer for the current fill turn. Only meaningful when `turn` is provided." },
        fillPolicy:               { type: "string", enum: ["default-8-turn", "fde-ontology-build", "dtc-turn-fill", "context-engineering-to-sic", "ontology-dtc-build"], description: "Fill sequence policy. Absent = legacy T0-T7 boundary fill. 'fde-ontology-build' surfaces meaning in the FDE session; 'context-engineering-to-sic' requires DATA/LOGIC/ACTION/GOVERNANCE readiness before SIC; DTC policies require approved SIC + FDE/context plan evidence before DTC approval." },
        semanticConsistencyResolverInput: { type: "object", description: "Optional deterministic semantic consistency resolver input. Resolves source-system terms without LLM promotion and projects resolver evidence into conversation/application state." },
      },
      required: ["project", "rawIntent"],
    },
  },
  {
    name: "pm_intent_router",
    description:
      "Sprint-063 W3.A — full intent-router. Subsumes delegate_or_direct + dispatch_route_decide + " +
      "dispatch_to_runtime. Enforces the Lead Intent -> Digital Twin contract gate before complex " +
      "ontology-affecting dispatch. Returns enriched recipe + cost-aware species pick + prefetched " +
      "context using the current public impact, lineage, and health surfaces.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:        { type: "string", description: "Absolute project root." },
        intent:         { type: "string", description: "1-2 sentence task description." },
        scopePaths:     { type: "array",  items: { type: "string" } },
        complexityHint: { type: "string", enum: ["trivial", "single-file", "multi-file", "cross-cutting"] },
        harnessSpeciesPreference: { type: "string" },
        semanticIntentContractRef: { type: "string" },
        digitalTwinChangeContractRef: { type: "string" },
        semanticIntentContract:   { type: "object" },
        digitalTwinChangeContract: { type: "object" },
        promptId:       { type: "string", description: "Prompt-front-door promptId captured by UserPromptSubmit." },
        promptHash:     { type: "string", description: "Expected prompt hash for prompt-front-door continuity validation." },
        sessionId:      { type: "string", description: "Runtime session that owns the prompt envelope." },
        runtime:        { type: "string", enum: PROMPT_RUNTIMES },
        fdeOntologyEngineeringSessionRef: { type: "string", description: "FDE Ontology Engineering session provenance required for workflow-control-plane routing." },
        acceptApprovalAutoCreate: { type: "boolean", description: "When true (default), auto-creates OntologyContextApproval for low-risk intents. Set false to suppress." },
      },
      required: ["project", "intent"],
    },
  },
  {
    name: "pm_lead_brief",
    description:
      "Sprint-063 W3.B — 1-call session-opener. Returns session context, recent sprint contracts, " +
      "value-grade summary, recent T3+ lineage, and dispatch suggestion when intent is provided.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:   { type: "string" },
        skillName: { type: "string" },
        intent:    { type: "string" },
      },
    },
  },
  {
    name: "pm_health_audit",
    description:
      "Sprint-063 W4.A — mode-dispatched health audit merger for handler usage, harness base, " +
      "harness components, harness outcomes, outcome pairs, memory layer, research citations, " +
      "event conformance, strictness, ontology runtime, and doc drift. Mode `all` runs every " +
      "sub-audit sequentially.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:   { type: "string" },
        mode:      {
          type: "string",
          enum: [
            "handler-usage", "harness-base", "harness-component", "harness-outcome",
            "outcome-pair", "memory-layer", "research-citation", "events-5d", "strictness",
            "doc-drift", "ontology-runtime", "all",
          ],
        },
        agentName: { type: "string" },
      },
      required: ["mode"],
    },
  },
  {
    name: "pm_substrate_query",
    description:
      "Sprint-063 W4.B — consolidated substrate query for lineage, workflow, by-grade, retro, " +
      "learn, and agent-export read paths. Mode dispatches with filter passthrough.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:   { type: "string" },
        mode:      {
          type: "string",
          enum: ["lineage", "workflow", "by-grade", "retro", "learn", "agent-export"],
        },
        filter:    { type: "object" },
        agentName: { type: "string" },
      },
      required: ["mode"],
    },
  },
  {
    name: "research_context_select",
    description:
      "Return the smallest ordered research/schema read set for a Palantir-heavy task. " +
      "Prefers ~/.claude/research/palantir-official current docs SSoT, includes BROWSE/INDEX routers, " +
      "and surfaces currentness notes for latest-signal handling.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query:              { type: "string" },
        topic:              { type: "string", description: "Research topic directory; defaults to palantir-official." },
        maxFiles:           { type: "number", description: "Maximum official-doc body files to include. Default 12, max 30." },
        includeSchemas:     { type: "boolean" },
        includeLatestWatch: { type: "boolean" },
        authorityMode:      { type: "string", enum: ["plugin-portable", "external-preferred", "external-required"] },
      },
    },
  },
  // ─── D. Validation + Health ────────────────────────────────────────────────
  {
    name: "events_log_rotate",
    description:
      "Rotate a project's events.jsonl when it crosses size or line-count thresholds. " +
      "Archives the breached log with an atomic rename and writes an event_log_rotated " +
      "bridge event into the fresh live log to preserve BackPropagation replay continuity.",
    inputSchema: {
      type: "object",
      required: ["project"],
      properties: {
        project:        { type: "string", description: "Absolute path to the project root." },
        thresholdBytes: { type: "number", description: "Optional byte threshold. Default is 10 MB." },
        thresholdLines: { type: "number", description: "Optional line-count threshold. Default is 10K lines." },
        sessionId:      { type: "string", description: "Optional runtime session id for the rotation bridge event." },
        agentName:      { type: "string", description: "Optional agent name for the rotation bridge event." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "research_library_refresh",
    description:
      "Dry-run or refresh manifest-backed research libraries. Supports current docs[] manifests, legacy entries[] manifests, " +
      "source selectors including palantir-official, and safe dry-run by default.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        libraryRoot:        { type: "string" },
        source:             { type: "string", enum: ["palantir-official", "palantir-foundry", "claude-code", "palantir-vision", "interaction", "skills", "all"] },
        manifestPath:       { type: "string" },
        staleThresholdDays: { type: "number" },
        since:              { type: "string" },
        dryRun:             { type: "boolean" },
        agentName:          { type: "string" },
      },
    },
  },
  // ── v2.23.0 Phase 1 — pm_plugin_self_check: substrate health aggregator ───
  {
    name: "pm_plugin_self_check",
    description:
      "Aggregate substrate health check: schema pin + codegen headers + rule audit + plugin-declared agents/skills on-disk verification. Returns structured result with per-axis pass/fail + overall verdict. Phase 1 (v2.23.0): filesystem-walk based; Phase 2d will cross-check vs AgentDefinition + SkillDefinition primitives.",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["public-mcp", "handler-inventory", "hooks", "skills", "project-skill-ontology", "agents", "managed-settings", "surface-contracts", "release"],
          description: "Self-check mode. Defaults to release.",
        },
        projectPath: { type: "string", description: "Optional project path for project-specific codegen header verification. If omitted, codegen check returns skipped." },
        agentName: { type: "string", description: "Optional caller name for 5-dim event envelope." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "pm_workflow_response_validate",
    description:
      "Validate user-visible palantir-mini workflow response text against the plugin-owned prompt response requirements. " +
      "Reports missing status fields, runtime-gap disclosure, SSoT basis, forbidden runtime UI markers, and false parity claims.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Assistant response text to validate." },
        promptText: { type: "string", description: "Optional governing prompt text used to decide whether the template is required." },
        runtime: { type: "string", description: "Runtime name for diagnostic context." },
        enforcementSurface: { type: "string", description: "Surface invoking validation, e.g. MCP or Stop." },
        forceRequired: { type: "boolean", description: "When true, validate as a governed palantir-mini workflow response regardless of promptText." },
      },
      required: ["text"],
      additionalProperties: false,
    },
  },
  {
    name: "pm_surface_contract_audit",
    description:
      "Audit palantir-mini local AIP/FDE surface contracts across agents, skills, MCP tools, hooks, evals, and runtime adapters. " +
      "Reports missing or invalid palantirSurface metadata without moving workflow authority into runtime-local overlays.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string", description: "Canonical palantir-mini source root. Defaults to the plugin root." },
        mode: {
          type: "string",
          enum: ["agents", "skills", "mcp-tools", "hooks", "evals", "runtime-adapters", "all"],
          description: "Surface family to audit. Defaults to all.",
        },
        failClosed: {
          type: "boolean",
          description:
            "When true, missing contracts fail. Default false keeps the first hardening slice advisory-only.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "pm_aip_source_authority_validate",
    description:
      "Validate local AIP/FDE surface Palantir source authority refs. " +
      "Requires local ~/.claude/research/palantir-* provenance plus official palantir.com URLs for AIP/FDE claims.",
    inputSchema: {
      type: "object",
      required: ["surfaceContract"],
      properties: {
        surfaceContract: {
          type: "object",
          description: "AipFdeLocalSurfaceContract to validate.",
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "pm_runtime_decision_parity",
    description:
      "Compare neutral, Claude, and Codex workflow decisions for semantic parity. " +
      "Runtime-specific unsupported surfaces are preserved as metadata and do not become native parity claims.",
    inputSchema: {
      type: "object",
      required: ["neutral", "claude", "codex"],
      properties: {
        neutral: { type: "object", additionalProperties: true },
        claude: { type: "object", additionalProperties: true },
        codex: { type: "object", additionalProperties: true },
      },
      additionalProperties: false,
    },
  },
  // ── v2.26.0 Phase 2c (D9) — pm_rule_query: consolidated rule lookup ──
  // Replaces pm_rule_get + pm_rule_list + pm_rule_search with a single
  // discriminator-dispatched tool. byId / bySlug / byQuery / list-all.
  {
    name: "pm_rule_query",
    description:
      "Consolidated rule lookup. Provide exactly one of { byId, bySlug, byQuery } — or none for list mode. Returns mode-discriminated result: get | list | search. Replaces pm_rule_get + pm_rule_list + pm_rule_search (retired v2.26.0).",
    inputSchema: {
      type: "object",
      properties: {
        byId:            { type: "number", description: "Get mode — fetch one rule by numeric ID." },
        bySlug:          { type: "string", description: "Get mode — fetch one rule by kebab slug." },
        byQuery:         { type: "string", description: "Search mode — keyword query across invariants + bodies." },
        limit:           { type: "number", description: "Search/list result cap. Search default 10, max 100." },
        compact:         { type: "boolean", description: "List mode only — return only ruleId + slug + invariant per entry." },
        withFollow:      { type: "boolean", description: "Get mode — auto-follow supersededBy + scopeMigratedTo (default true)." },
        withContext:     { type: "boolean", description: "Get mode — include crossRefs neighbors' invariants (default false)." },
        scope:           { type: "string", description: "List/search filter — global | plugin:<id> | project:<id>." },
        includeRetired:  { type: "boolean", description: "List/search filter — include retired rules (default false)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "pm_rule_audit",
    description:
      "Comprehensive health check. Detects T1/T2 bottleneck violations + stale crossRefs + stale hook citations + file-count drift vs MEMORY.md + recycled ruleIds + missing frontmatter. Returns findings with severity (advisory | warn | block).",
    inputSchema: {
      type: "object",
      properties: {
        includeAdvisory: { type: "boolean", description: "Include advisory-level findings (default true)." },
      },
      additionalProperties: false,
    },
  },
  // ─── E. Hook validation (1) ────────────────────────────────────────────────
  {
    name: "validate_managed_settings_fragments",
    description:
      "Audit .claude/managed-settings.d/*.json RBAC fragments against the plugin's current MCP tool surface. " +
      "Returns per-fragment drift and unknown JSON keys.",
    inputSchema: {
      type: "object",
      required: ["project"],
      properties: {
        project:       { type: "string" },
        expectedTools: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  // ─── F. Phase 3 read-path orchestrator (1) ────────────────────────────────
  // sprint-093 PR 3.1 (canonical plan v2 §4 row 3.1; proposal §8 Stage 4).
  // SHELL impl unifies impact + capability + lineage; placeholders for
  // applicationState (PR 3.2) / retrievalContext (PR 3.3) / risk + eval.
  {
    name: "ontology_context_query",
    description:
      "Phase 3 read-path orchestrator (sprint-093 PR 3.1). Unifies impact + capability + lineage projections " +
      "into a single read-only query consuming the Phase 2 substrate (10 indexers + impact_query upgrade). " +
      "Returns graphConfidence + missingEdges + recommendedAgentUse + requiredContracts + nonGoals. " +
      "ApplicationState/RetrievalContext/Risk/Eval projections are typed placeholders filled by subsequent Phase 3 PRs.",
    inputSchema: {
      type: "object",
      required: ["project"],
      properties: {
        project:             { type: "string", description: "Absolute project root." },
        promptId:            { type: "string" },
        promptHash:          { type: "string" },
        scopePaths:          { type: "array", items: { type: "string" }, description: "Narrowing file/directory paths." },
        requestedAxes:       { type: "array", items: { type: "string" }, description: "AIP axes filter (opaque RIDs)." },
        includeImpact:       { type: "boolean", description: "Default true." },
        includeLineage:      { type: "boolean", description: "Default true." },
        includeCapabilities: { type: "boolean", description: "Default true." },
        includeRisks:        { type: "boolean", description: "Default true." },
        includeEvals:        { type: "boolean", description: "Default true." },
        includeEvalRuns:     { type: "boolean", description: "Default false. Adds recent Convex evalRuns when Cloud is reachable and not in stub mode." },
        evalRunsProjectSlug: { type: "string", description: "Optional project slug for evalRuns filtering; defaults to the project path basename." },
        evalRunsLimit:       { type: "number", description: "Maximum recent evalRuns to include when includeEvalRuns=true. Default 20." },
        includeCurriculumContext: {
          type: "boolean",
          description: "Default false. Adds reference-only curriculum retrieval hints when generated v2 packs are present.",
        },
        curriculumQueryTerms: {
          type: "array",
          items: { type: "string" },
          description: "Optional terms to seed includeCurriculumContext retrieval.",
        },
        includeDTCContext:   { type: "boolean", description: "Default true. Includes DTC fill readiness diagnostics when prompt-linked DTC context is available." },
        fdeOntologyEngineeringSession: {
          type: "object",
          description: "Optional inline FDEOntologyEngineeringSession used to compose compact FDE build projection.",
        },
        fdeOntologyEngineeringSessionRef: {
          type: "string",
          description: "Optional fde-ontology-engineering://session/<id> ref or raw sessionId.",
        },
        projectsRoot:        { type: "string", description: "Optional root for workflow lineage discovery." },
      },
      additionalProperties: false,
    },
  },
];

const TOOL_CATEGORIES: Record<NonNullable<ToolSpec["category"]>, readonly string[]> = {
  "ontology-engineering": [
    "emit_event",
    "get_ontology",
    "ontology_schema_get",
    "impact_query",
    "pre_edit_impact",
    "apply_edit_function",
    "compute_edits_dry_run",
    "pm_ontology_engineering_workflow",
    "commit_edits",
  ],
  "harness-engineering": [
    "grade_semantic_intent_contract",
    "negotiate_sprint_contract",
    "grade_outcome_with_rubric",
    "pm_grader_dispatch",
  ],
  "lead-routing": [
    "pm_semantic_intent_gate",
    "pm_intent_router",
    "pm_lead_brief",
    "pm_health_audit",
    "pm_substrate_query",
    "research_context_select",
    // sprint-093 PR 3.1 (canonical plan v2 §4 row 3.1; Phase 3 entry point).
    "ontology_context_query",
  ],
  "validation-health": [
    "events_log_rotate",
    "research_library_refresh",
    "pm_plugin_self_check",
    "pm_workflow_response_validate",
    "pm_surface_contract_audit",
    "pm_aip_source_authority_validate",
    "pm_runtime_decision_parity",
    "pm_rule_query",
    "pm_rule_audit",
  ],
  "hook-validation": [
    "pm_pre_mutation_governance",
    "validate_managed_settings_fragments",
  ],
};

const HANDLER_MODULES: Record<string, string> = {
  // A. Ontology Engineering (8)
  emit_event:                          "./handlers/emit-event",
  get_ontology:                        "./handlers/get-ontology",
  ontology_schema_get:                 "./handlers/ontology-schema-get",
  impact_query:                        "./handlers/impact-query",
  pre_edit_impact:                     "./handlers/pre-edit-impact",
  pm_pre_mutation_governance:           "./handlers/pm-pre-mutation-governance",
  apply_edit_function:                 "./handlers/apply-edit-function",
  compute_edits_dry_run:               "./handlers/compute_edits_dry_run",
  pm_ontology_engineering_workflow:     "./handlers/pm-ontology-engineering-workflow",
  commit_edits:                        "./handlers/commit-edits",
  // B. Harness Engineering (4)
  grade_semantic_intent_contract:      "./handlers/grade-semantic-intent-contract",
  negotiate_sprint_contract:           "./handlers/negotiate-sprint-contract",
  grade_outcome_with_rubric:           "./handlers/grade-outcome-with-rubric",
  pm_grader_dispatch:                  "./handlers/pm-grader-dispatch",
  // C. Lead Routing (6)
  pm_semantic_intent_gate:              "./handlers/pm-semantic-intent-gate",
  pm_intent_router:                    "./handlers/pm-intent-router",
  pm_lead_brief:                       "./handlers/pm-lead-brief",
  pm_health_audit:                     "./handlers/pm-health-audit",
  pm_substrate_query:                  "./handlers/pm-substrate-query",
  research_context_select:             "./handlers/research-context-select",
  // D. Validation + Health
  events_log_rotate:                   "./handlers/events-log-rotate",
  research_library_refresh:            "./handlers/research-library-refresh",
  pm_plugin_self_check:                "./handlers/pm-plugin-self-check",
  pm_workflow_response_validate:        "./handlers/pm-workflow-response-validate",
  pm_surface_contract_audit:            "./handlers/pm-surface-contract-audit",
  pm_aip_source_authority_validate:      "./handlers/pm-aip-source-authority-validate",
  pm_runtime_decision_parity:            "./handlers/pm-runtime-decision-parity",
  pm_rule_query:                       "./handlers/pm-rule-query",
  pm_rule_audit:                       "./handlers/pm-rule-audit",
  // E. Hook validation (1)
  validate_managed_settings_fragments: "./handlers/validate-managed-settings-fragments",
  // F. Phase 3 read-path orchestrator (1) — sprint-093 PR 3.1 canonical handler.
  ontology_context_query:              "./handlers/ontology-context-query",
  // Internal / skill-only inventory. Not included in TOOLS or tools/list.
  // Legacy UniversalOntologyEntry / workflowTrace flow (pre-Phase 3); kept for
  // existing internal callers (pm-project-onboard skill, ontology-workflow trace).
  ontology_context_query_legacy:       "./handlers/ontology-context-query-legacy",
};

function categoryForTool(toolName: string): NonNullable<ToolSpec["category"]> {
  for (const [category, names] of Object.entries(TOOL_CATEGORIES)) {
    if (names.includes(toolName)) return category as NonNullable<ToolSpec["category"]>;
  }
  throw new Error(`missing ToolSpec category for ${toolName}`);
}

function handlerPathToOwnerModule(handlerPath: string): string {
  return handlerPath.replace(/^\.\//, "bridge/").replace(/$/, ".ts");
}

for (const tool of TOOLS) {
  tool.category = categoryForTool(tool.name);
  tool.audience = "public";
  tool.lifecycle ??= "public";
  tool.ownerModule = handlerPathToOwnerModule(HANDLER_MODULES[tool.name] ?? `./handlers/${tool.name}`);
  tool.stableSince = tool.name === "pm_semantic_intent_gate" ? "v5.1.0" : "v5.0.0";
  const capability = getMcpToolCapability(tool.name);
  if (capability === undefined) {
    throw new Error(`missing MCP tool capability metadata for ${tool.name}`);
  }
  tool.surface = capability.surface;
}

interface PublicToolSpec {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: unknown;
  readonly metadata: {
    readonly "palantir-mini": {
      readonly activeProfile: McpToolSurfaceProfile;
      readonly defaultProfile: typeof DEFAULT_MCP_TOOL_SURFACE_PROFILE;
      readonly surface: McpToolSurfaceMetadata;
    };
  };
}

function activeMcpToolSurfaceProfile(): McpToolSurfaceProfile {
  return resolveMcpToolSurfaceProfile(process.env[MCP_TOOL_SURFACE_PROFILE_ENV]);
}

function visibleToolsForProfile(profile: McpToolSurfaceProfile): readonly ToolSpec[] {
  return TOOLS.filter((tool) =>
    isMcpToolVisibleInProfile(getMcpToolCapability(tool.name), profile),
  );
}

function publicToolSpec(
  tool: ToolSpec,
  activeProfile: McpToolSurfaceProfile,
): PublicToolSpec {
  const capability = getMcpToolCapability(tool.name);
  if (capability === undefined) {
    throw new Error(`missing MCP tool capability metadata for ${tool.name}`);
  }
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    metadata: {
      "palantir-mini": {
        activeProfile,
        defaultProfile: DEFAULT_MCP_TOOL_SURFACE_PROFILE,
        surface: capability.surface,
      },
    },
  };
}

function hiddenToolMessage(
  toolName: string,
  profile: McpToolSurfaceProfile,
): string {
  return `tools/call: tool \`${toolName}\` is not visible in MCP profile \`${profile}\``;
}

// ─── MCP-first project evidence ────────────────────────────────────────────
//
// Codex records native MCP calls in its own session log, but the blocking
// pre-edit-impact-mcp-first hook reads the target project's append-only
// events.jsonl. This dispatch boundary is the only place that can distinguish a
// user/runtime MCP call from hook-internal direct handler imports.
type RuntimeIdentity = "claude-code" | "codex" | "gemini";

interface McpFirstEvidencePayload {
  phase: "design";
  passed: true;
  errorClass: "lead_mcp_first_compliance_passed";
  source: "mcp-server-tools-call";
  toolName: string;
  durationMs: number;
  rid?: string;
  query?: string;
  target?: string;
  filePath?: string;
  file_path?: string;
  project?: string;
  projectRoot?: string;
  proposedFiles?: string[];
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function stringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string =>
    typeof item === "string" && item.trim().length > 0
  );
  return strings.length > 0 ? strings : undefined;
}

function hostRuntimeIdentity(): RuntimeIdentity | undefined {
  const raw =
    process.env.PALANTIR_MINI_HOST_RUNTIME ??
    process.env.PALANTIR_MINI_RUNTIME ??
    process.env.CLAUDE_CODE_RUNTIME ??
    "";
  const normalized = raw.toLowerCase();
  if (normalized.includes("codex") || process.env.CODEX_SESSION_ID) return "codex";
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("claude") || process.env.CLAUDE_SESSION_ID) return "claude-code";
  return undefined;
}

function hostSessionId(): string | undefined {
  return process.env.CODEX_SESSION_ID ?? process.env.CLAUDE_SESSION_ID ?? process.env.GEMINI_SESSION_ID;
}

function projectRootForMcpFirstEvidence(args: Record<string, unknown>): string | undefined {
  return stringValue(args.project)
    ?? stringValue(args.projectRoot)
    ?? stringValue(args.cwd);
}

function payloadForMcpFirstEvidence(
  toolName: string,
  args: Record<string, unknown>,
  durationMs: number,
): McpFirstEvidencePayload {
  const rid = stringValue(args.rid);
  const query = stringValue(args.query);
  const filePath = stringValue(args.filePath);
  const file_path = stringValue(args.file_path);
  const target = stringValue(args.target);
  const proposedFiles = stringArrayValue(args.proposedFiles);
  const project = stringValue(args.project);
  const projectRoot = stringValue(args.projectRoot);

  return {
    phase: "design",
    passed: true,
    errorClass: "lead_mcp_first_compliance_passed",
    source: "mcp-server-tools-call",
    toolName,
    durationMs,
    ...(rid !== undefined ? { rid, query: rid } : {}),
    ...(query !== undefined ? { query } : {}),
    ...(filePath !== undefined ? { filePath } : {}),
    ...(file_path !== undefined ? { file_path } : {}),
    ...(target !== undefined ? { target } : {}),
    ...(proposedFiles !== undefined
      ? {
          proposedFiles,
          target: [target, ...proposedFiles]
            .filter((item): item is string => Boolean(item))
            .join("\n"),
        }
      : {}),
    ...(project !== undefined ? { project } : {}),
    ...(projectRoot !== undefined ? { projectRoot } : {}),
  };
}

export async function emitMcpFirstEvidenceForToolCall(
  toolName: string,
  args: unknown,
  durationMs: number,
): Promise<void> {
  if (!isMcpFirstEvidenceToolName(toolName)) return;

  const record = recordFrom(args);
  const projectRoot = projectRootForMcpFirstEvidence(record);
  if (projectRoot === undefined) return;

  const payload = payloadForMcpFirstEvidence(toolName, record, durationMs);
  const runtime = hostRuntimeIdentity();
  try {
    await emit({
      type: "validation_phase_completed",
      payload,
      toolName,
      cwd: projectRoot,
      sessionId: hostSessionId(),
      ...(runtime !== undefined ? { identity: runtime, runtime } : {}),
      surface: "mcp",
      memoryLayers: ["procedural", "episodic"],
      reasoning:
        `mcp-server: recorded ${toolName} tools/call as MCP-first evidence for ${projectRoot}. ` +
        "This evidence is emitted only at the MCP dispatch boundary, not from hook-internal handler imports.",
    });
  } catch {
    // Best-effort. Evidence emission must never break the MCP tool response.
  }
}

// ─── Handler dispatch — lazy dynamic import per tool call ──────────────────
async function loadHandler(toolName: string): Promise<(args: unknown) => Promise<unknown>> {
  const modulePath = HANDLER_MODULES[toolName];
  if (!modulePath) throw new Error(`unknown tool: ${toolName}`);
  const mod = await import(modulePath) as { default: (args: unknown) => Promise<unknown> };
  return mod.default;
}

// ─── Error helpers (JSON-RPC 2.0 error codes) ──────────────────────────────
const ERR = {
  PARSE:      -32700,
  INVALID:    -32600,
  METHOD_NA:  -32601,
  PARAMS:     -32602,
  INTERNAL:   -32603,
} as const;

function respondError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}

function respondSuccess(id: JsonRpcRequest["id"], result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

// ─── Method handlers ───────────────────────────────────────────────────────
async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  try {
    switch (req.method) {
      case "initialize": {
        return respondSuccess(req.id, {
          protocolVersion: "2024-11-05",
          capabilities:    { tools: {} },
          serverInfo:      { name: "palantir-mini", version: "1.0.0" },
        });
      }

      case "notifications/initialized": {
        // Notification — no response
        return null;
      }

      case "tools/list": {
        const profile = activeMcpToolSurfaceProfile();
        return respondSuccess(req.id, {
          profile,
          defaultProfile: DEFAULT_MCP_TOOL_SURFACE_PROFILE,
          profileEnvVar: MCP_TOOL_SURFACE_PROFILE_ENV,
          tools: visibleToolsForProfile(profile).map((tool) =>
            publicToolSpec(tool, profile),
          ),
        });
      }

      case "tools/call": {
        const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
        if (!params.name) return respondError(req.id, ERR.PARAMS, "tools/call: missing `name`");
        const toolName = params.name;
        const profile = activeMcpToolSurfaceProfile();
        const capability = getMcpToolCapability(toolName);
        if (!isMcpToolVisibleInProfile(capability, profile)) {
          return respondError(req.id, ERR.PARAMS, hiddenToolMessage(toolName, profile), {
            profile,
            defaultProfile: DEFAULT_MCP_TOOL_SURFACE_PROFILE,
            profileEnvVar: MCP_TOOL_SURFACE_PROFILE_ENV,
            toolName,
          });
        }
        const handler = await loadHandler(toolName);
        // v2.8.2 — Session 3 Slice 1 (B-15): handler latency instrumentation.
        // Best-effort telemetry around every dispatch — failure to emit MUST NOT
        // break the tool call. See lib/event-log/timing.ts for envelope shape.
        const startedAt = nowMs();
        try {
          const result = await handler(params.arguments ?? {});
          const durationMs = elapsedMs(startedAt);
          void emitToolInvocationCompleted({
            toolName,
            durationMs,
            success:    true,
          });
          await emitMcpFirstEvidenceForToolCall(toolName, params.arguments ?? {}, durationMs);
          return respondSuccess(req.id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            isError: false,
          });
        } catch (e) {
          void emitToolInvocationCompleted({
            toolName,
            durationMs: elapsedMs(startedAt),
            success:    false,
            errorClass: classifyError(e),
          });
          throw e;
        }
      }

      case "ping": {
        return respondSuccess(req.id, {});
      }

      default:
        return respondError(req.id, ERR.METHOD_NA, `method not found: ${req.method}`);
    }
  } catch (e) {
    return respondError(req.id, ERR.INTERNAL, (e as Error).message ?? String(e));
  }
}

// ─── stdio loop ────────────────────────────────────────────────────────────
function send(response: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(response) + "\n");
}

async function main(): Promise<void> {
  process.stderr.write(`[palantir-mini/mcp] ready — ${TOOLS.length} tools registered\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: undefined,
    terminal: false,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let req: JsonRpcRequest;
    try {
      req = JSON.parse(line) as JsonRpcRequest;
    } catch (e) {
      send(respondError(null, ERR.PARSE, `parse error: ${(e as Error).message}`));
      continue;
    }

    if (req.jsonrpc !== "2.0") {
      send(respondError(req.id ?? null, ERR.INVALID, "jsonrpc must be '2.0'"));
      continue;
    }

    const res = await handleRequest(req);
    if (res !== null) send(res);
  }
}

// Export for test harness
export { HANDLER_MODULES, TOOLS, handleRequest };
export type { JsonRpcRequest, JsonRpcResponse };

// Don't run main() if imported as a module
// bun detects direct execution via import.meta.main
if (import.meta.main) {
  void main();
}
// Silence unused imports in environments where EventType isn't referenced
void ({} as EventType | undefined);
