/**
 * RetentionManifest primitive — per-tier event retention policy + provenance
 * @prim-data-NN (sprint-106 PR 4.4; schemas v1.65.0)
 *
 * Formalizes the lifecycle policy for events.jsonl rows across T0-T4 value
 * grades (rule 26 §Substrate routing). Each tier carries independent live /
 * archive / purge horizons and a cloudMirrorEnabled flag so the substrate
 * router can act without consulting external config.
 *
 * Per canonical plan v2 §4 row 4.4.
 *
 * Authority chain:
 *   rule 26 §Substrate routing (T0-T4 lifecycle)
 *       ↓
 *   schemas/ontology/primitives/retention-manifest.ts (this file)
 *       ↓
 *   ontology/shared-core/ (re-export)
 *       ↓
 *   plugin lib/event-log/retention-writer.ts (writer + reader)
 *
 * @owner palantirkc-ontology
 */

import type { FoundryEquivalence } from "./category-foundry-equivalent";

// ---------------------------------------------------------------------------
// RID + branded type
// ---------------------------------------------------------------------------

export type RetentionManifestRid = string & { readonly __brand: "RetentionManifestRid" };

export const retentionManifestRid = (s: string): RetentionManifestRid =>
  s as RetentionManifestRid;

// ---------------------------------------------------------------------------
// Per-tier retention policy
// ---------------------------------------------------------------------------

/**
 * Retention policy for a single value-grade tier.
 *
 * - `liveDays`       — keep event rows in the live `events.jsonl`.
 * - `archiveDays`    — keep event rows in `archive/events-rotated-*.jsonl`.
 * - `purgeAfterDays` — delete rows entirely (only applicable to T0 rejected events).
 * - `cloudMirrorEnabled` — whether the cloud mirror substrate should replicate rows.
 * - `reason`         — human-readable rationale (≥40 chars per rule 26 §A3).
 */
export interface RetentionPolicy {
  readonly tier: "T0" | "T1" | "T2" | "T3" | "T4";
  readonly liveDays: number;
  readonly archiveDays: number;
  readonly purgeAfterDays?: number;
  readonly cloudMirrorEnabled: boolean;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Manifest entry
// ---------------------------------------------------------------------------

/**
 * A complete retention manifest declaring all tier policies.
 *
 * `manifestId` is a stable RID; multiple projects may reference the same
 * manifest for consistent policy across the swarm.
 *
 * `provenance.source` should cite the canonical plan row or rule that
 * motivated this policy (e.g. "canonical-plan-v2-row-4.4").
 */
export interface RetentionManifestEntry {
  readonly manifestId: RetentionManifestRid;
  readonly tierPolicies: readonly RetentionPolicy[];
  readonly createdAt: string;
  readonly provenance: { source: string; rationale: string };
}

// ---------------------------------------------------------------------------
// Default manifest — T0-T4 baseline per rule 26 §Substrate routing
// ---------------------------------------------------------------------------

/**
 * Default retention manifest shipped with palantir-mini.
 *
 * Tiers align with rule 26 §Substrate routing:
 *   T0 → archive 7d then delete (rejected events — minimal footprint)
 *   T1 → workflow lineage only — bounded retention, no cloud mirror
 *   T2 → outcome-paired — cloud mirror useful for cross-session audits
 *   T3 → BackPropagation input — long retention + cloud
 *   T4 → canonical promotion candidates — multi-year + cloud
 */
export const DEFAULT_RETENTION_MANIFEST: RetentionManifestEntry = {
  manifestId: retentionManifestRid("manifest-default-v1"),
  tierPolicies: [
    {
      tier: "T0",
      liveDays: 7,
      archiveDays: 0,
      purgeAfterDays: 30,
      cloudMirrorEnabled: false,
      reason: "Rejected events — short live retention, no archive, purge after 30 days to bound substrate footprint.",
    },
    {
      tier: "T1",
      liveDays: 30,
      archiveDays: 60,
      cloudMirrorEnabled: false,
      reason: "Workflow Lineage only — bounded retention (30d live / 60d archive) with no cloud mirror needed.",
    },
    {
      tier: "T2",
      liveDays: 90,
      archiveDays: 365,
      cloudMirrorEnabled: true,
      reason: "Outcome-paired events — 90d live / 1y archive; cloud mirror useful for cross-session outcome audits.",
    },
    {
      tier: "T3",
      liveDays: 180,
      archiveDays: 730,
      cloudMirrorEnabled: true,
      reason: "BackPropagation input — 180d live / 2y archive; long retention + cloud mirror for refinement replay.",
    },
    {
      tier: "T4",
      liveDays: 365,
      archiveDays: 2555,
      cloudMirrorEnabled: true,
      reason: "Canonical promotion candidates — 1y live / 7y archive; multi-year retention for shared-core promotion review.",
    },
  ],
  createdAt: "2026-05-13T00:00:00.000Z",
  provenance: {
    source: "canonical-plan-v2-row-4.4",
    rationale: "Default per-tier event retention policy per rule 26 §Substrate routing + handoff §C.2.",
  },
};

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isRetentionManifestEntry(v: unknown): v is RetentionManifestEntry {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj["manifestId"] === "string" &&
    Array.isArray(obj["tierPolicies"]) &&
    typeof obj["createdAt"] === "string" &&
    typeof obj["provenance"] === "object" &&
    obj["provenance"] !== null
  );
}

// ---------------------------------------------------------------------------
// FoundryEquivalence metadata (prim-meta-01 pattern)
// ---------------------------------------------------------------------------

const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "RetentionManifest is a palantir-mini-originated event-substrate lifecycle policy aligned with rule 26 valuable-data T0-T4 tier routing; no direct Palantir Foundry counterpart.",
};

export { categoryFoundryEquivalent as retentionManifestFoundryEquivalent };
