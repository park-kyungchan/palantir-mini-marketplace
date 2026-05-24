/**
 * palantir-mini v2.6.0 — Producer: codegen
 * @owner palantirkc-plugin-learn
 * @purpose Reads <project>/src/generated/*.ts headers → derives gen:* ← ontology:* edges.
 */
// Domain: LEARN | Authority: plan §Wave 2 · W2.7 | Wave 2 MVP.

import * as fs from "fs";
import * as path from "path";
import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";
import type {
  ProducerContext, ProducerResult, SemanticEdge, SemanticNode,
} from "./types";

const HEADER_SCAN_LINES = 20;

export async function runProducerCodegen(ctx: ProducerContext): Promise<ProducerResult> {
  const t0 = Date.now();
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];
  const uncertainties: string[] = [];
  const scannedAt = new Date().toISOString();

  const genDir = path.join(ctx.projectRoot, "src/generated");
  if (!fs.existsSync(genDir)) {
    uncertainties.push(`no codegen dir at ${genDir}`);
    return { producer: "codegen", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
  }

  const sourceHintRegex = /(?:AUTO-GENERATED from|Source:)\s+([^\n*]+)/g;

  for (const fileName of fs.readdirSync(genDir)) {
    if (!fileName.endsWith(".ts")) continue;
    const fullPath = path.join(genDir, fileName);
    const src = fs.readFileSync(fullPath, "utf8");
    const headerLines = src.split("\n").slice(0, HEADER_SCAN_LINES).join("\n");
    const genBase = fileName.replace(/\.ts$/, "");
    const genRid = semanticRid("gen", genBase);
    nodes.push({
      decl: { rid: genRid, kind: "gen", value: genBase, label: fileName, registeredAt: scannedAt },
      discoveredBy: ["codegen"],
    });

    let matched = false;
    let m: RegExpExecArray | null;
    sourceHintRegex.lastIndex = 0;
    while ((m = sourceHintRegex.exec(headerLines)) !== null) {
      if (m[1] === undefined) continue;
      matched = true;
      const hint = m[1].trim();
      const parts = hint.split("+").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const base = path.basename(part).replace(/\.ts$/, "");
        const ontRid = semanticRid("ontology", `external.${base}`);
        edges.push({
          fromRid: genRid, toRid: ontRid,
          edgeKind: "gen-from-ontology",
          confidence: 0.8,
          evidenceKind: "semantic",
          evidence: `${fileName} header: ${hint.slice(0, 120)}`,
          producer: "codegen",
        });
      }
    }
    if (!matched) uncertainties.push(`${fileName}: header has no Source/AUTO-GENERATED hint`);
  }

  return { producer: "codegen", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
}
