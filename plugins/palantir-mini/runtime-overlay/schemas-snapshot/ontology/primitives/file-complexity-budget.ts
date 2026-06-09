/**
 * palantir-mini — FileComplexityBudget primitive (prim-learn-07)
 *
 * Per-path line/symbol budgets. Lets the system flag decomposition
 * candidates automatically instead of relying on ad-hoc review.
 *
 * Authority chain:
 *   research/palantir/ -> schemas/ontology/primitives/file-complexity-budget.ts
 *   -> palantir-mini/lib/audits/file-budget-watch.ts
 *   -> project monitor output
 *
 * Branded RID pattern (zero runtime cost):
 *   type FileComplexityBudgetRid = string & { __brand: "FileComplexityBudgetRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose FileComplexityBudget primitive (prim-learn-07)
 */

export type FileComplexityBudgetRid = string & {
  readonly __brand: "FileComplexityBudgetRid";
};

export const fileComplexityBudgetRid = (s: string): FileComplexityBudgetRid =>
  s as FileComplexityBudgetRid;

export interface FileComplexityBudgetDeclaration {
  readonly rid: FileComplexityBudgetRid;
  /** Glob the budget applies to (e.g. "**\/ontology/**\/*.ts") */
  readonly pathGlob: string;
  /** Hard ceiling on line count before the file is flagged */
  readonly maxLines: number;
  /** Optional ceiling on exported-symbol count */
  readonly maxSymbols?: number;
  /** Suggested decomposition strategy (e.g. "split by domain") */
  readonly decompositionHint?: string;
  /** Why this budget exists — shown in audit output */
  readonly rationale?: string;
}

export interface FileBudgetScanResult {
  readonly file: string;
  readonly actualLines: number;
  readonly budget: FileComplexityBudgetDeclaration;
  readonly over: boolean;
}

/** Registry helper — v0 minimal registry via plain Map */
export class FileComplexityBudgetRegistry {
  private readonly budgets = new Map<
    FileComplexityBudgetRid,
    FileComplexityBudgetDeclaration
  >();

  register(decl: FileComplexityBudgetDeclaration): void {
    this.budgets.set(decl.rid, decl);
  }

  get(rid: FileComplexityBudgetRid): FileComplexityBudgetDeclaration | undefined {
    return this.budgets.get(rid);
  }

  list(): FileComplexityBudgetDeclaration[] {
    return [...this.budgets.values()];
  }

  /**
   * Scan a project for budget violations. The actual glob + line-count
   * implementation lives in the audits layer; this contract defines the
   * shape of what a scanner must return.
   */
  scan(
    projectPath: string,
    measure: (glob: string) => ReadonlyArray<{ file: string; lines: number }>,
  ): FileBudgetScanResult[] {
    const results: FileBudgetScanResult[] = [];
    for (const budget of this.budgets.values()) {
      const hits = measure(budget.pathGlob);
      for (const hit of hits) {
        results.push({
          file: hit.file,
          actualLines: hit.lines,
          budget,
          over: hit.lines > budget.maxLines,
        });
      }
    }
    return results;
  }
}

export const FILE_COMPLEXITY_BUDGET_REGISTRY = new FileComplexityBudgetRegistry();

// --- Default budgets (demonstration + home-repo baseline) ---

export const ONTOLOGY_FILE_BUDGET: FileComplexityBudgetDeclaration = {
  rid: fileComplexityBudgetRid("budget:ontology"),
  pathGlob: "**/ontology/**/*.ts",
  maxLines: 600,
  decompositionHint: "split by domain",
  rationale:
    "Ontology files past 600 lines typically mix domains; split before codegen blows up.",
};

export const PRIMITIVE_FILE_BUDGET: FileComplexityBudgetDeclaration = {
  rid: fileComplexityBudgetRid("budget:primitive"),
  pathGlob: "**/primitives/*.ts",
  maxLines: 250,
  decompositionHint: "one concept per primitive file",
  rationale:
    "Primitives must stay small and self-describing; if one exceeds 250 lines it is carrying two concerns.",
};

export const HANDLER_FILE_BUDGET: FileComplexityBudgetDeclaration = {
  rid: fileComplexityBudgetRid("budget:handler"),
  pathGlob: "**/handlers/*.ts",
  maxLines: 200,
  decompositionHint: "extract validation + side-effect helpers",
  rationale:
    "Handlers past 200 lines start hiding branches; split validation from effect.",
};
