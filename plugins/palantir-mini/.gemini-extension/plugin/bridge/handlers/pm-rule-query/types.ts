// palantir-mini v3.3.0 — pm-rule-query shared types + constants (B.5)
// Extracted from pm-rule-query.ts (343 LOC) per N1-LARGE wave 1.

import type { RuleDeclaration, RuleId } from "#schemas/ontology/primitives/rule";

export const HOME = process.env.HOME ?? "/home/palantirkc";
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 100;
export const SEARCH_SNIPPET_CONTEXT = 60;

export interface PmRuleQueryArgs {
  /** Discriminator: fetch one rule by numeric id (e.g., 10). */
  byId?: number;
  /** Discriminator: fetch one rule by kebab slug (e.g., "events-jsonl"). */
  bySlug?: string;
  /** Discriminator: keyword search across invariants + bodies. */
  byQuery?: string;

  /** List/search shaping. Search defaults 10 (max 100). */
  limit?: number;
  /** List mode only — return only { ruleId, slug, invariant }. */
  compact?: boolean;

  /** Get-mode tuning. Default true. Auto-follows supersededBy + scopeMigratedTo. */
  withFollow?: boolean;
  /** Get-mode tuning. Default false. Returns crossRefs neighbors' invariants. */
  withContext?: boolean;

  /** List/search filter — global | plugin:<id> | project:<id>. */
  scope?: string;
  /** List/search filter — include rules with supersededBy set. Default false. */
  includeRetired?: boolean;
}

export interface RuleListEntry {
  ruleId: number;
  slug: string;
  invariant: string;
}

export interface RuleSearchHit {
  ruleId: RuleId;
  slug: string;
  scope: string;
  matchedIn: "invariant" | "body";
  snippet: string;
  score: number;
}

export type PmRuleQueryResult =
  | {
      mode: "get";
      rule: RuleDeclaration;
      body: string;
      followedFrom?: RuleId;
      contextRules?: Array<{ ruleId: RuleId; invariant: string }>;
    }
  | {
      mode: "list";
      count: number;
      entries: Array<RuleDeclaration | RuleListEntry>;
      totalRegistered: number;
    }
  | {
      mode: "search";
      query: string;
      count: number;
      hits: RuleSearchHit[];
    };
