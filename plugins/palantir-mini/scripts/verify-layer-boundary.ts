// palantir-mini — LayerBoundaryV1 verifier.
//
// The verifier is intentionally dependency-free: PR-1 needs deterministic
// checks that can run in any Bun checkout without adding JSON Schema packages.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const LAYER_BOUNDARY_SCHEMA_VERSION = "palantir-mini/layer-boundary-contract/v1";

const PLUGIN_ROOT = resolve(import.meta.dir, "..");
const DEFAULT_CONTRACT_PATH = resolve(PLUGIN_ROOT, "contracts/layer-boundary.contract.json");
const DEFAULT_SCHEMA_PATH = resolve(PLUGIN_ROOT, "schemas/layer-boundary.schema.json");

const LAYER_KEYS = [
  "llmProvider",
  "runtimeAdapter",
  "pluginSource",
  "projectState",
  "runtimeCache",
  "marketplaceRoot",
] as const;

const EXPECTED_ROLES = {
  llmProvider: "llm-provider",
  runtimeAdapter: "runtime-adapter",
  pluginSource: "plugin-source",
  projectState: "project-state",
  runtimeCache: "runtime-cache",
  marketplaceRoot: "marketplace-root",
} as const;

const ROLE_ENUM: Set<string> = new Set(Object.values(EXPECTED_ROLES));

const MUTATION_AUTHORITIES = new Set([
  "none",
  "runtime-owned-state",
  "source-authority",
  "append-only",
  "install-refresh-only",
]);

const REQUIRED_REASON_CODES = [
  "LAYER_BOUNDARY_UNKNOWN_ROLE",
  "LAYER_BOUNDARY_SCHEMA_INVALID",
  "LAYER_BOUNDARY_CACHE_AUTHORITY",
  "LAYER_BOUNDARY_PROVIDER_AUTHORITY",
  "LAYER_BOUNDARY_ADVISORY_AUTHORITY",
  "LAYER_BOUNDARY_MISSING_EVIDENCE",
] as const;

const REQUIRED_EVIDENCE = [
  "approved-semantic-intent-contract",
  "approved-digital-twin-change-contract",
  "layer-boundary-verifier-valid",
  "targeted-tests-passing",
] as const;

const REQUIRED_NON_AUTHORIZING_INPUTS = [
  "free-text-prompt",
  "advisory-review-card",
  "llm-provider-identity",
  "runtime-cache-presence",
  "prompt-front-door-ref-string-without-approved-body",
] as const;

export type LayerBoundarySeverity = "block" | "advisory";

export interface LayerBoundaryIssue {
  field: string;
  reasonCode: string;
  message: string;
  severity: LayerBoundarySeverity;
}

export interface LayerBoundaryLayer {
  role: string;
  authority: string;
  mutationAuthority: string;
  mayAuthorizeProtectedMutation: boolean;
  deterministicForGate: boolean;
  ownedPaths: string[];
  readOnlyPaths: string[];
  forbiddenPaths: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  notes: string;
}

export interface LayerBoundaryContract {
  schemaVersion: string;
  contractId: string;
  sourceAuthority: {
    canonicalMarketplaceRoot: string;
    canonicalPluginSource: string;
    upstreamMarketplaceSource: string;
    upstreamPluginSource: string;
    codexRuntimeCache: string;
    runtimeBoundaryContract: string;
    releasePath: string;
  };
  llmProvider: LayerBoundaryLayer;
  runtimeAdapter: LayerBoundaryLayer;
  pluginSource: LayerBoundaryLayer;
  projectState: LayerBoundaryLayer;
  runtimeCache: LayerBoundaryLayer;
  marketplaceRoot: LayerBoundaryLayer;
  protectedMutationPolicy: {
    defaultDecision: string;
    requiredEvidence: string[];
    nonAuthorizingInputs: string[];
    blockingReasonCodes: string[];
  };
  reasonCodes: Array<{
    code: string;
    severity: LayerBoundarySeverity;
    deniesProtectedMutation: boolean;
    message: string;
  }>;
}

export interface LayerBoundaryVerificationResult {
  valid: boolean;
  contractPath: string;
  schemaPath: string;
  issues: LayerBoundaryIssue[];
  checkedRoles: string[];
}

