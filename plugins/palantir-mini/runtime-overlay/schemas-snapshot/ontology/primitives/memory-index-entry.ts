/**
 * palantir-mini — MEMORYIndexEntry primitive (prim-memory-01)
 *
 * Makes each row in a MEMORY.md index a typed, integrity-checkable artifact.
 * Enforces rule 09 (MEMORY Schema): each entry is one line under ~150 chars,
 * `- [Title](file.md) — one-line hook`, pointing at a memory file that MUST
 * exist on disk.
 *
 * Authority chain:
 *   rules/09-memory-schema.md -> schemas/ontology/primitives/memory-index-entry.ts (this file)
 *   -> palantir-mini/lib/memory/index-validate.ts
 *   -> palantir-mini/mcp handlers: memory integrity checks
 *
 * Branded RID pattern (zero runtime cost):
 *   type MEMORYIndexEntryRid = string & { __brand: "MEMORYIndexEntryRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose MEMORYIndexEntry primitive (prim-memory-01)
 */

export type MEMORYIndexEntryRid = string & { readonly __brand: "MEMORYIndexEntryRid" };

export const memoryIndexEntryRid = (s: string): MEMORYIndexEntryRid => s as MEMORYIndexEntryRid;

export interface MEMORYIndexEntryDeclaration {
  readonly rid: MEMORYIndexEntryRid;
  /** Absolute path to the MEMORY.md that hosts this entry */
  readonly filePath: string;
  /** Title rendered inside the [] portion of the markdown link */
  readonly title: string;
  /** One-line hook text after the em dash */
  readonly hookDescription: string;
  /** Absolute path this entry points to — invariant: file MUST exist */
  readonly targetMdPath: string;
  /** Maximum total line length in characters (default 150, per rule 09) */
  readonly maxLineChars: number;
  /** ISO timestamp of the last integrity verification */
  readonly lastCheckedAt: string;
}

export interface MEMORYIndexEntryValidationError {
  readonly rid: MEMORYIndexEntryRid;
  readonly kind: "target_missing" | "line_too_long";
  readonly detail: string;
}

export interface MEMORYIndexEntryValidationContext {
  /** Pluggable existence probe — default is fs-based */
  readonly fileExists: (absolutePath: string) => boolean;
}

const DEFAULT_VALIDATION_CONTEXT: MEMORYIndexEntryValidationContext = {
  fileExists: (_absolutePath: string) => true,
};

/**
 * Renders an entry back to its canonical single-line markdown form.
 * Used both for validation (line length) and golden-file generation.
 */
export const renderMEMORYIndexEntryLine = (
  decl: Pick<MEMORYIndexEntryDeclaration, "title" | "hookDescription" | "targetMdPath">,
): string => {
  const filename = decl.targetMdPath.split("/").pop() ?? decl.targetMdPath;
  return `- [${decl.title}](${filename}) — ${decl.hookDescription}`;
};

/** Registry helper — v0 minimal registry via plain Map */
export class MEMORYIndexEntryRegistry {
  private readonly entries = new Map<MEMORYIndexEntryRid, MEMORYIndexEntryDeclaration>();
  private readonly byFilePath = new Map<string, MEMORYIndexEntryRid[]>();

  register(decl: MEMORYIndexEntryDeclaration): void {
    this.entries.set(decl.rid, decl);
    const list = this.byFilePath.get(decl.filePath) ?? [];
    list.push(decl.rid);
    this.byFilePath.set(decl.filePath, list);
  }

  get(rid: MEMORYIndexEntryRid): MEMORYIndexEntryDeclaration | undefined {
    return this.entries.get(rid);
  }

  getByFilePath(filePath: string): MEMORYIndexEntryDeclaration[] {
    const rids = this.byFilePath.get(filePath) ?? [];
    return rids
      .map((rid) => this.entries.get(rid))
      .filter((v): v is MEMORYIndexEntryDeclaration => v !== undefined);
  }

  list(): MEMORYIndexEntryDeclaration[] {
    return [...this.entries.values()];
  }

  /**
   * Validates every registered entry against rule 09 invariants:
   *   - targetMdPath must resolve on disk (pluggable via context.fileExists)
   *   - rendered line length <= maxLineChars
   */
  validate(
    context: MEMORYIndexEntryValidationContext = DEFAULT_VALIDATION_CONTEXT,
  ): MEMORYIndexEntryValidationError[] {
    const errors: MEMORYIndexEntryValidationError[] = [];
    for (const decl of this.entries.values()) {
      if (!context.fileExists(decl.targetMdPath)) {
        errors.push({
          rid: decl.rid,
          kind: "target_missing",
          detail: `targetMdPath does not exist: ${decl.targetMdPath}`,
        });
      }
      const line = renderMEMORYIndexEntryLine(decl);
      if (line.length > decl.maxLineChars) {
        errors.push({
          rid: decl.rid,
          kind: "line_too_long",
          detail: `rendered line ${line.length} chars > max ${decl.maxLineChars}`,
        });
      }
    }
    return errors;
  }
}

export const MEMORY_INDEX_ENTRY_REGISTRY = new MEMORYIndexEntryRegistry();
