// Default operation profile (ledger row P440, A2-002).
//
// A2-002 ("A selective operational profile exposes only the capabilities
// needed for routine Ontology-first work and keeps construction or
// high-risk tools out of the default path"): `DEFAULT_OPERATION_PROFILE`
// pins the EXACT set of capability names `src/altitude2/index.ts` exports
// as the everyday operator surface. This is a direct structural fix for
// the legacy finding this task's mission text is written against
// (`outputs/w7-altitude2.md` A2-001/A2-002: the legacy `altitude-2` MCP
// profile inherited `studio-core`, including construction tools
// `pm_ontology_engineering_workflow`/`pm_semantic_intent_gate`/
// `pm_intent_router` and the grant-minting `pm_authorize_delivery`) — the
// successor's default profile is built the other way around: it is
// EXPLICITLY the closed list of routine capabilities this package's own
// `src/altitude2/index.ts` barrel exports, checked here against two named
// EXCLUSION lists (construction, authority-granting) so a future addition
// of either kind to the profile fails this file's own self-check loudly
// rather than silently.

export const DEFAULT_OPERATION_PROFILE_CAPABILITIES = [
  "bindConsumerOntology",
  "openReadOrQuery",
  "queryNamedResource",
  "searchOntology",
  "inspectImpact",
  "proposeOperation",
  "performDryRun",
  "runGovernanceCheck",
  "routeCommit",
  "appendOperationLineage",
] as const;

export type DefaultOperationProfileCapability = (typeof DEFAULT_OPERATION_PROFILE_CAPABILITIES)[number];

/**
 * `src/altitude1/`'s own exported construction-lane function names — the
 * exact capabilities A2-001/A2-002 require to be ABSENT from Altitude-2's
 * default profile (never re-exported from `src/altitude2/index.ts`, never
 * a member of `DEFAULT_OPERATION_PROFILE_CAPABILITIES`).
 */
export const EXCLUDED_CONSTRUCTION_CAPABILITIES = [
  "openFdeSession",
  "recordTurn",
  "transitionSession",
  "proposeSic",
  "approveSic",
  "proposeDtc",
  "finalizeDtc",
  "stageConstruction",
  "evaluateReadiness",
  "validateConstruction",
] as const;

/**
 * `src/governance/index.ts`'s raw authority-minting/writer-construction
 * primitives — the exact capabilities A2-002 requires to be ABSENT from
 * Altitude-2's default profile as STANDALONE names. `routeCommit` (present
 * in the default profile) calls the gate's `issueMutationAuthority`/
 * `resolveMutationAuthority` internally but is a session-state-gated
 * ROUTING call, never a bare exposed minting primitive — see
 * `commit-routing.ts`'s module doc.
 *
 * P460 v3 (decisions/pm2-gate-threat-model-escalation.md "User Ruling and
 * Lead Selection — Option 1+"): the barrel no longer exports bare
 * `issueMutationAuthority`/`resolveMutationAuthority` functions — it exports
 * the single frozen `PRODUCTION_COMMIT_GATE` object that bundles both. That
 * object is the raw authority-granting primitive now, and the one this list
 * must name.
 */
export const EXCLUDED_AUTHORITY_GRANTING_CAPABILITIES = ["PRODUCTION_COMMIT_GATE", "createMintLedger", "createFileWriteExecutor"] as const;

/** Is `name` a capability the default operation profile exposes? */
export function isCapabilityInDefaultProfile(name: string): boolean {
  return (DEFAULT_OPERATION_PROFILE_CAPABILITIES as readonly string[]).includes(name);
}

// Belt-and-suspenders self-check: the default profile and the two
// exclusion lists must never intersect. A future edit that accidentally
// added a construction or authority-granting name to
// DEFAULT_OPERATION_PROFILE_CAPABILITIES fails this module's import
// (loudly, at load time) rather than silently shipping a widened profile.
const PROFILE_SET = new Set<string>(DEFAULT_OPERATION_PROFILE_CAPABILITIES);
for (const name of [...EXCLUDED_CONSTRUCTION_CAPABILITIES, ...EXCLUDED_AUTHORITY_GRANTING_CAPABILITIES]) {
  if (PROFILE_SET.has(name)) {
    throw new Error(`operation-profile.ts: "${name}" is both in the default profile and a named-excluded construction/authority-granting capability`);
  }
}
