// palantir-mini sprint-062 W2-β — Convex mutations + queries for decisionEvents
// Mirrors T3+/T4 events.jsonl rows into Convex for fast indexed retrieval.
// Enables apply_refinement_target (W2-α) to query T3+ evidence without scanning
// the append-only log. Also supports D2-canonical convergence counting (rule 26 §D2).
//
// Per operating model §4.5.6a.4 + sprint-062 plan §Phase 3 W2-β.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Shared value grade validator ─────────────────────────────────────────────

const valueGradeValidator = v.union(
  v.literal("T0"),
  v.literal("T1"),
  v.literal("T2"),
  v.literal("T3"),
  v.literal("T4"),
);

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mirror a T3+/T4 envelope from events.jsonl into Convex.
 * Deduplicates by (projectRoot, sequence) — idempotent for replay.
 * Callers should only mirror T3+/T4 grades; T0-T2 are not indexed here.
 */
export const mirrorFromEventsLog = mutation({
  args: {
    projectRoot:           v.string(),
    sequence:              v.number(),
    eventType:             v.string(),
    valueGrade:            valueGradeValidator,
    actionRid:             v.optional(v.string()),
    refinementTargetKind:  v.optional(v.string()),
    refinementTargetRid:   v.optional(v.string()),
    byWhomIdentity:        v.string(),
    when:                  v.string(),
    raw:                   v.string(),
  },
  handler: async (ctx, args) => {
    // Dedupe: (projectRoot, sequence) is a logical unique key.
    // We cannot use a unique index on non-indexed fields in Convex; filter instead.
    const existing = await ctx.db
      .query("decisionEvents")
      .withIndex("by_project_when", (q) =>
        q.eq("projectRoot", args.projectRoot),
      )
      .filter((q) => q.eq(q.field("sequence"), args.sequence))
      .first();

    if (existing) {
      return { _id: existing._id, deduped: true };
    }

    const _id = await ctx.db.insert("decisionEvents", {
      projectRoot:           args.projectRoot,
      sequence:              args.sequence,
      eventType:             args.eventType,
      valueGrade:            args.valueGrade,
      actionRid:             args.actionRid,
      refinementTargetKind:  args.refinementTargetKind,
      refinementTargetRid:   args.refinementTargetRid,
      byWhomIdentity:        args.byWhomIdentity,
      when:                  args.when,
      raw:                   args.raw,
    });

    return { _id, deduped: false };
  },
});

/**
 * Bulk mirror: accepts an array of events, returns per-item dedup results.
 * Used by the T4-watch hook and backfill script to avoid N round-trips.
 */
