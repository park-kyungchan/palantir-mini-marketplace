// Claude mechanism -> ControlPlaneNodeKind classification (ledger row A630,
// validation-contract item 2: "No Claude hook/skill/agent mechanism is
// treated as a semantic-decision or mutation-authority source; each is
// classified under ControlPlaneNodeKind"). Pure mapping data, checked
// against src/control-plane/types.ts's registered ControlPlaneNodeKind
// vocabulary and against src/altitude1/staged-construction.ts's disjoint
// PrimitiveKind vocabulary — the same disjointness tests/control-plane/
// x-001.test.ts (P450) proves for the two vocabularies in the abstract;
// this module and mechanism-classification.test.ts prove it holds for this
// row's own concrete Claude capability areas, not just abstractly.
//
// consumer-domain-ownership / ADR-001/ADR-003 (AGENT-CONTRACT.md §2/§4): a
// Claude hook, skill, or custom-agent mechanism is lifecycle-control
// metadata — how this plugin reaches the Claude runtime — never a
// mutation-authority source, semantic decision, or product ObjectType/
// ActionType/Function/Interface. Do NOT reuse Claude hooks/skills/agents as
// semantic authority (this row's mission statement, verbatim); this module
// is the concrete, Claude-row proof of that boundary. math-KG-excluded:
// this mapping carries only runtime-mechanism identifiers, no math-KG or
// other consumer-domain content.

import type { ControlPlaneNodeKind } from "../../control-plane/types";
import type { CapabilityArea } from "../shared";

/**
 * Which of Claude's R210 capability areas correspond to a runtime
 * lifecycle-control mechanism this campaign must never promote to semantic/
 * mutation authority. Only the 3 areas this row's mission explicitly names
 * — `hooks`, `skillsCommands` (Claude skills), `subagents` — map to a
 * ControlPlaneNodeKind mechanism bucket. Every other capability area (e.g.
 * `packagingManifest`, `mcpRegistration`, `reloadInstall`,
 * `schemaFlatLimits`, `configSurfaces`) has no hook/skill/agent mechanism
 * analog and maps to `undefined` — never guessed, never upgraded.
 */
export const CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND: Readonly<Partial<Record<CapabilityArea, ControlPlaneNodeKind>>> = {
  hooks: "hook",
  skillsCommands: "skill",
  subagents: "agent",
};

/** Look up the ControlPlaneNodeKind a Claude capability area's mechanism classifies under, or `undefined` if that area has no such mechanism. */
export function classifyClaudeMechanism(area: CapabilityArea): ControlPlaneNodeKind | undefined {
  return CLAUDE_MECHANISM_TO_CONTROL_PLANE_KIND[area];
}
