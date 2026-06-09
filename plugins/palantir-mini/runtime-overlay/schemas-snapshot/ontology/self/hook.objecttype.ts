/**
 * palantir-mini SELF-ONTOLOGY — Hook as a registered ObjectType + its 47 instances
 * (Wave 1 self-model build). pm's lifecycle-hook surface modeled AS ontology: each
 * hook is a gate / automation / audit-writer node fired at a runtime lifecycle event.
 *
 * This file declares ONE `Hook` ObjectType (the type) and seeds the 47 hook identities
 * as instances — the snapshot OWNS the seed (it is the authority), so it does NOT import
 * the hooks layer uphill. The paired registration test cross-checks these 47 names
 * against the LIVE `hooks/*.ts` filesystem AND the wired set in `hooks/hooks.json`, so
 * the self-model fails loud if pm's hook surface drifts (a hook added/removed, or the
 * wired/orphan split changes, without updating this seed).
 *
 * Wired vs orphan (LIVE-verified): the hooks/ dir holds EXACTLY 47 hook files; 45 are
 * wired into a lifecycle event in `hooks/hooks.json` (`orphanInRegistry: false`) and 2
 * are present-but-unwired (`orphanInRegistry: true`). Wired hooks fire via either a
 * direct `hooks/<id>.ts` command, the `scripts/run.ts <id>` dispatcher, or membership in
 * an in-process aggregator (the four emit_event consumers — outcome-pair-tracker,
 * memory-layer-validator, t3-circuit-feeder, t4-canonical-emit-watch — fire via the
 * `emit-event-postdispatch` aggregator, which is the wired hooks.json entry). Orphans
 * carry an inferred lifecycle event from their source header (best-effort metadata — the
 * load-bearing facts are hookId identity + the orphanInRegistry filesystem fact).
 * Per-hook policy / blocking descriptor metadata is the runtime concern of the hooks
 * themselves; this self-model carries the stable hook IDENTITY + wiring axes only.
 *
 * @owner palantirkc-ontology
 * @purpose Wave 1 self-Ontology ObjectType — pm's hook surface as typed instances
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology Hook ObjectType. */
export const HOOK_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/hook",
);

/**
 * Hook modeled as a Palantir ObjectType. `hookId` is the stable primary key (the hook
 * file basename); `lifecycleEvent` and `orphanInRegistry` are the wiring axes the
 * registration test verifies against the live filesystem + hooks.json. `blocking` and
 * `policyRef` are optional descriptor properties (runtime concern), not seeded here.
 */
export const HOOK_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: HOOK_OBJECT_TYPE_RID,
  apiName: "Hook",
  name: "Hook",
  description:
    "palantir-mini lifecycle hook surface modeled as an ObjectType: one instance per " +
    "hook file (a gate / automation / audit-writer node). hookId is identity; " +
    "lifecycleEvent + orphanInRegistry are the wiring axes cross-checked against the " +
    "live hooks/ dir and hooks/hooks.json. blocking + policyRef are runtime descriptors.",
  primaryKeyProperty: "hookId",
  titleProperty: "hookId",
  properties: [
    { name: "hookId", type: "string" },
    { name: "lifecycleEvent", type: "string", optional: true },
    { name: "blocking", type: "boolean", optional: true },
    { name: "orphanInRegistry", type: "boolean", optional: true },
    { name: "policyRef", type: "string", optional: true },
  ],
};

/** A registered Hook instance — stable hook identity + its wiring axes. */
export interface HookInstance {
  readonly hookId: string;
  readonly lifecycleEvent: string;
  readonly orphanInRegistry: boolean;
}

/**
 * The 47 Hook instances — pm's LIVE hooks/ surface (45 wired + 2 orphan), sorted by
 * hookId. Snapshot-owned seed (no hooks-layer import); the registration test cross-checks
 * this set against the live `hooks/*.ts` files AND the wired set in `hooks/hooks.json`,
 * failing loud on any drift in the hook surface or the wired/orphan split.
 */
export const HOOK_INSTANCES: readonly HookInstance[] = [
  { hookId: "agent-ownership-validate", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "bypass-budget-monitor", lifecycleEvent: "Stop", orphanInRegistry: false },
  { hookId: "context-capsule-init", lifecycleEvent: "UserPromptSubmit", orphanInRegistry: false },
  { hookId: "doc-edit-drift", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "emit-event-postdispatch", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "events-5d-gate", lifecycleEvent: "PreCompact", orphanInRegistry: false },
  { hookId: "generated-header-check", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "heartbeat-validate", lifecycleEvent: "SubagentStop", orphanInRegistry: false },
  { hookId: "impact-graph-bulk-refresh", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "impact-graph-cascade-delete", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "impact-graph-maintain", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "impact-graph-session-end-flush", lifecycleEvent: "Stop", orphanInRegistry: false },
  { hookId: "lead-ontology-discovery-completeness", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "manifest-validate", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "memory-layer-validator", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "ontology-domain-classification-validate", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "ontology-engineering-workflow-enforcement-gate", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "ontology-import-guard", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "orphan-pair-watchdog", lifecycleEvent: "PreCompact", orphanInRegistry: false },
  { hookId: "outcome-pair-tracker", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "post-compact", lifecycleEvent: "PostCompact", orphanInRegistry: false },
  { hookId: "post-edit-propagate", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "post-edit-verifier-suggest", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "post-merge-cleanup", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "pre-compact-state", lifecycleEvent: "PreCompact", orphanInRegistry: false },
  { hookId: "pre-edit-impact-check", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "pre-edit-impact-mcp-first", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "pre-edit-ontology", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "pre-pr-dirty-gate", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "prompt-dtc-enforcement-gate", lifecycleEvent: "PreToolUse", orphanInRegistry: true },
  { hookId: "prompt-fde-readiness-advisory", lifecycleEvent: "UserPromptSubmit", orphanInRegistry: true },
  { hookId: "prompt-front-door-capture", lifecycleEvent: "UserPromptSubmit", orphanInRegistry: false },
  { hookId: "researcher-citation-precision", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "rule-audit", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "semantic-frontmatter-validate", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "session-end-cleanup", lifecycleEvent: "Stop", orphanInRegistry: false },
  { hookId: "session-start", lifecycleEvent: "SessionStart", orphanInRegistry: false },
  { hookId: "stop-validate", lifecycleEvent: "Stop", orphanInRegistry: false },
  { hookId: "subagent-start", lifecycleEvent: "SubagentStart", orphanInRegistry: false },
  { hookId: "subagent-stop", lifecycleEvent: "SubagentStop", orphanInRegistry: false },
  { hookId: "t3-circuit-feeder", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "t4-canonical-emit-watch", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "t4-promotion-trigger", lifecycleEvent: "Stop", orphanInRegistry: false },
  { hookId: "task-completed-enrichment", lifecycleEvent: "PostToolUse", orphanInRegistry: false },
  { hookId: "value-grade-assigner", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
  { hookId: "workflow-trace-leak-detect", lifecycleEvent: "PreCompact", orphanInRegistry: false },
  { hookId: "write-scope-runtime-enforce", lifecycleEvent: "PreToolUse", orphanInRegistry: false },
];

// Register the Hook ObjectType (the type). The 47 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(HOOK_OBJECT_TYPE);