interface LayerBoundarySchema {
  $schema?: string;
  $id?: string;
  title?: string;
  type?: string;
  required?: string[];
  properties?: Record<string, unknown>;
  $defs?: {
    layer?: {
      properties?: {
        role?: {
          enum?: string[];
        };
      };
    };
  };
}

function addIssue(
  issues: LayerBoundaryIssue[],
  field: string,
  reasonCode: string,
  message: string,
  severity: LayerBoundarySeverity = "block",
): void {
  issues.push({ field, reasonCode, message, severity });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function requireString(
  value: unknown,
  field: string,
  issues: LayerBoundaryIssue[],
): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  addIssue(issues, field, "LAYER_BOUNDARY_SCHEMA_INVALID", `${field} must be a non-empty string`);
  return undefined;
}

function requireStringArray(
  value: unknown,
  field: string,
  issues: LayerBoundaryIssue[],
  options: { minItems?: number } = {},
): string[] {
  if (!Array.isArray(value)) {
    addIssue(issues, field, "LAYER_BOUNDARY_SCHEMA_INVALID", `${field} must be an array`);
    return [];
  }

  const strings = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  if (strings.length !== value.length) {
    addIssue(issues, field, "LAYER_BOUNDARY_SCHEMA_INVALID", `${field} must contain only non-empty strings`);
  }
  if (options.minItems !== undefined && strings.length < options.minItems) {
    addIssue(issues, field, "LAYER_BOUNDARY_SCHEMA_INVALID", `${field} must contain at least ${options.minItems} item(s)`);
  }
  return strings;
}

function validateSchema(schema: LayerBoundarySchema, issues: LayerBoundaryIssue[]): void {
  if (schema.title !== "LayerBoundaryV1") {
    addIssue(issues, "schema.title", "LAYER_BOUNDARY_SCHEMA_INVALID", "schema title must be LayerBoundaryV1");
  }
  if (schema.type !== "object") {
    addIssue(issues, "schema.type", "LAYER_BOUNDARY_SCHEMA_INVALID", "schema root type must be object");
  }

  const required = new Set(schema.required ?? []);
  for (const field of [
    "schemaVersion",
    "sourceAuthority",
    ...LAYER_KEYS,
    "protectedMutationPolicy",
    "reasonCodes",
  ]) {
    if (!required.has(field)) {
      addIssue(issues, `schema.required.${field}`, "LAYER_BOUNDARY_SCHEMA_INVALID", `schema must require ${field}`);
    }
  }

  const roleEnum = schema.$defs?.layer?.properties?.role?.enum ?? [];
  for (const role of ROLE_ENUM) {
    if (!roleEnum.includes(role)) {
      addIssue(issues, `schema.$defs.layer.role.${role}`, "LAYER_BOUNDARY_UNKNOWN_ROLE", `schema role enum must include ${role}`);
    }
  }
}

