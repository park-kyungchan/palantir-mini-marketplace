// palantir-mini sprint-061 B.W1 — Convex schema for impact-graph
// Replaces lib/impact-graph/sqlite-cache.ts as the impact-graph backend.
// Single deployment serves all 5 projects (root + palantir-math + mathcrew + kosmos + hyperframes)
// via projectRoot partition key.
//
// Per operating model §4.5.6a.1.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Per-project partition; same deployment serves all 5 projects
  impactEdges: defineTable({
    projectRoot: v.string(),   // partition key: "/home/palantirkc/projects/mathcrew"
    fromRid:     v.string(),   // "file:src/foo.ts" | "ontology:object-type/Person" | "gen:..."
    toRid:       v.string(),
    edgeKind:    v.union(
      v.literal("forwardProp"),
      v.literal("backwardProp"),
      v.literal("codegen"),
      v.literal("import"),
      v.literal("semantic"),
      v.literal("test-covers"),
      v.literal("doc-references"),
      // Additional kinds from existing AstEdgeKind type
      v.literal("export"),
      v.literal("typeRef"),
      v.literal("extends"),
      v.literal("implements"),
    ),
    confidence:  v.number(),   // 1.0 = TypeChecker-resolved; 0.7 = name-heuristic; 0.3 = ambiguous
    evidence:    v.optional(v.string()),
    registeredAt: v.string(),  // ISO8601
    verifiedAt:   v.optional(v.string()),
  })
    .index("by_project_from", ["projectRoot", "fromRid"])
    .index("by_project_to",   ["projectRoot", "toRid"])
    .index("by_project_kind", ["projectRoot", "edgeKind"]),

  // File-level metadata for hash-gating + dirty-tracking
  fileState: defineTable({
    projectRoot:    v.string(),
    filePath:       v.string(),
    contentHash:    v.string(),   // sha256 of last-walked content
    lastWalkedAt:   v.string(),   // ISO8601
    lastWalkedTsConfig: v.string(), // tsconfig path used for this walk
    edgeCount:      v.number(),
    walkDurationMs: v.number(),
  }).index("by_project_path", ["projectRoot", "filePath"]),

  // Mutation log for replay/audit
  graphMutations: defineTable({
    projectRoot: v.string(),
    operation:   v.union(
      v.literal("add"),
      v.literal("modify"),
      v.literal("delete"),
      v.literal("rename"),
      v.literal("bulk"),
    ),
    affectedRids: v.array(v.string()),
    addedCount:   v.number(),
    deletedCount: v.number(),
    triggeredBy:  v.string(),   // hook name
    occurredAt:   v.string(),
  }).index("by_project_when", ["projectRoot", "occurredAt"]),

  // sprint-062 W2-β: decisionEvents — T3+/T4 mirror for closed-loop apply_refinement_target
  // Mirrors events.jsonl rows where valueGrade >= T3, enabling fast indexed query without
  // scanning the append-only log. Enables D2-canonical convergence counting (rule 26 §D2).
  //
  // sprint-101 PR 4.1b: extended from 7 to 18 fields per BackPropValueIndex primitive
  // (schemas v1.64.0). All 11 new fields are optional — additive / backward-compat.
  // Matches BackPropValueIndexEntry interface (18 join keys for rule 26 §5-Axes coverage).
  decisionEvents: defineTable({
    // --- original 7 fields (sprint-062 W2-β) ---
    projectRoot:           v.string(),
    sequence:              v.number(),      // monotonic seq from events.jsonl
    eventType:             v.string(),      // "validation_phase_completed" | "grading_completed" | etc.
    valueGrade:            v.union(
      v.literal("T0"),
      v.literal("T1"),
      v.literal("T2"),
      v.literal("T3"),
      v.literal("T4"),
    ),
    actionRid:             v.optional(v.string()),  // lineageRefs.actionRid if present
    refinementTargetKind:  v.optional(v.string()),  // RefinementTarget.kind
    refinementTargetRid:   v.optional(v.string()),  // RefinementTarget.filePathOrRid
    byWhomIdentity:        v.string(),      // byWhom.identity (e.g. "claude-code/procedural-skill")
    when:                  v.string(),      // ISO8601 from original envelope
    raw:                   v.string(),      // full envelope JSON for replay + BackProp
    // --- 11 new fields (sprint-101 PR 4.1b — BackPropValueIndex 18-key extension) ---
    eventId:               v.optional(v.string()),  // unique event identifier (5-dim envelope.eventId)
    promptId:              v.optional(v.string()),  // prompt-to-DTC tracing
    promptHash:            v.optional(v.string()),  // SHA256:16 of prompt text
    sessionId:             v.optional(v.string()),  // byWhom.sessionId or CLAUDE_CODE_SESSION_ID
    runtime:               v.optional(v.string()),  // "claude"|"codex"|"gemini"|"cursor"|"unknown"
    semanticIntentContractRef:    v.optional(v.string()),  // SemanticIntentContract RID
    digitalTwinChangeContractRef: v.optional(v.string()),  // DigitalTwinChangeContract RID
    sprintContractRef:     v.optional(v.string()),  // SprintContract RID
    correlationId:         v.optional(v.string()),  // cross-agent correlation
    agentId:               v.optional(v.string()),  // byWhom.agent
    toolName:              v.optional(v.string()),  // throughWhich.tool
    commitSha:             v.optional(v.string()),  // atopWhich (git SHA)
    branchName:            v.optional(v.string()),  // git branch name
    pullRequestNumber:     v.optional(v.number()),  // GitHub PR number
    evalSuiteId:           v.optional(v.string()),  // AIP Evals suite ID
    evalRunId:             v.optional(v.string()),  // AIP Evals run ID
    affectedRid:           v.optional(v.string()),  // ontology RID for impact-graph join
    refinementTarget:      v.optional(v.string()),  // RefinementTarget.kind (rule 26 §C2)
  })
    .index("by_project_grade",    ["projectRoot", "valueGrade"])
    .index("by_project_actionRid", ["projectRoot", "actionRid"])
    .index("by_project_when",      ["projectRoot", "when"]),
  // sprint-114 PR 5.4a: AIP Evals Convex mirror tables
  evalSuites: defineTable({
    suiteId:       v.string(),
    suiteName:     v.string(),
    criterionRids: v.array(v.string()),
    createdAt:     v.number(),
    projectSlug:   v.string(),
  }).index("by_project_suite", ["projectSlug", "suiteId"]),

  evalRuns: defineTable({
    runId:             v.string(),
    suiteId:           v.string(),
    targetArtifactRef: v.string(),
    scoreOverall:      v.number(),
    scoreCriteria:     v.any(),
    verdict:           v.union(v.literal("pass"), v.literal("revise"), v.literal("reject")),
    ranAt:             v.number(),
    runner:            v.string(),
  })
    .index("by_suite_ran",     ["suiteId", "ranAt"])
    .index("by_suite_verdict", ["suiteId", "verdict"]),

});
