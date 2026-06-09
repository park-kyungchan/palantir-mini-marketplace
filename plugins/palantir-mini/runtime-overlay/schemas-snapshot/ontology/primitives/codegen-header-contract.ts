/**
 * palantir-mini — CodegenHeaderContract primitive (prim-learn-11)
 *
 * Makes the rule 11 (codegen-authority) header invariant explicit and
 * enforceable. Every file under a generated glob MUST carry the declared
 * header fields; this primitive defines what MUST appear.
 *
 * Authority chain:
 *   research/palantir/ -> rules/11-codegen-authority.md
 *   -> schemas/ontology/primitives/codegen-header-contract.ts
 *   -> palantir-mini/hooks/generated-header-check.ts
 *
 * Branded RID pattern (zero runtime cost):
 *   type CodegenHeaderContractRid = string & { __brand: "CodegenHeaderContractRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose CodegenHeaderContract primitive (prim-learn-11)
 */

export type CodegenHeaderContractRid = string & {
  readonly __brand: "CodegenHeaderContractRid";
};

export const codegenHeaderContractRid = (
  s: string,
): CodegenHeaderContractRid => s as CodegenHeaderContractRid;

export interface CodegenHeaderContractDeclaration {
  readonly rid: CodegenHeaderContractRid;
  /** Fields that MUST appear in the header block */
  readonly requiredFields: ReadonlyArray<string>;
  /** Regex source used to locate the header block inside a file */
  readonly pattern: string;
  /** Glob of files this contract applies to */
  readonly appliesTo: string;
}

export interface CodegenHeaderValidation {
  readonly valid: boolean;
  readonly missingFields: ReadonlyArray<string>;
}

export interface FileReader {
  (filePath: string): string;
}

/** Registry helper — v0 minimal registry via plain Map */
export class CodegenHeaderContractRegistry {
  private readonly contracts = new Map<
    CodegenHeaderContractRid,
    CodegenHeaderContractDeclaration
  >();

  register(decl: CodegenHeaderContractDeclaration): void {
    this.contracts.set(decl.rid, decl);
  }

  get(
    rid: CodegenHeaderContractRid,
  ): CodegenHeaderContractDeclaration | undefined {
    return this.contracts.get(rid);
  }

  list(): CodegenHeaderContractDeclaration[] {
    return [...this.contracts.values()];
  }

  /**
   * Validate a single file against a contract. Caller supplies a `reader`
   * so this primitive stays free of fs dependencies.
   */
  validate(
    contractRid: CodegenHeaderContractRid,
    filePath: string,
    reader: FileReader,
  ): CodegenHeaderValidation {
    const contract = this.contracts.get(contractRid);
    if (!contract) {
      return { valid: false, missingFields: ["<no-contract>"] };
    }
    const body = reader(filePath);
    const missing: string[] = [];
    for (const field of contract.requiredFields) {
      if (!body.includes(field)) {
        missing.push(field);
      }
    }
    return {
      valid: missing.length === 0,
      missingFields: missing,
    };
  }
}

export const CODEGEN_HEADER_CONTRACT_REGISTRY =
  new CodegenHeaderContractRegistry();

export const DEFAULT_CONTRACT: CodegenHeaderContractDeclaration = {
  rid: codegenHeaderContractRid("contract:codegen:default"),
  requiredFields: [
    "schemaVersion",
    "ontologyHash",
    "generatorVersion",
    "timestamp",
  ],
  pattern: String.raw`^// @generated\s+\{[^}]*\}$`,
  appliesTo: "**/src/generated/**/*.ts",
};
