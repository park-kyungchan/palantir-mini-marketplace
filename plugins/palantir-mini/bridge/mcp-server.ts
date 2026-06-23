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
// events_log_rotate remains present as the canonical log-rotation control surface.

import * as readline from "readline";
import type { EventType } from "../lib/event-log/types";
import {
  boundedReturn,
  genericResultSummary,
  DEFAULT_BOUNDED_RETURN_MAX_BYTES,
} from "../lib/bounded-return";
import {
  resolveOverflowRoot,
  makeOverflowFileSink,
} from "../lib/bounded-return/overflow-file-sink";
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
import pkg from "../package.json";

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
      "Returns single-hop + transitive closure (depth 3). Call BEFORE any edit. " +
      "Impact RIDs are context selectors and do not prove ObjectType/LinkType/ActionType/Function mutation authority. " +
      "Canonical edge evidence is served from the live in-memory typed graph (canonicalLane='typed-graph'); typedGraphForward/typedGraphBackward carry native typed-graph edge kinds. The legacy forwardProp/backwardProp read the deferred SQLite persistence lane and are empty until uq-persist lands.",
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
      required: ["projectRoot", "toolName"],
      properties: {
        project: { type: "string", description: "Legacy alias for projectRoot. Direct/internal callers may pass this field; public MCP callers should use projectRoot." },
        projectRoot: { type: "string", description: "Canonical absolute project root. Required for public MCP calls." },
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
    name: "pm_ontology_engineering_workflow",
    description:
      "Public Ontology Engineering workflow state machine. Owns start -> turn -> draft_sic -> status " +
      "around the internal FDEOntologyEngineeringSession and returns runtime-neutral workflow state. " +
      "The `elevate` action drives the composed GOVERNED ingest -> lint -> draft_sic -> approve -> register " +
      "flow as ONE call: it registers ONLY when the caller explicitly supplies an approved SIC + DTC status " +
      "and readyForDigitalTwin; otherwise it returns awaiting-approval and registers nothing. " +
      "The `drift_rebind` action is the composed GOVERNED RESUME flow: it re-binds a PERSISTED minted approved " +
      "SIC + DTC to the CURRENT prompt envelope (copying the minted approvalRefs forward — never minting, never " +
      "bypassing), advances the envelope to digital_twin_approved, then drives the existing fail-closed " +
      "rebind_registered re-elevation in ONE call. The individual " +
      "mutating actions (register/ingest/lint) stay direct-caller and are NOT exposed here.",
    inputSchema: {
      type: "object",
      required: ["projectRoot", "action"],
      properties: {
        action: { type: "string", enum: ["start", "turn", "draft_sic", "approve_sic", "approve_technology_recommendation", "status", "elevate", "drift_rebind", "approve_source_mutation"] },
        project: { type: "string", description: "Legacy alias for projectRoot. Direct/internal callers may pass this field; public MCP callers should use projectRoot." },
        projectRoot: { type: "string", description: "Canonical absolute project root. Required for public MCP calls." },
        universalOntologyEntryRef: { type: "string" },
        universalOntologyEntryId: { type: "string" },
        sessionId: { type: "string" },
        fdeSessionRef: { type: "string" },
        ontologyContextQueryRef: { type: "string" },
        workflowTraceRef: { type: "string" },
        semanticIntentContractRef: { type: "string" },
        semanticIntentContract: { type: "object", description: "The user-confirmed, nine-axis-filled draft SIC to approve (action `approve_sic`); its fillSequence carries the per-axis source the Q2 user-confirmation gate enforces. Absent ⇒ approve_sic reconstructs from the session and is refused by the Q2 gate." },
        technologyRecommendation: { type: "object", description: "The proposed TechnologyRecommendation to approve (action `approve_technology_recommendation`, Q3). Absent ⇒ the handler rebuilds it from the current ContextEngineeringPlan (full V2 plan when an approved SIC + FDE session are present). On approval the plan's TECHNOLOGY decision flips open→approved with the minted approvalRef." },
        semanticIntentContractStatus: { type: "string", enum: ["draft", "approved", "superseded"] },
        digitalTwinChangeContractRef: { type: "string" },
        digitalTwinChangeContractStatus: { type: "string", enum: ["draft", "approved", "superseded"] },
        readyForDigitalTwin: { type: "boolean", description: "Caller-supplied readiness grade; with approved SIC+DTC statuses it authorizes the composed `elevate` flow's register step." },
        workContractRef: { type: "string" },
        sourceJsonlPath: { type: "string", description: "Absolute path to a frozen NC1 SOURCE jsonl; required for the `elevate` flow and the direct-caller `ingest` action." },
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
        userApprovalPromptId: { type: "string", description: "Improvement #2: front-door promptId of the captured user-approval turn; required for `approve_source_mutation`." },
        userApprovalPromptHash: { type: "string", description: "Improvement #2: sha256 of the captured approval prompt; verified against the hook-captured envelope." },
        userApprovalQuote: { type: "string", description: "Improvement #2: model's quote of the user's approval sentence; substring-verified against the verbatim promptExcerpt." },
        approvedSourcePaths: { type: "array", items: { type: "string" }, description: "Improvement #2: SCOPE — protected source paths/globs the user named; never empty / never wildcard-only." },
        frontDoorSessionId: { type: "string", description: "Improvement #2: front-door session id used to locate the captured envelope." },
        frontDoorRuntime: { type: "string", enum: ["claude", "codex", "cursor", "gemini", "unknown"], description: "Improvement #2: front-door runtime for the pointer freshness re-check." },
        rebindRids: { type: "array", items: { type: "string" }, description: "7.22.2: VERIFIED already-registered rids to re-elevate (direct-caller action `rebind_registered`). Fail-closed: intersected with the live getOntology snapshot; a rid not already-registered is rejected, never registered-new." },
        rebindProposalRef: { type: "string", description: "7.22.2: OPTIONAL audit pointer to the approved drift-proposal the rebindRids derive from. Provenance link only; authorization comes from the live-snapshot proof + the SIC/DTC gate." },
        promptId: { type: "string", description: "7.23.0 (`drift_rebind`): prompt-front-door promptId of the CURRENT captured envelope the persisted approved SIC+DTC are re-bound to. Used to locate the current envelope (else falls back to the current pointer)." },
        promptHash: { type: "string", description: "7.23.0 (`drift_rebind`): sha256 of the current captured prompt; continuity anchor the re-keyed contract records carry so the PreToolUse gate's contractContinuityMatches passes for the current prompt." },
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
  {
    name: "structured_output",
    description:
      "Structural anti-stall (rule 05 / O-1): validate a model-produced candidate against a " +
      "small bounded JSON Schema, returning EITHER a structured value OR a bounded fallback " +
      "text. Termination is a property of the machinery — a fixed finite path (pre-size gate " +
      "→ bounded validate-retry with a hard integer ceiling → guaranteed fallback) that cannot " +
      "loop. Oversized candidates are sunk to a file; never the ~1 MB validation-loop failure mode.",
    inputSchema: {
      type: "object",
      required: ["schema"],
      properties: {
        schema:       { type: "object", additionalProperties: true, description: "Small bounded JSON-Schema validation target." },
        candidate:    { type: "object", additionalProperties: true, description: "Model-produced value to validate." },
        maxBytes:     { type: "number", default: 16384, description: "Pre-size gate ceiling in bytes (default 16 KiB)." },
        maxRetries:   { type: "number", default: 2, description: "Hard integer retry ceiling for the bounded validate loop (default 2)." },
        overflowSink: { type: "string", enum: ["file"], default: "file", description: 'Sink kind for an oversized candidate — only "file".' },
        project:      { type: "string", description: "Optional project root — where the overflow sink file is written." },
      },
      additionalProperties: false,
    },
  },
  // ─── B. Harness Engineering ─────────────────────────────────────────────────
  // Phase H2 (2026-04-20) — 3-agent harness (Prithvi Rajasekaran + AIP Evals 5-evaluator)
  {
    name: "grade_outcome_with_rubric",
    description:
      "W3e-1 — runtime-neutral rubric outcome grader. Scores an artifact against a " +
      "GradingRubric (AIP Evals taxonomy). Deterministic domains (rule/hybrid/human) " +
      "scored in-process; code domain runs validationExpression as a shell command; " +
      "model domain delegates to pm_grader_dispatch (adapter-selected spawn). Emits " +
      "evaluator_strictness_probe per model criterion + grading_completed. Domains " +
      "simulator/visual are skipped (no neutral backend). Accepts inline `rubric` or a " +
      "registered `rubricId`.",
    inputSchema: {
      type: "object",
      required: ["artifactPath"],
      properties: {
        projectPath: { type: "string", description: "Absolute project path (defaults to CWD)." },
        rubricId: { type: "string", description: "Registered rubric id (GRADING_RUBRIC_REGISTRY)." },
        rubric: { type: "object", description: "Inline rubric { rubricId, criteria[] }.", additionalProperties: true },
        artifactPath: { type: "string", description: "The artifact/output being graded." },
        evidence: { type: "object", description: "Evidence bag for rule-domain checks.", additionalProperties: true },
        sprintNumber: { type: "number" },
        iteration: { type: "number" },
        loopId: { type: "string" },
      },
      additionalProperties: false,
    },
    category: "harness-engineering" as const,
  },
  {
    name: "pm_grader_dispatch",
    description:
      "W3e-1 — runtime-neutral model-grader dispatch. Dispatches ONE model-domain " +
      "criterion to a FRESH grader subprocess (eliminates self-grading bias). " +
      "The spawn (claude -p / codex exec) is the adapter binding selected via " +
      "PALANTIR_MINI_HOST_RUNTIME; effort routed by criterion tier. Never throws — " +
      "binary-unavailable / timeout / malformed output degrade to score=0.",
    inputSchema: {
      type: "object",
      required: ["criterionId", "scoringPrompt"],
      properties: {
        projectPath: { type: "string", description: "Absolute project path (defaults to CWD)." },
        criterionId: { type: "string" },
        scoringPrompt: { type: "string", description: "LLM-judge prompt (placeholders pre-resolved by caller)." },
        tier: { type: "string", enum: ["none", "low", "normal", "high", "critical"] },
        scale: { type: "string", enum: ["0-1", "0-10", "pass-fail"] },
        timeoutMs: { type: "number" },
      },
      additionalProperties: false,
    },
    category: "harness-engineering" as const,
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
        userApprovalPromptId:     { type: "string", description: "Improvement #3 (additive) — promptId of the captured user turn that approved the DTC build. Re-verified fail-closed vs the hook-captured PromptEnvelope; defaults to promptId when omitted." },
        userApprovalPromptHash:   { type: "string", description: "Improvement #3 (additive) — promptHash binding the DTC-build approval to the captured turn. Defaults to promptHash when omitted." },
        userApprovalQuote:        { type: "string", description: "Improvement #3 (additive) — verbatim quote of the user's DTC-build approval sentence; substring-verified against the captured envelope excerpt. When verified, authorizes dispatch in lieu of WorkContract+RouterBinding (never relaxes DTC validity or governance evidence)." },
        includeDrafts:            { type: "boolean" },
        draftMode:                { type: "string", enum: ["always", "required-only", "never"] },
        interactionMode:          { type: "string", enum: ["machine", "human_collaborative"] },
        userExpertise:            { type: "string", enum: ["non_programmer", "technical", "developer"] },
        preferredLanguage:        { type: "string", enum: ["ko", "en"] },
        turn:                     { type: "number", description: "Fill sequence turn index. For SIC, this records FDE/context-confirmed meaning into the contract boundary; raw prompt extraction remains draft-only." },
        turnUserInput:            { type: "string", description: "Free-text user answer for the current fill turn. Only meaningful when `turn` is provided." },
        turnNotApplicable:        { type: "boolean", description: "Mark the current nine-axis turn's axis not-applicable as the USER's explicit waiver (source = user). Only meaningful on the nine-axis-sic fill branch when `turn` is provided; ignored on the intent turn (T0)." },
        fillPolicy:               { type: "string", enum: ["default-8-turn", "fde-ontology-build", "dtc-turn-fill", "context-engineering-to-sic", "ontology-dtc-build", "nine-axis-sic"], description: "Fill sequence policy. Absent = the 9-axis understand-heart ('nine-axis-sic'), the W3d-2b default; pass 'default-8-turn' for the explicit legacy T0-T7 boundary fill. 'fde-ontology-build' surfaces meaning in the FDE session; 'context-engineering-to-sic' requires DATA/LOGIC/ACTION/GOVERNANCE readiness before SIC; DTC policies require approved SIC + FDE/context plan evidence before DTC approval." },
        semanticConsistencyResolverInput: { type: "object", description: "Optional deterministic semantic consistency resolver input. Resolves source-system terms without LLM promotion and projects resolver evidence into conversation/application state." },
        proposedAxisDraft:        { type: "object", description: "Optional Lead-proposed plain-language draft answer for the current nine-axis turn. Renders fillResult.turnCard's recommended 'confirm proposal' choice first so the user confirms/corrects rather than facing a blank box; recording it as the answer still needs an explicit user-confirmation turn." },
        nineAxisBatch:            { type: "object", additionalProperties: true, description: "BATCH-mode 9-axis fill (additive). Fill the intent turn and/or any subset of the 9 axes in ONE gate call via advanceNineAxisSicBatch, instead of N sequential `turn` calls. Shape: { intent?: string, data?/logic?/action?/governance?/context?/successEval?/constraintsNonGoals?/actors?/memoryPrior?: { answer?: string, notApplicable?: true } }. Engages only on the nine-axis-sic policy (absent fillPolicy = the default, or explicit 'nine-axis-sic'); a full batch reaches the same finalization as 10 per-turn calls. Absent ⇒ strict per-axis `turn` path unchanged." },
        responseView:             { type: "string", enum: ["turn", "readiness"], description: "Response shape: 'turn' (default, slim) or 'readiness' (full diagnostics inline)." },
      },
      required: ["project", "rawIntent"],
    },
  },
  {
    name: "pm_intent_router",
    description:
      "Sprint-063 W3.A — full intent-router. Subsumes delegate_or_direct + dispatch_route_decide + " +
      "dispatch_to_runtime. Enforces the Lead Intent -> Digital Twin contract gate before complex " +
      "ontology-affecting dispatch. Returns enriched recipe + prefetched " +
      "context using the current public impact, lineage, and health surfaces.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:        { type: "string", description: "Absolute project root." },
        intent:         { type: "string", description: "1-2 sentence task description." },
        scopePaths:     { type: "array",  items: { type: "string" } },
        complexityHint: { type: "string", enum: ["trivial", "single-file", "multi-file", "cross-cutting"] },
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
      "learn, agent-export, post-merge, and session-opener read paths. Mode dispatches with filter " +
      "passthrough. The `session-opener` mode (folds former pm_lead_brief) returns the 1-call " +
      "session brief: session context, recent sprint contracts, value-grade summary, recent T3+ " +
      "lineage, and a dispatch suggestion when `intent` is provided.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:   { type: "string" },
        mode:      {
          type: "string",
          enum: ["lineage", "workflow", "by-grade", "retro", "learn", "agent-export", "post-merge", "session-opener"],
        },
        filter:           { type: "object" },
        newMergeSha:      { type: "string", description: "For mode=post-merge: new merge commit SHA. Handler-required for post-merge calls." },
        previousMainSha:  { type: "string", description: "For mode=post-merge: previous main HEAD SHA. Optional; derived from newMergeSha^ when omitted." },
        includeLegacyRaw: { type: "boolean", description: "Forwarded to lineage, workflow, and retro modes. Ignored by post-merge." },
        agentName:        { type: "string" },
        intent:           { type: "string", description: "For mode=session-opener: 1-2 sentence task description; drives the dispatch suggestion." },
        skillName:        { type: "string", description: "For mode=session-opener: skill name recorded on the emitted skill_started event." },
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
          enum: ["public-mcp", "handler-inventory", "hooks", "skills", "project-skill-ontology", "agents", "managed-settings", "surface-contracts", "hook-seed", "release"],
          description: "Self-check mode. Defaults to release. `hook-seed` narrowly gates the hook self-Ontology seed drift axis alone (for per-edit/incremental callers).",
        },
        projectPath: { type: "string", description: "Optional project path for project-specific codegen header verification. If omitted, codegen check returns skipped." },
        agentName: { type: "string", description: "Optional caller name for 5-dim event envelope." },
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
      "Consolidated rule lookup. Preflight: provide exactly one discriminator from { byId, bySlug, byQuery }, " +
      "or omit all three for list mode. Returns mode-discriminated result: get | list | search. " +
      "Replaces pm_rule_get + pm_rule_list + pm_rule_search (retired v2.26.0).",
    inputSchema: {
      type: "object",
      properties: {
        byId:            { type: "number", description: "Get mode discriminator. Set only byId to fetch one rule by numeric ID; omit bySlug and byQuery." },
        bySlug:          { type: "string", description: "Get mode discriminator. Set only bySlug to fetch one rule by kebab slug; omit byId and byQuery." },
        byQuery:         { type: "string", description: "Search mode discriminator. Set only a non-empty byQuery to search invariants and bodies; omit byId and bySlug." },
        limit:           { type: "number", description: "Search/list result cap. Search default 10, max 100." },
        compact:         { type: "boolean", description: "List mode only. Omit byId, bySlug, and byQuery; return only ruleId + slug + invariant per entry." },
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
      "ApplicationState/RetrievalContext/Risk/Eval projections are typed placeholders filled by subsequent Phase 3 PRs. " +
      "Context Engineering axes and retrieval refs are not Ontology primitive declarations or mutation authority.",
    inputSchema: {
      type: "object",
      required: ["project"],
      properties: {
        project:             { type: "string", description: "Absolute project root." },
        promptId:            { type: "string" },
        promptHash:          { type: "string" },
        scopePaths:          { type: "array", items: { type: "string" }, description: "Narrowing file/directory paths." },
        requestedAxes:       { type: "array", items: { type: "string" }, description: "AIP/Context Engineering axis selectors (opaque RIDs), not ObjectType/LinkType/ActionType/Function declarations." },
        includeImpact:       { type: "boolean", description: "Default true." },
        includeLineage:      { type: "boolean", description: "Default true." },
        includeCapabilities: { type: "boolean", description: "Default true." },
        includeRisks:        { type: "boolean", description: "Default true." },
        includeEvals:        { type: "boolean", description: "Default true." },
        includeEvalRuns:     { type: "boolean", description: "Default false. Adds recent Convex evalRuns when Cloud is reachable and not in stub mode." },
        evalRunsProjectSlug: { type: "string", description: "Optional project slug for evalRuns filtering; defaults to the project path basename." },
        evalRunsLimit:       { type: "number", description: "Maximum recent evalRuns to include when includeEvalRuns=true. Default 20." },
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
    "pm_ontology_engineering_workflow",
    "commit_edits",
  ],
  "harness-engineering": [
    "grade_outcome_with_rubric",
    "pm_grader_dispatch",
  ],
  "lead-routing": [
    "pm_semantic_intent_gate",
    "pm_intent_router",
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
    "pm_rule_query",
    "pm_rule_audit",
    // O-1: structural anti-stall (validate-or-bounded-fallback, verify/recover).
    "structured_output",
  ],
  "hook-validation": [
    "pm_pre_mutation_governance",
  ],
};

const HANDLER_MODULES: Record<string, string> = {
  // A. Ontology Engineering (9)
  emit_event:                          "./handlers/emit-event",
  get_ontology:                        "./handlers/get-ontology",
  ontology_schema_get:                 "./handlers/ontology-schema-get",
  impact_query:                        "./handlers/impact-query",
  pre_edit_impact:                     "./handlers/pre-edit-impact",
  pm_pre_mutation_governance:           "./handlers/pm-pre-mutation-governance",
  apply_edit_function:                 "./handlers/apply-edit-function",
  pm_ontology_engineering_workflow:     "./handlers/pm-ontology-engineering-workflow",
  commit_edits:                        "./handlers/commit-edits",
  // B. Harness Engineering (2)
  grade_outcome_with_rubric:           "./handlers/grade-outcome-with-rubric",
  pm_grader_dispatch:                  "./handlers/pm-grader-dispatch",
  // C. Lead Routing (5)
  pm_semantic_intent_gate:              "./handlers/pm-semantic-intent-gate",
  pm_intent_router:                    "./handlers/pm-intent-router",
  pm_health_audit:                     "./handlers/pm-health-audit",
  pm_substrate_query:                  "./handlers/pm-substrate-query",
  research_context_select:             "./handlers/research-context-select",
  // D. Validation + Health
  events_log_rotate:                   "./handlers/events-log-rotate",
  research_library_refresh:            "./handlers/research-library-refresh",
  pm_plugin_self_check:                "./handlers/pm-plugin-self-check",
  pm_rule_query:                       "./handlers/pm-rule-query",
  pm_rule_audit:                       "./handlers/pm-rule-audit",
  // F. Phase 3 read-path orchestrator (1) — sprint-093 PR 3.1 canonical handler.
  ontology_context_query:              "./handlers/ontology-context-query",
  // G. Structured output (1) — O-1 structural anti-stall (rule 05).
  structured_output:                   "./handlers/structured-output",
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

// ─── Bounded tool-response gate (firehose cure — audit G1 / rule 05 §3) ──────
//
// EVERY tool/call success serializes its result THROUGH boundedToolResponseText.
// Under the byte ceiling the serialization is byte-identical to the historical
// `JSON.stringify(result, null, 2)` — ZERO behavior change on the common path. Over
// the ceiling the oversized full result is written to a file under the project's
// .palantir-mini/ (or a tmp dir) and only a small {summary, fullPath, bytes, digest}
// crosses the wire. The lib (lib/bounded-return) never touches fs; the concrete fs
// sink (resolveOverflowRoot + makeOverflowFileSink) is the injected wiring boundary —
// now lifted to lib/bounded-return/overflow-file-sink.ts so the pm_semantic_intent_gate
// handler shares ONE implementation with this seam (P1; signatures unchanged).

/**
 * Serialize a tool result for the MCP `text` content field, bounded by a byte ceiling.
 * Under the ceiling: returns the EXACT historical serialization (byte-identical). Over
 * the ceiling: sinks the full result to a file and returns a small pointer envelope.
 */
async function boundedToolResponseText(
  toolName: string,
  result: unknown,
  args: Record<string, unknown>,
): Promise<string> {
  const serialized = JSON.stringify(result, null, 2);
  // Parse the ceiling SAFELY: reject NaN / 0 / negative (a negative would force EVERY
  // response to overflow; '0' would too). Only a finite, strictly-positive value overrides.
  const parsed = Number(process.env.PALANTIR_MINI_MCP_MAX_RESPONSE_BYTES);
  const maxBytes =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BOUNDED_RETURN_MAX_BYTES;
  if (Buffer.byteLength(serialized, "utf8") <= maxBytes) {
    return serialized; // common path — unchanged, byte-identical to historical behavior.
  }
  const summary = genericResultSummary(result);
  try {
    const sink = makeOverflowFileSink(toolName, resolveOverflowRoot(args));
    // PASS `serialized` so the gate measures + persists + digests the SAME (indented) form
    // it measured for the ceiling decision — no compact-vs-indented discrepancy (leak fix).
    const bounded = await boundedReturn({ summary, full: result, serialized, maxBytes }, sink);
    if (bounded.bounded === false) {
      // Guard: should not happen now that the same `serialized` is gated — return inline.
      return serialized;
    }
    return JSON.stringify(
      {
        ok: true,
        tool: toolName,
        bounded: true,
        note:
          "response exceeded the MCP byte ceiling; full result written to fullPath — " +
          "re-read it for detail",
        summary: bounded.summary,
        fullPath: bounded.fullPath,
        bytes: bounded.bytes,
        digest: bounded.digest,
      },
      null,
      2,
    );
  } catch (e) {
    // FAIL SAFE: the sink/write failed. Never error the tool call, never emit the full
    // (oversized) payload inline — return summary + a truncated preview only.
    return JSON.stringify(
      {
        ok: true,
        tool: toolName,
        bounded: true,
        sinkError: String((e as Error)?.message ?? e),
        note:
          "full result exceeded the byte ceiling and could not be persisted to disk; " +
          "summary + truncated preview only",
        summary,
        bytes: Buffer.byteLength(serialized, "utf8"),
        preview: serialized.slice(0, maxBytes),
      },
      null,
      2,
    );
  }
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
          serverInfo:      { name: "palantir-mini", version: pkg.version },
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
            content: [
              {
                type: "text",
                text: await boundedToolResponseText(
                  toolName,
                  result,
                  (params.arguments ?? {}) as Record<string, unknown>,
                ),
              },
            ],
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
