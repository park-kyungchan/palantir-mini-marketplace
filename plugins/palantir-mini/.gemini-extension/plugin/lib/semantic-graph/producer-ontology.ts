/**
 * palantir-mini v2.7.0 — Producer: ontology
 * @owner palantirkc-plugin-learn
 * @purpose Scans shared-core + per-project ontology barrels → emits ontology:* SemanticRids + intra-ontology edges.
 */
// Domain: LEARN | Authority: plan §Wave 2 · W2.6 | Wave 3 cross-tier edge emission (sprint-062 W6-ε).

import * as fs from "fs";
import * as path from "path";
import { Project, SyntaxKind } from "ts-morph";
import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";
import { resolveSharedCorePath } from "../runtime-overlay/shared-core-resolve";
import type {
  ProducerContext, ProducerResult, SemanticEdge, SemanticNode,
} from "./types";

const ONTOLOGY_BARRELS = ["data.ts", "logic.ts", "action.ts", "runtime.ts", "frontend.ts", "security.ts"];

function extractExportNames(src: string): string[] {
  const names = new Set<string>();
  const re = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const group = m[1];
    if (!group) continue;
    for (const tok of group.split(",")) {
      const trimmed = tok.trim();
      const name = (trimmed.split(/\s+as\s+/)[0] ?? trimmed).trim();
      if (name && /^[A-Z]/.test(name)) names.add(name);
    }
  }
  return [...names];
}

/**
 * Sprint-062 W6-ε: Wave 3 cross-tier intra-ontology edge emission via ts-morph AST walk.
 *
 * Walks all barrels in `projectOntologyDir` to emit:
 *   - extends/implements → ontology-defines edge (confidence 1.0)
 *   - imports from sibling barrel → ontology-depends-on edge (confidence 0.8)
 *   - type references in declarations → ontology-depends-on edge (confidence 0.6)
 *
 * Deduplicates by (fromRid, toRid, edgeKind) Set.
 */
