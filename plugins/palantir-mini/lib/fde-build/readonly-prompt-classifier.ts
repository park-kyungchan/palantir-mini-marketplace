/**
 * palantir-mini lib/fde-build/readonly-prompt-classifier.ts
 *
 * Pure classifier: is this prompt a read-only FDE-intent prompt?
 * Single source of truth shared by two hooks:
 *   - hooks/prompt-fde-readiness-advisory.ts (emits fde-readiness advisory)
 *   - hooks/prompt-dtc-enforcement-gate.ts (skips contract_required when matches)
 *
 * HARD INVARIANT: this classifier never authorizes mutation. It only
 * classifies prompts as "likely read-only FDE design discussion" vs
 * "likely mutating implementation request". A FALSE result means
 * "uncertain — default to existing gate behavior".
 *
 * @owner palantir-mini:hook-builder
 * @sprint sprint-138 Slice 6
 */

export interface ClassifyPromptInput {
  readonly promptText: string;
}

export interface ReadOnlyFDEPromptClassification {
  readonly classifiedAs: "read-only-fde-intent" | "mutating" | "uncertain";
  readonly fdeKeywordsHit: readonly string[];
  readonly mutationVerbsHit: readonly string[];
  /** Confidence score 0-1; >0.6 = high-confidence read-only-fde-intent. */
  readonly confidence: number;
  readonly reasoning: string;
}

/**
 * 9-level FDE vocabulary (mission/object/link/action/function/chatbot/governance/eval/finalize)
 * + 17 criterion names from Slice 3 rubric + common FDE design phrasing.
 */
export const FDE_VOCABULARY_KEYWORDS: readonly string[] = [
  // FDEReviewLevel labels (slice 1)
  "mission-decision",
  "object-type",
  "link-type",
  "action-writeback",
  "function",
  "chatbot-studio",
  "ai-fde-mcp-boundary",
  "branch-release",
  "eval-observability",
  // Brief §10 17 criteria (snake_case as they appear in rubric)
  "mission_decision_alignment",
  "object_type_quality",
  "link_type_quality",
  "action_type_and_writeback_quality",
  "submission_criteria_quality",
  "function_contract_quality",
  "aip_chatbot_studio_configuration",
  "application_state_determinism",
  "retrieval_context_quality",
  "citation_and_evidence_quality",
  "ai_fde_branching_and_tool_governance",
  "palantir_mcp_omcp_boundary_control",
  "osdk_resource_scoping",
  "eval_coverage",
  "auditability_and_observability",
  "release_and_change_management",
  "post_rename_naming_compliance",
  // Common FDE design phrasing (case-insensitive matching below)
  "fde",
  "foundry",
  "aip",
  "ontology build",
  "ontology design",
  "ontology session",
  "operational decision",
  "decision owner",
  "evidence object",
  "submission criteria",
  "writeback path",
  "writeback dataset",
  "aip chatbot studio",
  "aip chatbot",
  "branch proposal",
  "readiness",
  "gap report",
  "scorecard",
];

/**
 * Mutation verb patterns that signal active implementation/mutation intent.
 * Source: lib/governance/policy-compiler.ts 24-tool read-only allowlist + common mutation verbs.
 */
export const MUTATION_VERB_PATTERNS: readonly RegExp[] = [
  /\bapply[\s_]?edit[\s_]?function\b/i,
  /\bcommit[\s_]?edits\b/i,
  /\bcompute[\s_]?edits[\s_]?dry[\s_]?run\b/i,
  /\bWrite\b.*\bfile\b/i,
  /\bEdit\b.*\bfile\b/i,
  /\bMultiEdit\b/i,
  /\bbash\s*:/i,
  /\b(implement|create|delete|modify|update|refactor|fix|add|remove)\b/i,
];

/** Read-only verb signals (downgrade mutation classification). */
export const READ_ONLY_VERB_PATTERNS: readonly RegExp[] = [
  /\b(explain|describe|document|review|analyze|audit|design|propose|brief|draft)\b/i,
  /\b(what|how|why|when|where|which)\b/i,
];

/**
 * Classify whether a prompt text represents a read-only FDE design discussion
 * or a mutating implementation request.
 *
 * Scoring rules:
 *   score = fdeKeywordsHit.length * 0.15
 *           - mutationVerbsHit.length * 0.3
 *           + readOnlyVerbHits * 0.1
 *   score clamped to [0, 1]
 *
 * classifiedAs rules:
 *   - fdeKeywordsHit >= 2 AND mutationVerbsHit === 0 AND readOnlyVerbHits >= 1
 *     → "read-only-fde-intent"
 *   - mutationVerbsHit >= 1 AND fdeKeywordsHit < 2
 *     → "mutating"
 *   - else → "uncertain"
 */
export function classifyReadOnlyFDEPrompt(
  input: ClassifyPromptInput,
): ReadOnlyFDEPromptClassification {
  const { promptText } = input;
  const lower = promptText.toLowerCase();

  // 1. Match FDE vocabulary keywords
  const fdeKeywordsHit: string[] = [];
  for (const kw of FDE_VOCABULARY_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      fdeKeywordsHit.push(kw);
    }
  }

  // 2. Match mutation verb patterns
  const mutationVerbsHit: string[] = [];
  for (const pattern of MUTATION_VERB_PATTERNS) {
    const match = promptText.match(pattern);
    if (match) {
      mutationVerbsHit.push(match[0]);
    }
  }

  // 3. Match read-only verb patterns
  let readOnlyVerbHits = 0;
  for (const pattern of READ_ONLY_VERB_PATTERNS) {
    if (pattern.test(promptText)) {
      readOnlyVerbHits++;
    }
  }

  // 4. Compute confidence score
  const raw =
    fdeKeywordsHit.length * 0.15 -
    mutationVerbsHit.length * 0.3 +
    readOnlyVerbHits * 0.1;
  const confidence = Math.min(1, Math.max(0, raw));

  // 5. Classify
  let classifiedAs: ReadOnlyFDEPromptClassification["classifiedAs"];
  if (
    fdeKeywordsHit.length >= 2 &&
    mutationVerbsHit.length === 0 &&
    readOnlyVerbHits >= 1
  ) {
    classifiedAs = "read-only-fde-intent";
  } else if (mutationVerbsHit.length >= 1 && fdeKeywordsHit.length < 2) {
    classifiedAs = "mutating";
  } else {
    classifiedAs = "uncertain";
  }

  const reasoning = [
    `FDE keywords matched: ${fdeKeywordsHit.length} (${fdeKeywordsHit.slice(0, 5).join(", ")}${fdeKeywordsHit.length > 5 ? "…" : ""})`,
    `Mutation verbs matched: ${mutationVerbsHit.length}${mutationVerbsHit.length > 0 ? ` (${mutationVerbsHit.slice(0, 3).join(", ")})` : ""}`,
    `Read-only verb hits: ${readOnlyVerbHits}`,
    `Confidence: ${confidence.toFixed(2)}`,
    `Classification: ${classifiedAs}`,
  ].join("; ");

  return {
    classifiedAs,
    fdeKeywordsHit,
    mutationVerbsHit,
    confidence,
    reasoning,
  };
}
