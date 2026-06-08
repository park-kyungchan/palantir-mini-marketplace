/**
 * palantir-mini SELF-ONTOLOGY — Learning as a registered ObjectType (Wave 2 build).
 * pm's cross-session LEARN store modeled AS ontology: a Learning records a decision with
 * typed evidence refs, the agentic memory layer it maps to, and what it refines (the
 * `lib/` pm-learn-query surface). Mirrors the `mcp-tool.objecttype.ts` idiom: ONE
 * `Learning` ObjectType (the type) is the deliverable here.
 *
 * Count provenance: this is a runtime-seeded ObjectType — concrete learnings are captured
 * per session (pm-learn) as BackwardProp evidence, not derived from a static source. The
 * TYPE registration plus the 9 session bottleneck-learnings seeded into
 * `LEARNING_INSTANCES` (user directive 2026-06-08 "bottleneck -> register in Ontology")
 * are the deliverable; the paired registration test asserts the type resolves and the 9
 * instances resolve + count + carry no duplicate ids (no filesystem drift guard — the seed
 * IS the authority; learnings append as the self-model accrues evidence).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (Learning, runtime-seeded)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology Learning ObjectType. */
export const LEARNING_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/learning",
);

/**
 * Learning modeled as a Palantir ObjectType. `learningId` is the stable primary key; the
 * stored-fact surface is the LEARN record — `decision`, `evidenceRefs`, `memoryLayer`
 * (working/episodic/semantic/procedural), and `refines` (process/tooling/understanding).
 * Concrete learnings are runtime-seeded (captured per session); the registered INSTANCES
 * below seed the first 9 session bottleneck-learnings as BackwardProp evidence.
 */
export const LEARNING_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: LEARNING_OBJECT_TYPE_RID,
  apiName: "Learning",
  name: "Learning",
  description:
    "palantir-mini cross-session LEARN record modeled as an ObjectType: decision + " +
    "evidenceRefs (session/PR refs) + memoryLayer (working/episodic/semantic/procedural) + " +
    "refines (process/tooling/understanding). Runtime-seeded — learnings are captured per " +
    "session (pm-learn) as BackwardProp evidence; the seed carries the first 8 session " +
    "bottleneck-learnings.",
  primaryKeyProperty: "learningId",
  titleProperty: "learningId",
  properties: [
    { name: "learningId", type: "string" },
    { name: "decision", type: "string" },
    { name: "evidenceRefs", type: "string" },
    { name: "memoryLayer", type: "string" },
    { name: "refines", type: "string" },
  ],
};

/** A registered Learning instance — stable identity plus the LEARN stored facts. */
export interface LearningInstance {
  readonly learningId: string;
  readonly decision: string;
  readonly evidenceRefs: string;
  readonly memoryLayer: string;
  readonly refines: string;
}

/**
 * Learning instances — the 9 session bottleneck-learnings registered as a BackwardProp
 * seed (user directive 2026-06-08 "bottleneck -> register in Ontology"). Each carries a
 * kebab-case `learningId` PK, a one-line `decision`, a session/PR `evidenceRefs` string,
 * the agentic `memoryLayer` (procedural|semantic), and what it `refines`
 * (process|tooling|understanding). The paired registration test asserts these 9 resolve,
 * count, and carry no duplicate ids; further learnings are captured per session (pm-learn)
 * and appended here as the self-model accrues BackwardProp evidence.
 */
export const LEARNING_INSTANCES: readonly LearningInstance[] = [
  {
    learningId: "gate-overblocks-readonly-lead-substring",
    decision:
      "enforcement-gate blocks read-only Lead Agent/Bash purely on prompt-substring match " +
      "(hooks/gate/router/workflow/skills/managed-settings), a false-positive; route via Workflow path",
    evidenceRefs: "session/2026-06-08",
    memoryLayer: "procedural",
    refines: "process",
  },
  {
    learningId: "keyword-density-write-gate-false-positive",
    decision:
      "the PreToolUse write gate fires on ontology-dense writes by keyword density not path; " +
      "mitigate with small chunked writes",
    evidenceRefs: "session/2026-06-08",
    memoryLayer: "procedural",
    refines: "tooling",
  },
  {
    learningId: "fde-readiness-evaluator-decoupled-from-signal",
    decision:
      "FDE readiness requirements flip only via per-requirement decision-card accept, not from " +
      "captured signal.mission/evidence content; free-text does not satisfy",
    evidenceRefs: "session/2026-06-08",
    memoryLayer: "semantic",
    refines: "understanding",
  },
  {
    learningId: "parallel-builders-diverge-on-shared-idiom",
    decision:
      "parallel builders given one idiom-spec diverge (register omission + export-name mismatch); " +
      "use verified-canonical-file-first-then-clone",
    evidenceRefs: "session/2026-06-08",
    memoryLayer: "procedural",
    refines: "process",
  },
  {
    learningId: "lsp-diagnostics-lag-git-ops",
    decision:
      "IDE/LSP diagnostics lag git checkout during ship and show stale errors; tsc EXIT code is " +
      "the authoritative ground truth",
    evidenceRefs: "session/2026-06-08",
    memoryLayer: "procedural",
    refines: "process",
  },
  {
    learningId: "verify-gate-must-assert-failcount",
    decision:
      "a verify gate must assert totalFail<=baseline explicitly; an agent GREEN verdict can be " +
      "scoped to its own work and miss a regression (PluginManifest version-pin)",
    evidenceRefs: "session/2026-06-08",
    memoryLayer: "procedural",
    refines: "process",
  },
  {
    learningId: "subagent-absolute-metrics-unreliable",
    decision:
      "a subagent reported 20-fail where Lead direct full-suite run showed 8; trust relative " +
      "conclusions but Lead-verify anomalous absolute metrics",
    evidenceRefs: "session/2026-06-08",
    memoryLayer: "procedural",
    refines: "process",
  },
  {
    learningId: "propagation-audit-cannot-see-self-ontology",
    decision:
      "propagation_audit_forward hard-codes <project>/ontology and cannot audit pm's " +
      "self-ontology at schemas-snapshot/ontology/self; fixed via self-subject fallback (Wave 7)",
    evidenceRefs: "dogfood Wave 6 + PR Wave 7",
    memoryLayer: "procedural",
    refines: "tooling",
  },
  {
    learningId: "fde-rubric-grader-zeroes-rule-domain-criteria",
    decision:
      "the FDE rubric-grader's criterion-prefix switch zeroed every rule-domain criterion, " +
      "under-scoring a genuinely-good ontology (~0.44 vs ~0.81); found by grading pm's OWN " +
      "self-Ontology (recursive dogfood) and fixed Wave 8",
    evidenceRefs: "dogfood Wave 7 + PR Wave 8",
    memoryLayer: "procedural",
    refines: "tooling",
  },
];

// Register the Learning ObjectType (the type). The 9 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(LEARNING_OBJECT_TYPE);