function validateLayer(
  contract: LayerBoundaryContract,
  layerKey: (typeof LAYER_KEYS)[number],
  issues: LayerBoundaryIssue[],
): void {
  const layer = contract[layerKey];
  const expectedRole = EXPECTED_ROLES[layerKey];
  const prefix = layerKey;

  if (!isRecord(layer)) {
    addIssue(issues, prefix, "LAYER_BOUNDARY_SCHEMA_INVALID", `${prefix} must be an object`);
    return;
  }

  if (layer.role !== expectedRole) {
    addIssue(issues, `${prefix}.role`, "LAYER_BOUNDARY_UNKNOWN_ROLE", `${prefix}.role must be ${expectedRole}`);
  }
  if (!ROLE_ENUM.has(layer.role)) {
    addIssue(issues, `${prefix}.role`, "LAYER_BOUNDARY_UNKNOWN_ROLE", `${layer.role} is not a LayerBoundaryV1 role`);
  }
  if (!MUTATION_AUTHORITIES.has(layer.mutationAuthority)) {
    addIssue(
      issues,
      `${prefix}.mutationAuthority`,
      "LAYER_BOUNDARY_SCHEMA_INVALID",
      `${prefix}.mutationAuthority is not versioned`,
    );
  }

  requireString(layer.authority, `${prefix}.authority`, issues);
  requireString(layer.notes, `${prefix}.notes`, issues);
  requireStringArray(layer.ownedPaths, `${prefix}.ownedPaths`, issues);
  requireStringArray(layer.readOnlyPaths, `${prefix}.readOnlyPaths`, issues);
  requireStringArray(layer.forbiddenPaths, `${prefix}.forbiddenPaths`, issues);
  requireStringArray(layer.allowedActions, `${prefix}.allowedActions`, issues, { minItems: 1 });
  requireStringArray(layer.forbiddenActions, `${prefix}.forbiddenActions`, issues, { minItems: 1 });

  if (typeof layer.mayAuthorizeProtectedMutation !== "boolean") {
    addIssue(issues, `${prefix}.mayAuthorizeProtectedMutation`, "LAYER_BOUNDARY_SCHEMA_INVALID", "mayAuthorizeProtectedMutation must be boolean");
  }
  if (typeof layer.deterministicForGate !== "boolean") {
    addIssue(issues, `${prefix}.deterministicForGate`, "LAYER_BOUNDARY_SCHEMA_INVALID", "deterministicForGate must be boolean");
  }
}

function validateAuthorityInvariants(
  contract: LayerBoundaryContract,
  issues: LayerBoundaryIssue[],
): void {
  if (contract.llmProvider.mayAuthorizeProtectedMutation) {
    addIssue(
      issues,
      "llmProvider.mayAuthorizeProtectedMutation",
      "LAYER_BOUNDARY_PROVIDER_AUTHORITY",
      "LLM provider identity cannot authorize protected mutation",
    );
  }
  if (contract.llmProvider.mutationAuthority !== "none") {
    addIssue(
      issues,
      "llmProvider.mutationAuthority",
      "LAYER_BOUNDARY_PROVIDER_AUTHORITY",
      "LLM provider mutationAuthority must be none",
    );
  }

  if (contract.runtimeAdapter.mayAuthorizeProtectedMutation) {
    addIssue(
      issues,
      "runtimeAdapter.mayAuthorizeProtectedMutation",
      "LAYER_BOUNDARY_ADVISORY_AUTHORITY",
      "Runtime adapters cannot turn native metadata into approval authority",
    );
  }

  if (contract.runtimeCache.mayAuthorizeProtectedMutation) {
    addIssue(
      issues,
      "runtimeCache.mayAuthorizeProtectedMutation",
      "LAYER_BOUNDARY_CACHE_AUTHORITY",
      "Runtime cache cannot authorize protected mutation",
    );
  }
  if (contract.runtimeCache.mutationAuthority !== "install-refresh-only") {
    addIssue(
      issues,
      "runtimeCache.mutationAuthority",
      "LAYER_BOUNDARY_CACHE_AUTHORITY",
      "Runtime cache mutationAuthority must be install-refresh-only",
    );
  }
  if (!contract.runtimeCache.forbiddenPaths.some((path) => path.includes("~/.codex/plugins/cache"))) {
    addIssue(
      issues,
      "runtimeCache.forbiddenPaths",
      "LAYER_BOUNDARY_CACHE_AUTHORITY",
      "Runtime cache paths must be listed as forbidden source-edit paths",
    );
  }

  if (!contract.pluginSource.mayAuthorizeProtectedMutation || !contract.pluginSource.deterministicForGate) {
    addIssue(
      issues,
      "pluginSource",
      "LAYER_BOUNDARY_MISSING_EVIDENCE",
      "Plugin source must remain deterministic source authority",
    );
  }
  if (!contract.marketplaceRoot.mayAuthorizeProtectedMutation || !contract.marketplaceRoot.deterministicForGate) {
    addIssue(
      issues,
      "marketplaceRoot",
      "LAYER_BOUNDARY_MISSING_EVIDENCE",
      "Marketplace root must remain deterministic repository authority",
    );
  }

  if (contract.projectState.mayAuthorizeProtectedMutation) {
    addIssue(
      issues,
      "projectState.mayAuthorizeProtectedMutation",
      "LAYER_BOUNDARY_ADVISORY_AUTHORITY",
      "Project session state is evidence, not approval authority",
    );
  }
}

