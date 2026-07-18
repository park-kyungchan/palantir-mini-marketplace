// Gemini mechanism -> ControlPlaneNodeKind classification (ledger row A640,
// mirroring A630's Claude precedent): "No Gemini hook/skill/agent mechanism
// is treated as a semantic-decision or mutation-authority source; each is
// classified under ControlPlaneNodeKind." Pure mapping data, checked
// against src/control-plane/types.ts's registered ControlPlaneNodeKind
// vocabulary and against src/altitude1/staged-construction.ts's disjoint
// PrimitiveKind vocabulary — the same disjointness tests/control-plane/
// x-001.test.ts (P450) proves for the two vocabularies in the abstract;
// this module and mechanism-classification.test.ts prove it holds for this
// row's own concrete Gemini capability areas, not just abstractly.
//
// consumer-domain-ownership / ADR-001/ADR-003 (AGENT-CONTRACT.md §2/§4): a
// Gemini hook, skill, or custom-subagent mechanism is lifecycle-control
// metadata — how this plugin reaches the Gemini runtime — never a
// mutation-authority source, semantic decision, or product ObjectType/
// ActionType/Function/Interface. R210 records Gemini extension subagents as
// documented `preview` (`profiles.gemini.capabilities.subagents.facts.preview`
// === true) — a further reason this row must never promote the `subagents`
// mechanism into semantic/mutation authority. Do NOT reuse Gemini hooks/
// skills/subagents as semantic authority (this row's mission statement,
// mirroring A630's Claude wording verbatim); this module is the concrete,
// Gemini-row proof of that boundary. math-KG-excluded: this mapping carries
// only runtime-mechanism identifiers, no math-KG or other consumer-domain
// content.

import type { ControlPlaneNodeKind } from "../../control-plane/types";
import type { CapabilityArea } from "../shared";

/**
 * Which of Gemini's R210 capability areas correspond to a runtime
 * lifecycle-control mechanism this campaign must never promote to semantic/
 * mutation authority. Only the 3 areas this row's mission explicitly names
 * — `hooks`, `skillsCommands` (Gemini Agent Skills/commands), `subagents`
 * (Gemini's preview custom subagents) — map to a ControlPlaneNodeKind
 * mechanism bucket, the same 3 areas A630 mapped for Claude. Every other
 * capability area (e.g. `packagingManifest`, `mcpRegistration`,
 * `reloadInstall`, `schemaFlatLimits`, `configSurfaces`) has no hook/skill/
 * agent mechanism analog and maps to `undefined` — never guessed, never
 * upgraded.
 */
export const GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND: Readonly<Partial<Record<CapabilityArea, ControlPlaneNodeKind>>> = {
  hooks: "hook",
  skillsCommands: "skill",
  subagents: "agent",
};

/** Look up the ControlPlaneNodeKind a Gemini capability area's mechanism classifies under, or `undefined` if that area has no such mechanism. */
export function classifyGeminiMechanism(area: CapabilityArea): ControlPlaneNodeKind | undefined {
  return GEMINI_MECHANISM_TO_CONTROL_PLANE_KIND[area];
}
