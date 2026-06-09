import type { ResearchAuthorityClass, ResearchLibrary } from "../research-source-map";

/**
 * palantir-mini — ResearchDocument primitive (prim-research-01)
 *
 * Declarative reference to a research artifact that sits upstream of
 * schemas in the authority chain. Used by doc-drift detection + refresh
 * handlers to know where evidence lives and when it was last verified.
 *
 * Authority chain:
 *   palantir-developers/ -> palantir-foundry/ -> palantir-vision/ -> _archive legacy bridge
 *   -> schemas/ontology/research-source-map.ts
 *   -> schemas/ontology/primitives/research-document.ts (this file)
 *   -> palantir-mini/lib/research/detect-drift.ts
 *   -> palantir-mini/mcp handlers: detect_doc_drift, refresh_research_doc
 *
 * Branded RID pattern (zero runtime cost):
 *   type ResearchDocumentRid = string & { __brand: "ResearchDocumentRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
 * @owner palantirkc-ontology
 * @purpose ResearchDocument primitive (prim-research-01)
 */

export type ResearchDocumentRid = string & { readonly __brand: "ResearchDocumentRid" };

export const researchDocumentRid = (s: string): ResearchDocumentRid => s as ResearchDocumentRid;

export interface ResearchDocumentDeclaration {
  readonly rid: ResearchDocumentRid;
  /** Human-readable name (often the filename) */
  readonly name: string;
  /** Absolute filesystem path to the research document */
  readonly path: string;
  /** Topic slug (e.g. "claude-code/hooks", "palantir-foundry/ontology") */
  readonly topic: string;
  /** ISO timestamp of last verification against upstream source */
  readonly lastVerified: string;
  /** Upstream version the document was verified against (e.g. "CC v2.1.113", "OSDK 2.0") */
  readonly upstreamVersion?: string;
  /** Days after which the document is considered stale (default 30) */
  readonly staleThresholdDays: number;
  /** Active research library layer owning this document */
  readonly library?: ResearchLibrary;
  /** Builder/fact/synthesis/capability/archive role within the research split */
  readonly authorityClass?: ResearchAuthorityClass;
  /** True only for explicit legacy bridge documents under _archive/ */
  readonly archived?: boolean;
  /** Replacement document RID or canonical path when this doc was superseded */
  readonly supersededBy?: string;
  /** Canonical active refs if this declaration was migrated from a legacy path */
  readonly canonicalRefs?: readonly string[];
  /** Human-readable migration rationale for AI agents and drift tooling */
  readonly migrationNote?: string;
  /** Guidance for AI agents consuming this declaration */
  readonly agentDirective?: string;
  /** Supporting citations linking back to authoritative sources */
  readonly citations?: ReadonlyArray<{
    readonly source: string;
    readonly url?: string;
    readonly verifiedAt: string;
  }>;
}

/** Registry helper — v0 minimal registry via plain Map */
export class ResearchDocumentRegistry {
  private readonly docs = new Map<ResearchDocumentRid, ResearchDocumentDeclaration>();

  register(decl: ResearchDocumentDeclaration): void {
    this.docs.set(decl.rid, decl);
  }

  get(rid: ResearchDocumentRid): ResearchDocumentDeclaration | undefined {
    return this.docs.get(rid);
  }

  list(): ResearchDocumentDeclaration[] {
    return [...this.docs.values()];
  }
}

export const RESEARCH_DOCUMENT_REGISTRY = new ResearchDocumentRegistry();