function validateProtectedMutationPolicy(
  contract: LayerBoundaryContract,
  issues: LayerBoundaryIssue[],
): void {
  const policy = contract.protectedMutationPolicy;
  if (!isRecord(policy)) {
    addIssue(issues, "protectedMutationPolicy", "LAYER_BOUNDARY_SCHEMA_INVALID", "protectedMutationPolicy must be an object");
    return;
  }

  if (policy.defaultDecision !== "deny") {
    addIssue(issues, "protectedMutationPolicy.defaultDecision", "LAYER_BOUNDARY_MISSING_EVIDENCE", "default protected mutation decision must be deny");
  }

  const evidence = requireStringArray(policy.requiredEvidence, "protectedMutationPolicy.requiredEvidence", issues, { minItems: 1 });
  for (const required of REQUIRED_EVIDENCE) {
    if (!evidence.includes(required)) {
      addIssue(
        issues,
        `protectedMutationPolicy.requiredEvidence.${required}`,
        "LAYER_BOUNDARY_MISSING_EVIDENCE",
        `requiredEvidence must include ${required}`,
      );
    }
  }

  const nonAuthorizingInputs = requireStringArray(
    policy.nonAuthorizingInputs,
    "protectedMutationPolicy.nonAuthorizingInputs",
    issues,
    { minItems: 1 },
  );
  for (const required of REQUIRED_NON_AUTHORIZING_INPUTS) {
    if (!nonAuthorizingInputs.includes(required)) {
      addIssue(
        issues,
        `protectedMutationPolicy.nonAuthorizingInputs.${required}`,
        "LAYER_BOUNDARY_ADVISORY_AUTHORITY",
        `nonAuthorizingInputs must include ${required}`,
      );
    }
  }

  const blockingReasonCodes = requireStringArray(
    policy.blockingReasonCodes,
    "protectedMutationPolicy.blockingReasonCodes",
    issues,
    { minItems: 1 },
  );
  for (const required of REQUIRED_REASON_CODES) {
    if (!blockingReasonCodes.includes(required)) {
      addIssue(
        issues,
        `protectedMutationPolicy.blockingReasonCodes.${required}`,
        "LAYER_BOUNDARY_MISSING_EVIDENCE",
        `blockingReasonCodes must include ${required}`,
      );
    }
  }
}

function validateReasonCodes(contract: LayerBoundaryContract, issues: LayerBoundaryIssue[]): void {
  if (!Array.isArray(contract.reasonCodes)) {
    addIssue(issues, "reasonCodes", "LAYER_BOUNDARY_SCHEMA_INVALID", "reasonCodes must be an array");
    return;
  }

  const seen = new Set<string>();
  for (const [index, reason] of contract.reasonCodes.entries()) {
    const prefix = `reasonCodes.${index}`;
    if (!isRecord(reason)) {
      addIssue(issues, prefix, "LAYER_BOUNDARY_SCHEMA_INVALID", `${prefix} must be an object`);
      continue;
    }

    const code = requireString(reason.code, `${prefix}.code`, issues);
    if (code) {
      if (!/^LAYER_BOUNDARY_[A-Z0-9_]+$/.test(code)) {
        addIssue(issues, `${prefix}.code`, "LAYER_BOUNDARY_SCHEMA_INVALID", `${code} is not a stable LayerBoundary reason code`);
      }
      if (seen.has(code)) {
        addIssue(issues, `${prefix}.code`, "LAYER_BOUNDARY_SCHEMA_INVALID", `${code} is duplicated`);
      }
      seen.add(code);
    }

    if (reason.severity !== "block" && reason.severity !== "advisory") {
      addIssue(issues, `${prefix}.severity`, "LAYER_BOUNDARY_SCHEMA_INVALID", "reason severity must be block or advisory");
    }
    if (typeof reason.deniesProtectedMutation !== "boolean") {
      addIssue(issues, `${prefix}.deniesProtectedMutation`, "LAYER_BOUNDARY_SCHEMA_INVALID", "deniesProtectedMutation must be boolean");
    }
    requireString(reason.message, `${prefix}.message`, issues);
  }

  for (const required of REQUIRED_REASON_CODES) {
    const reason = contract.reasonCodes.find((item) => item.code === required);
    if (!reason) {
      addIssue(issues, `reasonCodes.${required}`, "LAYER_BOUNDARY_MISSING_EVIDENCE", `reasonCodes must include ${required}`);
      continue;
    }
    if (reason.severity !== "block" || !reason.deniesProtectedMutation) {
      addIssue(
        issues,
        `reasonCodes.${required}`,
        required,
        `${required} must block and deny protected mutation`,
      );
    }
  }
}

