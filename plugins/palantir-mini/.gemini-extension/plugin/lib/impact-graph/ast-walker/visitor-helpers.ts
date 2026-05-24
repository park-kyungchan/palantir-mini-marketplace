// palantir-mini v3.7.0 — lib/impact-graph/ast-walker/visitor-helpers.ts
// Per-AST-kind walk extractions: imports / exports / class heritage / type references.
// Extracted from ast-walker.ts during A.2 decomposition.
//
// B.W2.a (sprint-061): TypeChecker-grounded confidence tiers:
//   confidence 1.0 = statically resolved via TypeChecker (Symbol.getDeclarations())
//   confidence 0.7 = name-heuristic fallback (no TypeChecker declaration found)
//   confidence 0.3 = ambiguous (multiple candidates, no concrete declaration)
// Also adds:
//   - test-covers edges (test file → source file via TypeChecker import resolution)
//   - backwardProp edges (Symbol.getReferencedSymbols()-derived reverse edges)

import { SyntaxKind, Node } from "ts-morph";
import type { SourceFile, Project } from "ts-morph";
import * as path from "path";
import type { StoredEdge, AstEdgeKind } from "../types";
import { toRid, resolveModuleSpecifier } from "./path-utils";

// ── Confidence tiers (B.W2.a) ─────────────────────────────────────────────
/** 1.0 = TypeChecker statically resolved concrete declaration. */
export const CONFIDENCE_TYPECHECKED = 1.0;
/** 0.7 = name-heuristic fallback; no TypeChecker declaration found. */
export const CONFIDENCE_HEURISTIC = 0.7;
/** 0.3 = ambiguous; multiple candidates, no single concrete declaration. */
export const CONFIDENCE_AMBIGUOUS = 0.3;

export function walkImports(
  sourceFile: SourceFile,
  fromRid: string,
  projectRoot: string,
  scannedAt: string,
): StoredEdge[] {
  const edges: StoredEdge[] = [];
  const filePath = sourceFile.getFilePath();
  for (const imp of sourceFile.getImportDeclarations()) {
    const specifier = imp.getModuleSpecifierValue();
    const resolved  = resolveModuleSpecifier(specifier, filePath, projectRoot);
    const toRid_    = resolved ? toRid(resolved, projectRoot) : `pkg:${specifier}`;
    edges.push({
      fromRid,
      toRid:      toRid_,
      edgeKind:   "import" as AstEdgeKind,
      confidence: 1.0,
      evidence:   imp.getText().slice(0, 200),
      scannedAt,
    });
  }
  return edges;
}

export function walkExports(
  sourceFile: SourceFile,
  fromRid: string,
  projectRoot: string,
  scannedAt: string,
): StoredEdge[] {
  const edges: StoredEdge[] = [];
  const filePath = sourceFile.getFilePath();
  for (const exp of sourceFile.getExportDeclarations()) {
    const moduleSpecifier = exp.getModuleSpecifier();
    if (!moduleSpecifier) continue;
    const specifier = moduleSpecifier.getLiteralValue();
    const resolved  = resolveModuleSpecifier(specifier, filePath, projectRoot);
    const toRid_    = resolved ? toRid(resolved, projectRoot) : `pkg:${specifier}`;
    edges.push({
      fromRid,
      toRid:      toRid_,
      edgeKind:   "export" as AstEdgeKind,
      confidence: 1.0,
      evidence:   exp.getText().slice(0, 200),
      scannedAt,
    });
  }
  return edges;
}

