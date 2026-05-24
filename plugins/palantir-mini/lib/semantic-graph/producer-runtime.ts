/**
 * palantir-mini v2.6.0 — Producer: runtime
 * @owner palantirkc-plugin-learn
 * @purpose Scans project runtime entrypoints (skills/*, apps/*) → emits runtime:* ← gen:* edges.
 */
// Domain: LEARN | Authority: plan §Wave 2 · W2.8 | Wave 2 MVP.

import * as fs from "fs";
import * as path from "path";
import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";
import type {
  ProducerContext, ProducerResult, SemanticEdge, SemanticNode,
} from "./types";

const RUNTIME_DIRS = ["skills", "apps", "src/app", "src/pages"];
const GEN_IMPORT_REGEX = /from\s+["']([^"']*\/src\/generated\/[^"']+)["']/g;

function walkDir(dir: string, visit: (f: string) => void, depth = 0): void {
  if (depth > 6) return;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "dist") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, visit, depth + 1);
    else visit(full);
  }
}

export async function runProducerRuntime(ctx: ProducerContext): Promise<ProducerResult> {
  const t0 = Date.now();
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];
  const uncertainties: string[] = [];
  const scannedAt = new Date().toISOString();

  for (const dirName of RUNTIME_DIRS) {
    const fullDir = path.join(ctx.projectRoot, dirName);
    if (!fs.existsSync(fullDir)) continue;
    walkDir(fullDir, (filePath) => {
      if (!/\.(ts|tsx)$/.test(filePath)) return;
      const relPath = path.relative(ctx.projectRoot, filePath).replace(/\\/g, "/");
      const runtimeRid = semanticRid("runtime", relPath);
      nodes.push({
        decl: { rid: runtimeRid, kind: "runtime", value: relPath, label: path.basename(filePath), registeredAt: scannedAt },
        discoveredBy: ["runtime"],
      });
      const src = fs.readFileSync(filePath, "utf8");
      let m: RegExpExecArray | null;
      GEN_IMPORT_REGEX.lastIndex = 0;
      while ((m = GEN_IMPORT_REGEX.exec(src)) !== null) {
        const importPath: string = m[1] ?? "";
        if (!importPath) continue;
        const genBase = path.basename(importPath).replace(/\.(ts|tsx|js|jsx)$/, "");
        const genRid = semanticRid("gen", genBase);
        edges.push({
          fromRid: runtimeRid, toRid: genRid,
          edgeKind: "runtime-consumes-gen",
          confidence: 1.0,
          evidenceKind: "semantic",
          evidence: `import from "${importPath.slice(0, 120)}"`,
          producer: "runtime",
        });
      }
    });
  }

  if (nodes.length === 0) uncertainties.push(`no runtime entrypoints scanned in ${ctx.projectRoot}`);

  return { producer: "runtime", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
}
