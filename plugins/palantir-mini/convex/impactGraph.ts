// palantir-mini sprint-061 B.W1 — Convex mutations + queries for impact-graph
// Server-side: atomic insert/delete/upsert/log, BFS traversal, hash-gate.
//
// Per operating model §4.5.6a.4.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";

// ─── Edge input shape (matches impactEdges table minus _id, _creationTime) ────

const edgeInput = {
  projectRoot: v.string(),
  fromRid:     v.string(),
  toRid:       v.string(),
  edgeKind:    v.union(
    v.literal("forwardProp"),
    v.literal("backwardProp"),
    v.literal("codegen"),
    v.literal("import"),
    v.literal("semantic"),
    v.literal("test-covers"),
    v.literal("doc-references"),
    v.literal("export"),
    v.literal("typeRef"),
    v.literal("extends"),
    v.literal("implements"),
  ),
  confidence:   v.number(),
  evidence:     v.optional(v.string()),
  registeredAt: v.string(),
  verifiedAt:   v.optional(v.string()),
};

// ─── Internal helper ──────────────────────────────────────────────────────────

async function upsertFileState(
  ctx: { db: { query: Function; insert: Function; patch: Function } },
  args: {
    projectRoot: string;
    filePath: string;
    contentHash: string;
    edgeCount: number;
    walkDurationMs: number;
    lastWalkedTsConfig?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await ctx.db
    .query("fileState")
    .withIndex("by_project_path", (q: any) =>
      q.eq("projectRoot", args.projectRoot).eq("filePath", args.filePath),
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      contentHash: args.contentHash,
      lastWalkedAt: now,
      lastWalkedTsConfig: args.lastWalkedTsConfig ?? "",
      edgeCount: args.edgeCount,
      walkDurationMs: args.walkDurationMs,
    });
  } else {
    await ctx.db.insert("fileState", {
      projectRoot: args.projectRoot,
      filePath: args.filePath,
      contentHash: args.contentHash,
      lastWalkedAt: now,
      lastWalkedTsConfig: args.lastWalkedTsConfig ?? "",
      edgeCount: args.edgeCount,
      walkDurationMs: args.walkDurationMs,
    });
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * applyDiff — Atomic: insert added edges, delete removed edges, upsert fileState,
 * log to graphMutations. The canonical hot-path for incremental updates.
 */
export const applyDiff = mutation({
  args: {
    projectRoot:    v.string(),
    filePath:       v.string(),
    contentHash:    v.string(),
    addedEdges:     v.array(v.object(edgeInput)),
    deletedEdges:   v.array(v.object({
      projectRoot: v.string(),
      fromRid:     v.string(),
      toRid:       v.string(),
      edgeKind:    v.union(
        v.literal("forwardProp"), v.literal("backwardProp"), v.literal("codegen"),
        v.literal("import"), v.literal("semantic"), v.literal("test-covers"),
        v.literal("doc-references"), v.literal("export"), v.literal("typeRef"),
        v.literal("extends"), v.literal("implements"),
      ),
    })),
    walkDurationMs: v.number(),
    lastWalkedTsConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Insert added edges
    for (const e of args.addedEdges) {
      await ctx.db.insert("impactEdges", e);
    }

    // Delete removed edges (match on fromRid + toRid + edgeKind triple)
    for (const e of args.deletedEdges) {
      const existing = await ctx.db
        .query("impactEdges")
        .withIndex("by_project_from", (q: any) =>
          q.eq("projectRoot", args.projectRoot).eq("fromRid", e.fromRid),
        )
        .filter((q: any) =>
          q.and(
            q.eq(q.field("toRid"), e.toRid),
            q.eq(q.field("edgeKind"), e.edgeKind),
          ),
        )
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }

    // Upsert fileState
    await upsertFileState(ctx, {
      projectRoot: args.projectRoot,
      filePath: args.filePath,
      contentHash: args.contentHash,
      edgeCount: args.addedEdges.length,
      walkDurationMs: args.walkDurationMs,
      lastWalkedTsConfig: args.lastWalkedTsConfig,
    });

    // Log mutation
    const affectedRids = Array.from(
      new Set([
        ...args.addedEdges.map((e) => e.fromRid),
        ...args.deletedEdges.map((e) => e.fromRid),
      ]),
    );
    await ctx.db.insert("graphMutations", {
      projectRoot: args.projectRoot,
      operation: "modify",
      affectedRids,
      addedCount: args.addedEdges.length,
      deletedCount: args.deletedEdges.length,
      triggeredBy: "applyDiff",
      occurredAt: now,
    });

    return {
      added: args.addedEdges.length,
      deleted: args.deletedEdges.length,
    };
  },
});

/**
 * upsertEdges — Initial walk variant; inserts all edges + sets fileState.
 * Used by populate_impact_graph on first walk.
 */
export const upsertEdges = mutation({
  args: {
    projectRoot: v.string(),
    filePath:    v.string(),
    contentHash: v.string(),
    edges:       v.array(v.object(edgeInput)),
    walkDurationMs: v.number(),
    lastWalkedTsConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Clear existing edges for this fromRid before bulk insert
    const fileRid = `file:${args.filePath}`;
    const oldEdges = await ctx.db
      .query("impactEdges")
      .withIndex("by_project_from", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("fromRid", fileRid),
      )
      .collect();
    for (const e of oldEdges) {
      await ctx.db.delete(e._id);
    }

    // Insert new edges
    for (const e of args.edges) {
      await ctx.db.insert("impactEdges", e);
    }

    // Upsert fileState
    await upsertFileState(ctx, {
      projectRoot: args.projectRoot,
      filePath: args.filePath,
      contentHash: args.contentHash,
      edgeCount: args.edges.length,
      walkDurationMs: args.walkDurationMs,
      lastWalkedTsConfig: args.lastWalkedTsConfig,
    });

    // Log mutation
    await ctx.db.insert("graphMutations", {
      projectRoot: args.projectRoot,
      operation: "add",
      affectedRids: [fileRid],
      addedCount: args.edges.length,
      deletedCount: oldEdges.length,
      triggeredBy: "upsertEdges",
      occurredAt: now,
    });

    return { upserted: args.edges.length };
  },
});

/**
 * cascadeDelete — Delete by fromRid OR toRid match + log.
 * Server-side cascade: atomically deletes from impactEdges + fileState.
 */
export const cascadeDelete = mutation({
  args: {
    projectRoot: v.string(),
    filePath:    v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const fileRid = `file:${args.filePath}`;

    // Delete edges where fromRid matches
    const fromEdges = await ctx.db
      .query("impactEdges")
      .withIndex("by_project_from", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("fromRid", fileRid),
      )
      .collect();
    for (const e of fromEdges) await ctx.db.delete(e._id);

    // Delete edges where toRid matches
    const toEdges = await ctx.db
      .query("impactEdges")
      .withIndex("by_project_to", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("toRid", fileRid),
      )
      .collect();
    for (const e of toEdges) await ctx.db.delete(e._id);

    // Delete fileState
    const fs = await ctx.db
      .query("fileState")
      .withIndex("by_project_path", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("filePath", args.filePath),
      )
      .first();
    if (fs) await ctx.db.delete(fs._id);

    const deletedCount = fromEdges.length + toEdges.length;

    // Log mutation
    await ctx.db.insert("graphMutations", {
      projectRoot: args.projectRoot,
      operation: "delete",
      affectedRids: [fileRid],
      addedCount: 0,
      deletedCount,
      triggeredBy: "cascadeDelete",
      occurredAt: now,
    });

    return { deletedCount };
  },
});

/**
 * renameRid — Atomic delete-old + insert-new with preserved evidence.
 * Called on git mv / mv operations.
 */
export const renameRid = mutation({
  args: {
    projectRoot:  v.string(),
    oldFilePath:  v.string(),
    newFilePath:  v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const oldRid = `file:${args.oldFilePath}`;
    const newRid = `file:${args.newFilePath}`;

    // Re-point edges where fromRid matches old
    const fromEdges = await ctx.db
      .query("impactEdges")
      .withIndex("by_project_from", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("fromRid", oldRid),
      )
      .collect();
    for (const e of fromEdges) {
      await ctx.db.delete(e._id);
      await ctx.db.insert("impactEdges", {
        ...e,
        fromRid: newRid,
        _id: undefined as unknown as Id<"impactEdges">,
        _creationTime: undefined as unknown as number,
      });
    }

    // Re-point edges where toRid matches old
    const toEdges = await ctx.db
      .query("impactEdges")
      .withIndex("by_project_to", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("toRid", oldRid),
      )
      .collect();
    for (const e of toEdges) {
      await ctx.db.delete(e._id);
      await ctx.db.insert("impactEdges", {
        ...e,
        toRid: newRid,
        _id: undefined as unknown as Id<"impactEdges">,
        _creationTime: undefined as unknown as number,
      });
    }

    // Rename fileState
    const oldFs = await ctx.db
      .query("fileState")
      .withIndex("by_project_path", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("filePath", args.oldFilePath),
      )
      .first();
    if (oldFs) {
      await ctx.db.delete(oldFs._id);
      await ctx.db.insert("fileState", {
        ...oldFs,
        filePath: args.newFilePath,
        _id: undefined as unknown as Id<"fileState">,
        _creationTime: undefined as unknown as number,
      });
    }

    // Log mutation
    await ctx.db.insert("graphMutations", {
      projectRoot: args.projectRoot,
      operation: "rename",
      affectedRids: [oldRid, newRid],
      addedCount: fromEdges.length + toEdges.length,
      deletedCount: fromEdges.length + toEdges.length,
      triggeredBy: "renameRid",
      occurredAt: now,
    });

    return { renamedEdges: fromEdges.length + toEdges.length };
  },
});

/**
 * markBatchDirty — Mark fileState entries as dirty for batch re-walk.
 * Sets contentHash to "" (empty = dirty marker) for each path.
 */
export const markBatchDirty = mutation({
  args: {
    projectRoot: v.string(),
    paths:       v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    let markedCount = 0;

    for (const filePath of args.paths) {
      const existing = await ctx.db
        .query("fileState")
        .withIndex("by_project_path", (q: any) =>
          q.eq("projectRoot", args.projectRoot).eq("filePath", filePath),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          contentHash: "",  // empty = dirty
          lastWalkedAt: now,
        });
        markedCount++;
      }
    }

    // Log bulk mutation
    await ctx.db.insert("graphMutations", {
      projectRoot: args.projectRoot,
      operation: "bulk",
      affectedRids: args.paths.map((p) => `file:${p}`),
      addedCount: 0,
      deletedCount: 0,
      triggeredBy: "markBatchDirty",
      occurredAt: now,
    });

    return { markedCount };
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

type ConvexEdge = Doc<"impactEdges">;

/**
 * queryByRid — BFS up to depth N; returns forwardProp + backwardProp + transitive.
 */
export const queryByRid = query({
  args: {
    projectRoot: v.string(),
    rid:         v.string(),
    depth:       v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    forward: ConvexEdge[];
    backward: ConvexEdge[];
    transitive: { forward: ConvexEdge[]; backward: ConvexEdge[] };
  }> => {
    const maxDepth = args.depth ?? 3;
    const allForward: ConvexEdge[] = [];
    const allBackward: ConvexEdge[] = [];
    const visitedFwd = new Set<string>();
    const visitedBwd = new Set<string>();

    // BFS forward
    const fwdQueue: Array<{ rid: string; depth: number }> = [
      { rid: args.rid, depth: 0 },
    ];
    visitedFwd.add(args.rid);
    while (fwdQueue.length > 0) {
      const item = fwdQueue.shift()!;
      if (item.depth >= maxDepth) continue;
      const edges = await ctx.db
        .query("impactEdges")
        .withIndex("by_project_from", (q: any) =>
          q.eq("projectRoot", args.projectRoot).eq("fromRid", item.rid),
        )
        .collect();
      for (const e of edges) {
        allForward.push(e);
        if (!visitedFwd.has(e.toRid)) {
          visitedFwd.add(e.toRid);
          fwdQueue.push({ rid: e.toRid, depth: item.depth + 1 });
        }
      }
    }

    // BFS backward
    const bwdQueue: Array<{ rid: string; depth: number }> = [
      { rid: args.rid, depth: 0 },
    ];
    visitedBwd.add(args.rid);
    while (bwdQueue.length > 0) {
      const item = bwdQueue.shift()!;
      if (item.depth >= maxDepth) continue;
      const edges = await ctx.db
        .query("impactEdges")
        .withIndex("by_project_to", (q: any) =>
          q.eq("projectRoot", args.projectRoot).eq("toRid", item.rid),
        )
        .collect();
      for (const e of edges) {
        allBackward.push(e);
        if (!visitedBwd.has(e.fromRid)) {
          visitedBwd.add(e.fromRid);
          bwdQueue.push({ rid: e.fromRid, depth: item.depth + 1 });
        }
      }
    }

    // Direct edges (depth=1) from full BFS result
    const directForward = allForward.filter((e) => e.fromRid === args.rid);
    const directBackward = allBackward.filter((e) => e.toRid === args.rid);

    return {
      forward: directForward,
      backward: directBackward,
      transitive: {
        forward: allForward,
        backward: allBackward,
      },
    };
  },
});

/**
 * queryByFromRid — Single-direction for diff (outbound edges from a fromRid).
 */
export const queryByFromRid = query({
  args: {
    projectRoot: v.string(),
    fromRid:     v.string(),
  },
  handler: async (ctx, args): Promise<ConvexEdge[]> => {
    return await ctx.db
      .query("impactEdges")
      .withIndex("by_project_from", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("fromRid", args.fromRid),
      )
      .collect();
  },
});

/**
 * getFileState — Hash-gate input; returns null if not tracked.
 */
export const getFileState = query({
  args: {
    projectRoot: v.string(),
    filePath:    v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileState")
      .withIndex("by_project_path", (q: any) =>
        q.eq("projectRoot", args.projectRoot).eq("filePath", args.filePath),
      )
      .first();
  },
});

/**
 * dirtyCount — Session-end-flush input.
 * Returns count of fileState entries with empty contentHash (dirty).
 */
export const dirtyCount = query({
  args: {
    projectRoot: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    const dirty = await ctx.db
      .query("fileState")
      .withIndex("by_project_path", (q: any) =>
        q.eq("projectRoot", args.projectRoot),
      )
      .filter((q: any) => q.eq(q.field("contentHash"), ""))
      .collect();
    return dirty.length;
  },
});

/**
 * totalEdgeCount — Utility for migration progress reporting.
 */
export const totalEdgeCount = query({
  args: {
    projectRoot: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<number> => {
    if (args.projectRoot) {
      const edges = await ctx.db
        .query("impactEdges")
        .withIndex("by_project_from", (q: any) =>
          q.eq("projectRoot", args.projectRoot),
        )
        .collect();
      return edges.length;
    }
    // Count all edges across all projects
    const all = await ctx.db.query("impactEdges").collect();
    return all.length;
  },
});