export const bulkMirror = mutation({
  args: {
    events: v.array(
      v.object({
        projectRoot:           v.string(),
        sequence:              v.number(),
        eventType:             v.string(),
        valueGrade:            valueGradeValidator,
        actionRid:             v.optional(v.string()),
        refinementTargetKind:  v.optional(v.string()),
        refinementTargetRid:   v.optional(v.string()),
        byWhomIdentity:        v.string(),
        when:                  v.string(),
        raw:                   v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const results: Array<{ sequence: number; _id: string; deduped: boolean }> = [];

    for (const event of args.events) {
      const existing = await ctx.db
        .query("decisionEvents")
        .withIndex("by_project_when", (q) =>
          q.eq("projectRoot", event.projectRoot),
        )
        .filter((q) => q.eq(q.field("sequence"), event.sequence))
        .first();

      if (existing) {
        results.push({ sequence: event.sequence, _id: existing._id, deduped: true });
        continue;
      }

      const _id = await ctx.db.insert("decisionEvents", {
        projectRoot:           event.projectRoot,
        sequence:              event.sequence,
        eventType:             event.eventType,
        valueGrade:            event.valueGrade,
        actionRid:             event.actionRid,
        refinementTargetKind:  event.refinementTargetKind,
        refinementTargetRid:   event.refinementTargetRid,
        byWhomIdentity:        event.byWhomIdentity,
        when:                  event.when,
        raw:                   event.raw,
      });

      results.push({ sequence: event.sequence, _id, deduped: false });
    }

    return { results, inserted: results.filter((r) => !r.deduped).length };
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Find T3+ events for a specific refinement target (kind + rid).
 * Used by apply_refinement_target (W2-α) to gather evidence before suggesting
 * ontology changes. Returns newest-first (sorted by when desc client-side).
 */
export const findT3PlusByRefinementTarget = query({
  args: {
    projectRoot:           v.string(),
    refinementTargetKind:  v.string(),
    refinementTargetRid:   v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("decisionEvents")
      .withIndex("by_project_grade", (q) =>
        q.eq("projectRoot", args.projectRoot),
      )
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("valueGrade"), "T3"),
            q.eq(q.field("valueGrade"), "T4"),
          ),
          q.eq(q.field("refinementTargetKind"), args.refinementTargetKind),
          q.eq(q.field("refinementTargetRid"),  args.refinementTargetRid),
        ),
      )
      .collect();

    // Sort newest-first for caller convenience
    return rows.sort((a, b) => b.when.localeCompare(a.when));
  },
});

/**
 * Find all T4 candidates (D2-canonical or D2-fallback eligible).
 * Used by promotion review skill + pm-recap §Substrate Routing section.
 */
export const findT4Candidates = query({
  args: { projectRoot: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("decisionEvents")
      .withIndex("by_project_grade", (q) =>
        q.eq("projectRoot", args.projectRoot).eq("valueGrade", "T4"),
      )
      .collect();
  },
});

/**
 * Count distinct vendor identities that have attested a refinement target as T3+.
 * Used for D2-canonical convergence check (rule 26 §D2 K≥2).
 * Returns count + identity list so caller can verify K≥2 cross-vendor requirement.
 */
export const convergenceCount = query({
  args: {
    projectRoot:          v.string(),
    refinementTargetRid:  v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("decisionEvents")
      .withIndex("by_project_grade", (q) =>
        q.eq("projectRoot", args.projectRoot),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("refinementTargetRid"), args.refinementTargetRid),
          q.or(
            q.eq(q.field("valueGrade"), "T3"),
            q.eq(q.field("valueGrade"), "T4"),
          ),
        ),
      )
      .collect();

    const distinctIdentities = new Set(events.map((e) => e.byWhomIdentity));
    return {
      count:      distinctIdentities.size,
      identities: Array.from(distinctIdentities),
      // D2-canonical requires K≥2 distinct identities from different vendors
      // (e.g. "claude-code/..." + "codex-cli/..." = canonical; same vendor twice = fallback)
      isCanonical: distinctIdentities.size >= 2,
    };
  },
});

/**
 * Find recent T3+ events for a project (newest first, limit configurable).
 * General-purpose query for pm-recap §BackProp circuit health reporting.
 */
export const findRecentT3Plus = query({
  args: {
    projectRoot: v.string(),
    limit:       v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const t3rows = await ctx.db
      .query("decisionEvents")
      .withIndex("by_project_grade", (q) =>
        q.eq("projectRoot", args.projectRoot).eq("valueGrade", "T3"),
      )
      .order("desc")
      .take(limit);

    const t4rows = await ctx.db
      .query("decisionEvents")
      .withIndex("by_project_grade", (q) =>
        q.eq("projectRoot", args.projectRoot).eq("valueGrade", "T4"),
      )
      .order("desc")
      .take(limit);

    const combined = [...t3rows, ...t4rows]
      .sort((a, b) => b.when.localeCompare(a.when))
      .slice(0, limit);

    return {
      rows:  combined,
      total: combined.length,
      t3count: t3rows.length,
      t4count: t4rows.length,
    };
  },
});

/**
 * Find T3+ events by actionRid (for outcome-pair correlation).
 * Used by the BackProp circuit to link grading outcomes back to proposals.
 */
export const findByActionRid = query({
  args: {
    projectRoot: v.string(),
    actionRid:   v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("decisionEvents")
      .withIndex("by_project_actionRid", (q) =>
        q.eq("projectRoot", args.projectRoot).eq("actionRid", args.actionRid),
      )
      .collect();
  },
});
