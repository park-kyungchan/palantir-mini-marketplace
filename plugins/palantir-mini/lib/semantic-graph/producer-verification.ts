/**
 * palantir-mini v3.7.0 — Producer: verification (orchestrator)
 * @owner palantirkc-plugin-learn
 * @purpose Scans eval-rubric.md → emits eval:* nodes + eval-covers edges;
 *          ontology/+docs/ → emits doc:* nodes + doc-references edges.
 * @sprint-063: monitors sunset (C18) — mon:* nodes + mon-scope edges removed.
 *              monitors/ directory deleted; producer-verification standalone.
 */
// Domain: LEARN | Authority: plan §Wave 3 · W3.2 → Session 4 Slice 1 VR-1.
// Decomposed in v3.7.0 A.2: walkers + extractors + constants extracted to ./producer-verification/*.

import * as fs from "fs";
import * as path from "path";
import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";
import type { SemanticRid } from "#schemas/ontology/primitives/semantic-rid";
import type { ProducerContext, ProducerResult, SemanticEdge, SemanticNode } from "./types";
import { walkMarkdown } from "./producer-verification/walkers";
import {
  extractEvalSections,
  extractBulletCriterionIds,
  extractTargets,
} from "./producer-verification/extractors";

// Backward-compat re-exports
export { walkMarkdown, walkScanRoot, snippetAround } from "./producer-verification/walkers";
export {
  extractEvalSections,
  extractBulletCriterionIds,
  extractTargets,
} from "./producer-verification/extractors";
export { PLUGIN_ROOT } from "./producer-verification/constants";

export async function runProducerVerification(ctx: ProducerContext): Promise<ProducerResult> {
  const t0 = Date.now();
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];
  const uncertainties: string[] = [];
  const scannedAt = new Date().toISOString();
  const edgeKey = new Set<string>();

  const pushEdge = (
    fromRid: SemanticRid,
    toRid: SemanticRid,
    edgeKind: SemanticEdge["edgeKind"],
    confidence: number,
    evidence: string,
  ): void => {
    if ((fromRid as string) === (toRid as string)) return;
    const key = `${fromRid}|${toRid}|${edgeKind}`;
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    edges.push({
      fromRid, toRid, edgeKind, confidence,
      evidenceKind: "semantic",
      evidence,
      producer: "verification",
    });
  };

  // ── 1. eval:* — from .palantir-mini/harness/eval-rubric.md ───────────────
  const evalRubricPath = path.join(ctx.projectRoot, ".palantir-mini/harness/eval-rubric.md");
  if (fs.existsSync(evalRubricPath)) {
    const src = fs.readFileSync(evalRubricPath, "utf8");
    const sections = extractEvalSections(src);
    const bulletIds = extractBulletCriterionIds(src);
    const emittedSlugs = new Set<string>();

    for (const sec of sections) {
      if (!sec.slug || emittedSlugs.has(sec.slug)) continue;
      emittedSlugs.add(sec.slug);
      const rid = semanticRid("eval", sec.slug);
      nodes.push({
        decl: { rid, kind: "eval", value: sec.slug, label: sec.title, registeredAt: scannedAt },
        discoveredBy: ["verification"],
      });
      const targets = extractTargets(sec.body);
      for (const { targetRid, evidence } of targets) {
        pushEdge(rid, targetRid, "eval-covers", 0.7, evidence);
      }
    }
    for (const cid of bulletIds) {
      if (emittedSlugs.has(cid)) continue;
      emittedSlugs.add(cid);
      const rid = semanticRid("eval", cid);
      nodes.push({
        decl: { rid, kind: "eval", value: cid, label: cid, registeredAt: scannedAt },
        discoveredBy: ["verification"],
      });
    }
    if (emittedSlugs.size === 0) {
      uncertainties.push(`eval-rubric.md found but no criteria extracted at ${evalRubricPath}`);
    }
  } else {
    uncertainties.push(`no eval-rubric.md at ${evalRubricPath}`);
  }

  // ── 2. doc:* — from ontology/ and docs/ markdown files + doc-references edges ──
  for (const docDir of ["ontology", "docs"]) {
    const fullDir = path.join(ctx.projectRoot, docDir);
    if (!fs.existsSync(fullDir)) {
      uncertainties.push(`doc dir not found: ${fullDir}`);
      continue;
    }
    walkMarkdown(fullDir, (filePath) => {
      const relPath = path.relative(ctx.projectRoot, filePath).replace(/\\/g, "/");
      const slug = relPath.replace(/\.md$/, "").replace(/\//g, "-").toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const rid = semanticRid("doc", slug);
      nodes.push({
        decl: { rid, kind: "doc", value: relPath, label: path.basename(filePath, ".md"), registeredAt: scannedAt },
        discoveredBy: ["verification"],
      });
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const targets = extractTargets(content);
        for (const { targetRid, evidence } of targets) {
          pushEdge(rid, targetRid, "doc-references", 0.8, evidence);
        }
      } catch {
        // read error → skip edges for this doc; node already emitted
      }
    });
  }

  // ── 3. mon:* — REMOVED (sprint-063 C18 monitors sunset) ─────────────────
  // monitors/ directory deleted; mon-scope edges no longer emitted.

  return { producer: "verification", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
}