export function validateLayerBoundary(
  contract: LayerBoundaryContract,
  schema: LayerBoundarySchema,
  paths: { contractPath: string; schemaPath: string },
): LayerBoundaryVerificationResult {
  const issues: LayerBoundaryIssue[] = [];

  validateSchema(schema, issues);

  if (contract.schemaVersion !== LAYER_BOUNDARY_SCHEMA_VERSION) {
    addIssue(
      issues,
      "schemaVersion",
      "LAYER_BOUNDARY_SCHEMA_INVALID",
      `schemaVersion must be ${LAYER_BOUNDARY_SCHEMA_VERSION}`,
    );
  }
  requireString(contract.contractId, "contractId", issues);

  if (!isRecord(contract.sourceAuthority)) {
    addIssue(issues, "sourceAuthority", "LAYER_BOUNDARY_SCHEMA_INVALID", "sourceAuthority must be an object");
  } else {
    for (const field of [
      "canonicalMarketplaceRoot",
      "canonicalPluginSource",
      "upstreamMarketplaceSource",
      "upstreamPluginSource",
      "codexRuntimeCache",
      "runtimeBoundaryContract",
      "releasePath",
    ]) {
      requireString(contract.sourceAuthority[field as keyof LayerBoundaryContract["sourceAuthority"]], `sourceAuthority.${field}`, issues);
    }
  }

  for (const layerKey of LAYER_KEYS) {
    validateLayer(contract, layerKey, issues);
  }
  validateAuthorityInvariants(contract, issues);
  validateProtectedMutationPolicy(contract, issues);
  validateReasonCodes(contract, issues);

  return {
    valid: issues.every((issue) => issue.severity !== "block"),
    contractPath: paths.contractPath,
    schemaPath: paths.schemaPath,
    issues,
    checkedRoles: LAYER_KEYS.map((key) => EXPECTED_ROLES[key]),
  };
}

export function verifyLayerBoundary(paths: {
  contractPath?: string;
  schemaPath?: string;
} = {}): LayerBoundaryVerificationResult {
  const contractPath = paths.contractPath ? resolve(paths.contractPath) : DEFAULT_CONTRACT_PATH;
  const schemaPath = paths.schemaPath ? resolve(paths.schemaPath) : DEFAULT_SCHEMA_PATH;
  const contract = readJsonFile<LayerBoundaryContract>(contractPath);
  const schema = readJsonFile<LayerBoundarySchema>(schemaPath);
  return validateLayerBoundary(contract, schema, { contractPath, schemaPath });
}

function parseCliArgs(argv: readonly string[]): {
  contractPath?: string;
  schemaPath?: string;
  help: boolean;
} {
  const contractIndex = argv.findIndex((arg) => arg === "--contract");
  const schemaIndex = argv.findIndex((arg) => arg === "--schema");
  return {
    ...(contractIndex >= 0 && argv[contractIndex + 1] ? { contractPath: argv[contractIndex + 1] } : {}),
    ...(schemaIndex >= 0 && argv[schemaIndex + 1] ? { schemaPath: argv[schemaIndex + 1] } : {}),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp(): void {
  console.log(
    [
      "Usage: bun run scripts/verify-layer-boundary.ts [--contract path] [--schema path]",
      "",
      "With no arguments, verifies contracts/layer-boundary.contract.json against",
      "schemas/layer-boundary.schema.json using deterministic local checks.",
    ].join("\n"),
  );
}

if (import.meta.main) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const result = verifyLayerBoundary(args);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ valid: false, error: message }, null, 2));
    process.exit(2);
  }
}