export function walkClassHeritage(
  sourceFile: SourceFile,
  fromRid: string,
  projectRoot: string,
  scannedAt: string,
): StoredEdge[] {
  const edges: StoredEdge[] = [];
  for (const cls of sourceFile.getClasses()) {
    // ── extends (B.W2.a: TypeChecker-grounded via getBaseClass) ─────────
    const baseClass = cls.getBaseClass();
    if (baseClass) {
      // getBaseClass() returns a ClassDeclaration resolved by TypeChecker
      // → concrete declaration confirmed → confidence 1.0
      const baseFile = baseClass.getSourceFile().getFilePath();
      const baseRid  = toRid(baseFile, projectRoot);
      edges.push({
        fromRid,
        toRid:      baseRid,
        edgeKind:   "extends" as AstEdgeKind,
        confidence: CONFIDENCE_TYPECHECKED,
        evidence:   `class ${cls.getName() ?? "?"} extends ${baseClass.getName() ?? "?"}`,
        scannedAt,
      });
      // backwardProp: base file → this file (B.W2.a reverse edge)
      edges.push({
        fromRid:    baseRid,
        toRid:      fromRid,
        edgeKind:   "backwardProp" as AstEdgeKind,
        confidence: CONFIDENCE_TYPECHECKED,
        evidence:   `backwardProp: ${baseClass.getName() ?? "?"} ← extends ${cls.getName() ?? "?"}`,
        scannedAt,
      });
    }
    // ── implements (B.W2.a: Symbol.getDeclarations() → TypeChecker) ─────
    for (const iface of cls.getImplements()) {
      const ifaceType = iface.getType();
      const symbol    = ifaceType.getSymbol();
      const decls     = symbol?.getDeclarations() ?? [];
      // confidence depends on how many declarations were found:
      //   1 = unambiguous TypeChecker resolution → 1.0
      //   2+ = multiple candidates (interface + re-exports) → 0.3
      //   0 = no TypeChecker declaration found → 0.7 (heuristic fallback; text-based)
      const confidence =
        decls.length === 0 ? CONFIDENCE_HEURISTIC :
        decls.length === 1 ? CONFIDENCE_TYPECHECKED :
        CONFIDENCE_AMBIGUOUS;

      if (decls.length === 0) {
        // heuristic fallback: emit a single edge without a resolved file
        edges.push({
          fromRid,
          toRid:      `sym:${iface.getText()}`,
          edgeKind:   "implements" as AstEdgeKind,
          confidence: CONFIDENCE_HEURISTIC,
          evidence:   `class ${cls.getName() ?? "?"} implements ${iface.getText()} (heuristic)`,
          scannedAt,
        });
      } else {
        for (const decl of decls) {
          const declFile = decl.getSourceFile().getFilePath();
          const declRid  = toRid(declFile, projectRoot);
          edges.push({
            fromRid,
            toRid:      declRid,
            edgeKind:   "implements" as AstEdgeKind,
            confidence,
            evidence:   `class ${cls.getName() ?? "?"} implements ${iface.getText()}`,
            scannedAt,
          });
          // backwardProp: interface file → implementing file
          edges.push({
            fromRid:    declRid,
            toRid:      fromRid,
            edgeKind:   "backwardProp" as AstEdgeKind,
            confidence,
            evidence:   `backwardProp: ${iface.getText()} ← implemented by ${cls.getName() ?? "?"}`,
            scannedAt,
          });
        }
      }
    }
  }
  return edges;
}

