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
// sprint-063 W4.D: TOOLS array reduced from 75 → 33 entries (plan §2 retain list).
// Removed 42 entries; added 4 NEW: pm_intent_router, pm_lead_brief, pm_health_audit, pm_substrate_query.
// Lead Intent -> Digital Twin raises the surface to 34 by adding pm_semantic_intent_gate.
// Palantir official SSoT refresh raises the surface to 36 with research_context_select
// and research_library_refresh.
// sprint-077 PR-14a: TOOLS array reduced from 36 → 22 entries.
// Removed 14 deprecated-candidate tools (see bridge/handlers/_deprecation-map.ts for replacement paths).
// sprint-124 PR 5.13: +1 NEW grade_semantic_intent_contract → 23 tools.

import * as readline from "readline";
import type { EventType } from "../lib/event-log/types";
import {
  classifyError,
  elapsedMs,
  emitToolInvocationCompleted,
  now as nowMs,
} from "../lib/event-log/timing";
import { PROMPT_RUNTIMES } from "../lib/prompt-front-door";

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
        evidenceDir:   { type: "string", description: "Optional evidence bundle path (from run_playwright_scenario)." },
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
        sprintNumber:        { type: "number", description: "Optional sprint context for replay_lineage." },
        iteration:           { type: "number", description: "Optional iteration context for replay_lineage." },
      },
      additionalProperties: false,
    },
  },
  // ─── C. Lead Routing — NEW (5) — sprint-063 W3.A/W3.B/W4.A/W4.B + Lead Intent gate
  {
    name: "pm_semantic_intent_gate",
    description:
      "Lead Intent -> Digital Twin contract gate. Drafts ambient SemanticIntentContract + " +
      "DigitalTwinChangeContract evidence for every prompt and validates approved refs before " +
      "pm_intent_router dispatches ontology-affecting execution.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        project:                  { type: "string", description: "Absolute project root." },
        rawIntent:                { type: "string", description: "User-authored or Lead-captured intent before implementation." },
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
        turn:                     { type: "number", description: "8-turn fill sequence turn index (0-7). When provided, applies one fill step. Omit for single-shot SIC creation (backward compat)." },
        turnUserInput:            { type: "string", description: "Free-text user answer for the current fill turn. Only meaningful when `turn` is provided." },
        fillPolicy:               { type: "string", enum: ["default-8-turn", "fde-ontology-build", "dtc-turn-fill", "context-engineering-to-sic", "ontology-dtc-build"], description: "Fill sequence policy. Absent = legacy T0-T7 EIGHT_TURN_FILL_SEQUENCE (default). 'fde-ontology-build' = FDE 9-step sequence; 'dtc-turn-fill' = DTC 7-turn boundary authoring sequence; 'context-engineering-to-sic' requires DATA/LOGIC/ACTION/GOVERNANCE readiness before SIC; 'ontology-dtc-build' requires Object/Link/Action/Function/ApplicationState readiness before DTC." },
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
      "context (impact_query top-RID + pm_workflow_lineage_query 7d + pm_value_grade_metrics summary).",
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
      "Sprint-063 W3.B — 1-call session-opener. Subsumes pm_preamble + session_resume + wake_session + " +
      "query_session_duration. Returns session ctx + last 5 sprint contracts + value-grade metrics + " +
      "recent T3+ lineage + dispatch suggestion (when intent provided).",
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
      "Sprint-063 W4.A — mode-dispatched health audit merger. Subsumes pm_handler_usage_audit + " +
      "pm_harness_base_mode_audit + pm_harness_component_audit + pm_harness_outcome_replay + " +
      "pm_outcome_pair_audit + pm_memory_layer_audit + pm_research_citation_validate + " +
      "audit_events_5d_conformance + pm_harness_strictness_audit + doc-drift consolidation. " +
      "Mode `all` runs every sub-audit sequentially.",
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
      "Sprint-063 W4.B — 6-handler mode-dispatched merger. Subsumes replay_lineage + " +
      "pm_workflow_lineage_query + pm_event_query_by_grade + pm_retro_query + pm_learn_query + " +
      "pm_agent_lineage_export. Mode dispatches to delegated handler with filter passthrough.",
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
  // ─── D. Validation + Health (4) ────────────────────────────────────────────
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
      "Validate user-visible palantir-mini workflow response text against the plugin-owned mandatory response template. " +
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
        projectsRoot:        { type: "string", description: "Optional root for lineage discovery (forwarded to pm_workflow_lineage_query)." },
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
  // D. Validation + Health (4)
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
}

function publicToolSpec(tool: ToolSpec): Pick<ToolSpec, "name" | "description" | "inputSchema"> {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
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
        return respondSuccess(req.id, { tools: TOOLS.map(publicToolSpec) });
      }

      case "tools/call": {
        const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
        if (!params.name) return respondError(req.id, ERR.PARAMS, "tools/call: missing `name`");
        const toolName = params.name;
        const handler = await loadHandler(toolName);
        // v2.8.2 — Session 3 Slice 1 (B-15): handler latency instrumentation.
        // Best-effort telemetry around every dispatch — failure to emit MUST NOT
        // break the tool call. See lib/event-log/timing.ts for envelope shape.
        const startedAt = nowMs();
        try {
          const result = await handler(params.arguments ?? {});
          void emitToolInvocationCompleted({
            toolName,
            durationMs: elapsedMs(startedAt),
            success:    true,
          });
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
