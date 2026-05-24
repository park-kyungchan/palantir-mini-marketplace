/**
 * Plugin-local re-export of the schema-level research source resolver.
 *
 * Foundation for Wave 2 SP-2 (detect_doc_drift authority-aware) and SP-3
 * (SemanticChangePlan read-plan extension). Consumers in bridge/handlers/
 * should import from this module, not directly from the schemas package,
 * so the plugin boundary is explicit.
 */

import {
  resolveResearchRef as schemaResolveResearchRef,
  extractResearchRefs as schemaExtractResearchRefs,
  type ResearchSourceResolution,
  type ResearchAuthorityClass,
} from "#schemas/ontology/research-source-map";

export type { ResearchSourceResolution, ResearchAuthorityClass };

export function resolveResearchRef(rawRef: string): ResearchSourceResolution {
  return schemaResolveResearchRef(rawRef);
}

export function extractResearchRefs(text: string): readonly string[] {
  return schemaExtractResearchRefs(text);
}

export function formatAuthorityHint(resolution: ResearchSourceResolution): string {
  switch (resolution.authorityClass) {
    case "builder":
      return "builder-entry: open first for read order and escalation boundaries";
    case "fact":
      return "official fact: prefer exact wording over synthesis";
    case "synthesis":
      return "synthesis: internal interpretation; step sideways to supporting official refs when product mechanics matter";
    case "capability":
      return "capability fact: Claude-runtime capability only, not ontology authority";
    case "archive":
      return "archive bridge: legacy only — read active layer first; use archive only to recover historical semantics";
  }
}
