// Codex mechanism -> ControlPlaneNodeKind classification (ledger row A620,
// backported post-A640 per Lead ruling `decisions/w6-parity-backport-
// adjudication.md`, mirroring A630's Claude precedent and A640's Gemini
// mirror): "No Codex hook/skill/agent mechanism is treated as a semantic-
// decision or mutation-authority source; each is classified under
// ControlPlaneNodeKind." Pure mapping data, checked against
// src/control-plane/types.ts's registered ControlPlaneNodeKind vocabulary
// and against src/altitude1/staged-construction.ts's disjoint PrimitiveKind
// vocabulary — the same disjointness tests/control-plane/x-001.test.ts
// (P450) proves for the two vocabularies in the abstract; this module and
// mechanism-classification.test.ts prove it holds for this row's own
// concrete Codex capability areas, not just abstractly.
//
// consumer-domain-ownership / ADR-001/ADR-003 (AGENT-CONTRACT.md §2/§4): a
// Codex lifecycle hook (config.toml `[[hooks]]`), Codex skill, or Codex
// standalone custom-agent mechanism is lifecycle-control metadata — how
// this plugin reaches the Codex runtime — never a mutation-authority
// source, semantic decision, or product ObjectType/ActionType/Function/
// Interface. Codex's other native control surfaces this row's mission does
// NOT name a mechanism mapping for — AGENTS.md project instructions,
// approvals/sandbox policy, `config.toml`/`~/.codex/config.toml` settings,
// and registered MCP servers — are exactly the 5 `CapabilityArea` entries
// this module maps to `undefined` below (`packagingManifest`,
// `mcpRegistration`, `reloadInstall`, `schemaFlatLimits`,
// `configSurfaces`): none of them is a hook/skill/agent lifecycle-control
// mechanism in Codex's own capability model
// (`CODEX_BINDING.manifest.capabilities`), so none is guessed into one. Do
// not reuse Codex hooks/skills/agents as semantic authority (this row's
// mission statement, mirroring A630's Claude wording and A640's Gemini
// wording verbatim); this module is the concrete, Codex-row proof of that
// boundary. math-KG-excluded: this mapping carries only runtime-mechanism
// identifiers, no math-KG or other consumer-domain content.

import type { ControlPlaneNodeKind } from "../../control-plane/types";
import type { CapabilityArea } from "../shared";

/**
 * Which of Codex's R210 capability areas correspond to a runtime
 * lifecycle-control mechanism this campaign must never promote to semantic/
 * mutation authority. Only the 3 areas this row's mission explicitly names
 * — `hooks` (Codex's config.toml lifecycle hooks), `skillsCommands`
 * (Codex skills), `subagents` (Codex's standalone custom agents; R210
 * records `pluginBundled` as `unknown` — still classified below regardless
 * of maturity, the same posture A640 held for Gemini's `preview` subagents)
 * — map to a ControlPlaneNodeKind mechanism bucket, the same 3 areas A630
 * mapped for Claude and A640 mapped for Gemini. Every other capability area
 * (`packagingManifest`, `mcpRegistration` — Codex's registered MCP servers
 * — `reloadInstall`, `schemaFlatLimits`, `configSurfaces` — Codex's
 * AGENTS.md/config.toml/approvals-sandbox surfaces) has no hook/skill/agent
 * mechanism analog and maps to `undefined` — never guessed, never
 * upgraded.
 */
export const CODEX_MECHANISM_TO_CONTROL_PLANE_KIND: Readonly<Partial<Record<CapabilityArea, ControlPlaneNodeKind>>> = {
  hooks: "hook",
  skillsCommands: "skill",
  subagents: "agent",
};

/** Look up the ControlPlaneNodeKind a Codex capability area's mechanism classifies under, or `undefined` if that area has no such mechanism. */
export function classifyCodexMechanism(area: CapabilityArea): ControlPlaneNodeKind | undefined {
  return CODEX_MECHANISM_TO_CONTROL_PLANE_KIND[area];
}
