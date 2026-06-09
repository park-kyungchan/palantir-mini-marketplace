/**
 * palantir-mini — ProjectSchemaPin primitive (prim-learn-06)
 *
 * Typed wrap of a consumer project's `package.json#peerDependencies`
 * pin on `@palantirKC/claude-schemas`. Substrate for rule 08
 * (schema-versioning): pm-verify blocks when the consumer pin is
 * incompatible with the installed schema version.
 *
 * Authority chain:
 *   research/palantir/ -> rules/08-schema-versioning.md
 *   -> schemas/ontology/primitives/project-schema-pin.ts (this file)
 *   -> palantir-mini/bridge/handlers/verify-schema-pin.ts
 *
 * Branded RID pattern (zero runtime cost):
 *   type ProjectSchemaPinRid = string & { __brand: "ProjectSchemaPinRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose ProjectSchemaPin primitive (prim-learn-06)
 */

export type ProjectSchemaPinRid = string & {
  readonly __brand: "ProjectSchemaPinRid";
};

export const projectSchemaPinRid = (s: string): ProjectSchemaPinRid =>
  s as ProjectSchemaPinRid;

export type SchemaCompatibilityVerdict =
  | "compatible"
  | "incompatible"
  | "unknown";

export interface ProjectSchemaPinDeclaration {
  readonly rid: ProjectSchemaPinRid;
  /** Which consumer project this pin applies to */
  readonly projectRid: string;
  /** Semver pin declared in the consumer's package.json (e.g. "^1.12.0") */
  readonly pinnedSchema: string;
  /** Semver actually resolved at install time (e.g. "1.12.4") */
  readonly installedSchema: string;
  readonly compatibilityVerdict: SchemaCompatibilityVerdict;
  /** ISO timestamp of last resolution */
  readonly lastResolvedAt: string;
  /** Human-readable reason for the verdict (displayed in pm-verify output) */
  readonly reason?: string;
}

export interface SchemaPinVerifier {
  (
    projectPath: string,
    pluginCompatibleSchemaRange: string,
  ): ProjectSchemaPinDeclaration;
}

/** Registry helper — v0 minimal registry via plain Map */
export class ProjectSchemaPinRegistry {
  private readonly pins = new Map<
    ProjectSchemaPinRid,
    ProjectSchemaPinDeclaration
  >();

  register(decl: ProjectSchemaPinDeclaration): void {
    this.pins.set(decl.rid, decl);
  }

  get(rid: ProjectSchemaPinRid): ProjectSchemaPinDeclaration | undefined {
    return this.pins.get(rid);
  }

  list(): ProjectSchemaPinDeclaration[] {
    return [...this.pins.values()];
  }

  /**
   * Verify a project's pin against the plugin's compatible-schema range.
   * The caller provides the actual package.json reader + semver resolver
   * so this primitive stays free of fs / semver dependencies.
   */
  verify(
    projectPath: string,
    pluginCompatibleSchemaRange: string,
    verifier: SchemaPinVerifier,
  ): ProjectSchemaPinDeclaration {
    const decl = verifier(projectPath, pluginCompatibleSchemaRange);
    this.pins.set(decl.rid, decl);
    return decl;
  }

  /** All pins currently marked incompatible — pm-verify surfaces these. */
  incompatible(): ProjectSchemaPinDeclaration[] {
    return [...this.pins.values()].filter(
      (p) => p.compatibilityVerdict === "incompatible",
    );
  }
}

export const PROJECT_SCHEMA_PIN_REGISTRY = new ProjectSchemaPinRegistry();