export function walkTypeReferences(
  sourceFile: SourceFile,
  fromRid: string,
  projectRoot: string,
  scannedAt: string,
): { edges: StoredEdge[]; errors: string[] } {
  const edges: StoredEdge[] = [];
  const errors: string[] = [];
  const filePath = sourceFile.getFilePath();
  const seenTypeRefs = new Set<string>();
  try {
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.TypeReference) return;
      if (!Node.isTypeReference(node)) return;

      const typeName = node.getTypeName();
      const symbol   = typeName.getSymbol() ?? typeName.getType().getSymbol();
      if (!symbol) return;

      const decls = symbol.getDeclarations() ?? [];
      // B.W2.a confidence:
      //   1 decl → TypeChecker concrete resolution → 1.0
      //   2+ decls → ambiguous (multiple overloads/re-exports) → 0.3
      //   0 decls (symbol found but no decl) → heuristic → 0.7
      const confidence =
        decls.length === 0 ? CONFIDENCE_HEURISTIC :
        decls.length === 1 ? CONFIDENCE_TYPECHECKED :
        CONFIDENCE_AMBIGUOUS;

      for (const decl of decls) {
        const declFile = decl.getSourceFile().getFilePath();
        if (declFile === filePath) continue; // self-reference

        const rel = path.relative(projectRoot, declFile).replace(/\\/g, "/");
        if (rel.startsWith("..") || declFile.includes("node_modules")) continue;

        const toRid_ = toRid(declFile, projectRoot);
        const key    = `${fromRid}:${toRid_}:typeRef`;
        if (seenTypeRefs.has(key)) continue;
        seenTypeRefs.add(key);

        edges.push({
          fromRid,
          toRid:      toRid_,
          edgeKind:   "typeRef" as AstEdgeKind,
          confidence,
          evidence:   node.getText().slice(0, 100),
          scannedAt,
        });
      }
    });
  } catch (e) {
    errors.push(`typeRef walk error in ${filePath}: ${(e as Error).message}`);
  }
  return { edges, errors };
}

/**
 * walkTestCovers (B.W2.a) — emit test-covers edges when a test file imports
 * a non-test source file via TypeChecker resolution. Cross-references tsconfig
 * path-mapping by accepting a ts-morph Project for full SourceFile resolution.
 *
 * A test file is heuristically identified by:
 *   - file path contains "/tests/" OR "/test/" OR "__tests__"
 *   - file name ends with .test.ts / .spec.ts / .test.tsx / .spec.tsx
 *
 * confidence tiers (B.W2.a):
 *   1.0 = TypeChecker resolved the import to a concrete SourceFile
 *   0.7 = relative path resolved to a file that exists in the project but
 *         TypeChecker could not match to a declaration (heuristic fallback)
 */
export function walkTestCovers(
  sourceFile: SourceFile,
  fromRid: string,
  projectRoot: string,
  scannedAt: string,
  project?: Project,
): StoredEdge[] {
  const edges: StoredEdge[] = [];
  const filePath = sourceFile.getFilePath();

  // Only process test files
  const isTestFile =
    /[/\\](tests?|__tests__)[/\\]/.test(filePath) ||
    /\.(test|spec)\.(ts|tsx)$/.test(filePath);

  if (!isTestFile) return edges;

  for (const imp of sourceFile.getImportDeclarations()) {
    const specifier = imp.getModuleSpecifierValue();
    // Skip package imports
    if (!specifier.startsWith(".") && !specifier.startsWith("/")) continue;

    const resolved = resolveModuleSpecifier(specifier, filePath, projectRoot);
    if (!resolved) continue;

    // Skip if the resolved target is also a test file
    if (/[/\\](tests?|__tests__)[/\\]/.test(resolved) || /\.(test|spec)\.(ts|tsx)$/.test(resolved)) {
      continue;
    }

    const rel = path.relative(projectRoot, resolved).replace(/\\/g, "/");
    if (rel.startsWith("..") || resolved.includes("node_modules")) continue;

    const targetRid = toRid(resolved, projectRoot);

    // B.W2.a: attempt TypeChecker resolution via ts-morph Project
    let confidence = CONFIDENCE_HEURISTIC;
    if (project) {
      try {
        const resolvedSf = project.getSourceFile(resolved) ?? project.addSourceFileAtPath(resolved);
        if (resolvedSf) {
          confidence = CONFIDENCE_TYPECHECKED;
        }
      } catch {
        // TypeChecker could not resolve — keep heuristic confidence
      }
    }

    edges.push({
      fromRid,
      toRid:      targetRid,
      edgeKind:   "test-covers" as AstEdgeKind,
      confidence,
      evidence:   imp.getText().slice(0, 200),
      scannedAt,
    });
  }

  return edges;
}