function emitIntraOntologyEdges(
  projectOntologyDir: string,
  uncertainties: string[]
): SemanticEdge[] {
  const edges: SemanticEdge[] = [];
  const seen = new Set<string>();

  // Map barrel name (without .ts) → set of exported type names.
  // Used to resolve cross-barrel imports to ontology RIDs.
  const barrelExports = new Map<string, Set<string>>();
  for (const barrelName of ONTOLOGY_BARRELS) {
    const barrelPath = path.join(projectOntologyDir, barrelName);
    if (!fs.existsSync(barrelPath)) continue;
    const src = fs.readFileSync(barrelPath, "utf8");
    const domain = barrelName.replace(/\.ts$/, "");
    const names = new Set<string>();
    // Extract inline declarations + re-exports
    for (const name of extractExportNames(src)) names.add(name);
    // Also match: interface X, type X =, class X, enum X
    for (const m of src.matchAll(/(?:interface|type|class|enum)\s+([A-Z][A-Za-z0-9_]*)/g)) {
      if (m[1]) names.add(m[1]);
    }
    barrelExports.set(domain, names);
  }

  // Build reverse lookup: typeName → domain (for same-barrel resolution)
  const typeNameToDomain = new Map<string, string>();
  for (const [domain, names] of barrelExports) {
    for (const name of names) {
      // Last-wins if collision across barrels; acceptable for MVP
      typeNameToDomain.set(name, domain);
    }
  }

  function addEdge(
    fromRid: string,
    toRid: string,
    edgeKind: SemanticEdge["edgeKind"],
    confidence: number,
    evidence?: string
  ): void {
    const key = `${fromRid}::${toRid}::${edgeKind}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({
      fromRid: semanticRid("ontology", fromRid.replace(/^ontology:/, "")),
      toRid: semanticRid("ontology", toRid.replace(/^ontology:/, "")),
      edgeKind,
      confidence,
      evidenceKind: "semantic",
      evidence: evidence?.slice(0, 200),
      producer: "ontology",
    });
  }

  // Walk each barrel with ts-morph
  for (const barrelName of ONTOLOGY_BARRELS) {
    const barrelPath = path.join(projectOntologyDir, barrelName);
    if (!fs.existsSync(barrelPath)) continue;
    const domain = barrelName.replace(/\.ts$/, "");

    let project: Project;
    try {
      project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
    } catch (e) {
      uncertainties.push(`ts-morph Project init failed for ${barrelName}: ${(e as Error).message}`);
      continue;
    }

    let sourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(barrelPath);
    } catch (e) {
      uncertainties.push(`ts-morph could not parse ${barrelName}: ${(e as Error).message}`);
      continue;
    }

    // ── (A) extends/implements → ontology-defines (confidence 1.0) ──────────
    for (const iface of sourceFile.getInterfaces()) {
      const fromName = iface.getName();
      if (!/^[A-Z]/.test(fromName)) continue;
      const fromRid = `${domain}.${fromName}`;

      for (const ext of iface.getExtends()) {
        const extName = ext.getExpression().getText().split("<")[0]!.trim();
        const toDomain = typeNameToDomain.get(extName) ?? domain;
        const toRid = `${toDomain}.${extName}`;
        addEdge(fromRid, toRid, "ontology-defines", 1.0, `interface ${fromName} extends ${extName}`);
      }
    }

    for (const cls of sourceFile.getClasses()) {
      const fromName = cls.getName();
      if (!fromName || !/^[A-Z]/.test(fromName)) continue;
      const fromRid = `${domain}.${fromName}`;

      const baseClass = cls.getBaseClass();
      if (baseClass) {
        const extName = baseClass.getName() ?? "";
        if (extName && /^[A-Z]/.test(extName)) {
          const toDomain = typeNameToDomain.get(extName) ?? domain;
          const toRid = `${toDomain}.${extName}`;
          addEdge(fromRid, toRid, "ontology-defines", 1.0, `class ${fromName} extends ${extName}`);
        }
      }

      for (const impl of cls.getImplements()) {
        const implName = impl.getExpression().getText().split("<")[0]!.trim();
        const toDomain = typeNameToDomain.get(implName) ?? domain;
        const toRid = `${toDomain}.${implName}`;
        addEdge(fromRid, toRid, "ontology-defines", 1.0, `class ${fromName} implements ${implName}`);
      }
    }

    // ── (B) imports from sibling barrel → ontology-depends-on (confidence 0.8) ──
    for (const imp of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      // Only relative sibling imports like "./data" or "./logic"
      if (!moduleSpecifier.startsWith("./") && !moduleSpecifier.startsWith("../")) continue;
      const importedBarrel = path.basename(moduleSpecifier).replace(/\.ts$/, "");
      if (!barrelExports.has(importedBarrel)) continue;

      const importedNames = imp.getNamedImports()
        .map((n) => n.getName())
        .filter((n) => /^[A-Z]/.test(n));

      for (const importedName of importedNames) {
        // The importing barrel depends on each imported type
        // We don't have a specific fromName here at barrel level, so
        // emit a barrel-level dependency for each declaration that uses it
        const toRid = `${importedBarrel}.${importedName}`;

        // Find all declarations in this barrel that reference the imported name
        const refs = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
          .filter((id) => id.getText() === importedName);

        for (const ref of refs) {
          const parentDecl = ref.getParent();
          if (!parentDecl) continue;
          // Find enclosing named declaration
          const namedAncestor = ref.getParentWhile((n) => {
            const k = n.getKind();
            return k !== SyntaxKind.InterfaceDeclaration &&
                   k !== SyntaxKind.ClassDeclaration &&
                   k !== SyntaxKind.TypeAliasDeclaration &&
                   k !== SyntaxKind.FunctionDeclaration;
          });
          const declNode = namedAncestor?.getParent();
          let fromName: string | undefined;
          if (declNode?.getKind() === SyntaxKind.InterfaceDeclaration) {
            fromName = (declNode as ReturnType<typeof sourceFile.getInterfaces>[0]).getName?.();
          } else if (declNode?.getKind() === SyntaxKind.ClassDeclaration) {
            fromName = (declNode as ReturnType<typeof sourceFile.getClasses>[0]).getName?.();
          } else if (declNode?.getKind() === SyntaxKind.TypeAliasDeclaration) {
            fromName = (declNode as ReturnType<typeof sourceFile.getTypeAliases>[0]).getName?.();
          }
          if (fromName && /^[A-Z]/.test(fromName) && fromName !== importedName) {
            const fromRid = `${domain}.${fromName}`;
            addEdge(fromRid, toRid, "ontology-depends-on", 0.8, `import { ${importedName} } from "${moduleSpecifier}"`);
          }
        }

        // Barrel-level fallback: if no specific declaration found, emit domain-level edge
        const hadSpecific = edges.some(
          (e) => (e.toRid as string) === `ontology:${toRid}` && (e.fromRid as string).startsWith(`ontology:${domain}.`)
        );
        if (!hadSpecific) {
          const fromRid = `${domain}._barrel`;
          addEdge(fromRid, toRid, "ontology-depends-on", 0.8, `barrel ${domain} imports ${importedName} from ${importedBarrel}`);
        }
      }
    }

    // ── (C) type references in signatures → ontology-depends-on (confidence 0.6) ──
    for (const iface of sourceFile.getInterfaces()) {
      const fromName = iface.getName();
      if (!/^[A-Z]/.test(fromName)) continue;
      const fromRid = `${domain}.${fromName}`;

      for (const prop of iface.getProperties()) {
        const typeNode = prop.getTypeNode();
        if (!typeNode) continue;
        for (const typeRef of typeNode.getDescendantsOfKind(SyntaxKind.TypeReference)) {
          const refName = typeRef.getTypeName().getText().split("<")[0]!.trim();
          if (!/^[A-Z]/.test(refName) || refName === fromName) continue;
          const toDomain = typeNameToDomain.get(refName) ?? domain;
          if (toDomain === domain && refName === fromName) continue;
          const toRid = `${toDomain}.${refName}`;
          addEdge(fromRid, toRid, "ontology-depends-on", 0.6, `property type reference: ${refName}`);
        }
      }

      for (const method of iface.getMethods()) {
        const returnTypeNode = method.getReturnTypeNode();
        if (returnTypeNode) {
          for (const typeRef of returnTypeNode.getDescendantsOfKind(SyntaxKind.TypeReference)) {
            const refName = typeRef.getTypeName().getText().split("<")[0]!.trim();
            if (!/^[A-Z]/.test(refName) || refName === fromName) continue;
            const toDomain = typeNameToDomain.get(refName) ?? domain;
            const toRid = `${toDomain}.${refName}`;
            addEdge(fromRid, toRid, "ontology-depends-on", 0.6, `method return type: ${refName}`);
          }
        }
        for (const param of method.getParameters()) {
          const paramTypeNode = param.getTypeNode();
          if (!paramTypeNode) continue;
          for (const typeRef of paramTypeNode.getDescendantsOfKind(SyntaxKind.TypeReference)) {
            const refName = typeRef.getTypeName().getText().split("<")[0]!.trim();
            if (!/^[A-Z]/.test(refName) || refName === fromName) continue;
            const toDomain = typeNameToDomain.get(refName) ?? domain;
            const toRid = `${toDomain}.${refName}`;
            addEdge(fromRid, toRid, "ontology-depends-on", 0.6, `method param type: ${refName}`);
          }
        }
      }
    }

    for (const typeAlias of sourceFile.getTypeAliases()) {
      const fromName = typeAlias.getName();
      if (!/^[A-Z]/.test(fromName)) continue;
      const fromRid = `${domain}.${fromName}`;
      const typeNode = typeAlias.getTypeNode();
      if (!typeNode) continue;
      for (const typeRef of typeNode.getDescendantsOfKind(SyntaxKind.TypeReference)) {
        const refName = typeRef.getTypeName().getText().split("<")[0]!.trim();
        if (!/^[A-Z]/.test(refName) || refName === fromName) continue;
        const toDomain = typeNameToDomain.get(refName) ?? domain;
        const toRid = `${toDomain}.${refName}`;
        addEdge(fromRid, toRid, "ontology-depends-on", 0.6, `type alias references: ${refName}`);
      }
    }
  }

  return edges;
}

export async function runProducerOntology(ctx: ProducerContext): Promise<ProducerResult> {
  const t0 = Date.now();
  const nodes: SemanticNode[] = [];
  const edges: SemanticEdge[] = [];
  const uncertainties: string[] = [];
  const scannedAt = new Date().toISOString();

  const sharedCorePath = ctx.sharedCorePath ?? path.join(resolveSharedCorePath().resolvedPath, "index.ts");
  if (fs.existsSync(sharedCorePath)) {
    const src = fs.readFileSync(sharedCorePath, "utf8");
    for (const name of extractExportNames(src)) {
      const rid = semanticRid("ontology", `shared-core.${name}`);
      nodes.push({
        decl: { rid, kind: "ontology", value: `shared-core.${name}`, label: name, registeredAt: scannedAt },
        discoveredBy: ["ontology"],
      });
    }
  } else {
    uncertainties.push(`shared-core not found at ${sharedCorePath}`);
  }

  const projectOntology = path.join(ctx.projectRoot, "ontology");
  if (fs.existsSync(projectOntology)) {
    for (const barrelName of ONTOLOGY_BARRELS) {
      const barrelPath = path.join(projectOntology, barrelName);
      if (!fs.existsSync(barrelPath)) continue;
      const src = fs.readFileSync(barrelPath, "utf8");
      for (const name of extractExportNames(src)) {
        const domain = barrelName.replace(/\.ts$/, "");
        const rid = semanticRid("ontology", `${domain}.${name}`);
        nodes.push({
          decl: { rid, kind: "ontology", value: `${domain}.${name}`, label: name, registeredAt: scannedAt },
          discoveredBy: ["ontology"],
        });
      }
    }

    // Sprint-062 W6-ε: Wave 3 cross-tier intra-ontology edge emission.
    // Replaces the MVP placeholder "no intra-ontology edges in Wave 2".
    const intraEdges = emitIntraOntologyEdges(projectOntology, uncertainties);
    for (const e of intraEdges) edges.push(e);
  } else {
    uncertainties.push(`no project-local ontology dir at ${projectOntology}`);
  }

  return { producer: "ontology", nodes, edges, uncertainties, durationMs: Date.now() - t0 };
}
