/**
 * @stable — OfficialResearchDoc primitive (prim-data-21, v1.0.0)
 *
 * Alias-wrapper for ResearchDocumentRid under the canonical Phase 2 node name.
 * ResearchDocument already covers official-research-doc lineage including
 * authority class + verification staleness tracking. This wrapper gives the
 * canonical graph-node name `OfficialResearchDoc` while pointing to the
 * existing typed surface. A helper assertion narrows to official libraries
 * (`"palantir-foundry"` | `"palantir-developers"`).
 *
 * Decision: alias-wrapper (b1) per spec.md §4 row 1 — ResearchDocument
 * structurally covers the node concept; no extend required.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/research-document.ts (wrapped)
 *     -> ~/.claude/schemas/ontology/primitives/official-research-doc.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: DATA (alias — no new logic; delegates to research-document.ts)
 * @owner palantirkc-ontology
 * @purpose OfficialResearchDoc canonical alias for ResearchDocumentRid (Phase 2 ImpactGraph node)
 */

export type {
  ResearchDocumentRid,
  ResearchDocumentDeclaration,
} from "./research-document";

export { researchDocumentRid } from "./research-document";

/** Canonical alias — OfficialResearchDocRid IS ResearchDocumentRid. */
export type OfficialResearchDocRid = import("./research-document").ResearchDocumentRid;

/**
 * Official library constraint for OfficialResearchDoc nodes.
 * A ResearchDocumentDeclaration qualifies as an OfficialResearchDoc when its
 * `library` field is one of these two values.
 */
export type OfficialResearchLibrary = "palantir-foundry" | "palantir-developers";

/**
 * Type guard that asserts a ResearchDocumentDeclaration is an official
 * research doc (library restricted to palantir-foundry | palantir-developers).
 */
export function isOfficialResearchDoc(
  doc: import("./research-document").ResearchDocumentDeclaration
): boolean {
  return (
    doc.library === "palantir-foundry" || doc.library === "palantir-developers"
  );
}
