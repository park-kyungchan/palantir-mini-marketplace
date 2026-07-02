/**
 * palantir-mini v2.6.0 — lib/semantic-graph/manifest-writer.ts
 * @owner palantirkc-plugin-learn
 * @purpose Aggregates ProducerResults into a deduplicated SemanticManifest and
 *          writes it to <projectRoot>/.palantir-mini/semantic-manifest.json.
 */
// Domain: LEARN | Authority: plan §Wave 2 · W2.10
// Rule 10: emits semantic_manifest_refreshed via emit() (append-only, 5-dim envelope).
// emit() wrapped in try/catch — non-fatal for fresh projects without events.jsonl.

import * as fs from "fs";
import * as path from "path";
import type { ProducerResult, SemanticEdge, SemanticNode } from "./types";

// ─── Exported types ───────────────────────────────────────────────────────────

export interface SemanticManifest {
  readonly version: "v1";
  readonly generatedAt: string;       // ISO8601
  readonly projectRoot: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly producerCount: number;
  readonly nodes: ReadonlyArray<SemanticNode>;
  readonly edges: ReadonlyArray<SemanticEdge>;
  readonly uncertainties: ReadonlyArray<string>;
  readonly durationMs: number;        // total wall time across all producers
}

export interface ManifestWriteOptions {
  readonly projectRoot: string;
  readonly producerResults: ReadonlyArray<ProducerResult>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Deduplicates nodes by rid, merging discoveredBy arrays. Last-wins for decl. */
function dedupeNodes(results: ReadonlyArray<ProducerResult>): SemanticNode[] {
  const map = new Map<string, SemanticNode>();
  for (const result of results) {
    for (const node of result.nodes) {
      const key = node.decl.rid as string;
      const existing = map.get(key);
      if (existing) {
        // Merge discoveredBy — union without duplicates
        const merged = Array.from(
          new Set([...existing.discoveredBy, ...node.discoveredBy])
        ) as SemanticNode["discoveredBy"][number][];
        map.set(key, {
          decl: node.decl,
          discoveredBy: merged,
        });
      } else {
        map.set(key, node);
      }
    }
  }
  return Array.from(map.values());
}

/** Unions edges from all producers without deduplication (per spec). */
function unionEdges(results: ReadonlyArray<ProducerResult>): SemanticEdge[] {
  const all: SemanticEdge[] = [];
  for (const result of results) {
    for (const edge of result.edges) {
      all.push(edge);
    }
  }
  return all;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Aggregates all ProducerResults, deduplicates nodes by rid (merging discoveredBy),
 * unions edges, writes the manifest JSON, and emits a semantic_manifest_refreshed event.
 *
 * Returns { path, nodeCount, edgeCount }.
 */
export async function writeManifest(
  opts: ManifestWriteOptions
): Promise<{ path: string; nodeCount: number; edgeCount: number }> {
  const { projectRoot, producerResults } = opts;
  const t0 = Date.now();

  // Aggregate
  const nodes = dedupeNodes(producerResults);
  const edges = unionEdges(producerResults);

  const allUncertainties = producerResults.flatMap((r) => r.uncertainties);
  const totalDurationMs = producerResults.reduce((sum, r) => sum + r.durationMs, 0);

  const manifest: SemanticManifest = {
    version: "v1",
    generatedAt: new Date().toISOString(),
    projectRoot,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    producerCount: producerResults.length,
    nodes,
    edges,
    uncertainties: allUncertainties,
    durationMs: Date.now() - t0 + totalDurationMs,
  };

  // Write to <projectRoot>/.palantir-mini/semantic-manifest.json
  const outDir = path.join(projectRoot, ".palantir-mini");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "semantic-manifest.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");

  // Emit semantic_manifest_refreshed event — non-fatal if events.jsonl substrate
  // doesn't exist yet (fresh project) — rule 10 append-only invariant preserved.
  try {
    const { emit } = await import("../../scripts/log");
    // semantic_manifest_refreshed is a typed EventEnvelope variant (Sprint-cartography
    // W1 vocabulary/union drift closure) — no cast needed. try/catch below ensures the
    // emit stays non-fatal if the substrate rejects it (e.g. fresh project).
    await emit({
      type: "semantic_manifest_refreshed",
      payload: {
        projectRoot,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        producerCount: producerResults.length,
      },
      toolName: "writeManifest",
      cwd: projectRoot,
      reasoning: `Manifest refreshed: ${nodes.length} nodes, ${edges.length} edges from ${producerResults.length} producers.`,
    });
  } catch {
    // Non-fatal — events.jsonl may not yet exist for a fresh project.
    // The manifest write already succeeded; rule 10 append-only invariant is preserved.
  }

  return { path: outPath, nodeCount: nodes.length, edgeCount: edges.length };
}
