import type {
  DigitalTwinChangeContract,
  DigitalTwinDecisionDomain,
} from "../lead-intent/contracts";
import type {
  ActionTypeRef,
  MCPToolRef,
  ProjectSurfaceRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";
import type { ProjectScopeDefinition } from "../project-scope/types";
import {
  getMcpToolCapability,
  type McpToolDataAction,
} from "../capability-registry/mcp-tool-capability";

export type DtcTypedSurfaceKind =
  | "FileSurface"
  | "MCPTool"
  | "ActionType"
  | "ProjectSurface"
  | "ReleaseDeploy"
  | "DataAction"
  | "Egress";

export interface DtcSurfaceMismatchDiagnostic {
  readonly kind: DtcTypedSurfaceKind;
  readonly target: string;
  readonly expected: readonly string[];
  readonly reason: string;
}

export interface DtcMutationSurfacePolicy {
  /**
   * Compatibility fields. These remain string ref bags for existing callers.
   * New typed callers should prefer the per-kind fields below.
   */
  readonly allowedSurfaceRefs: readonly string[];
  readonly forbiddenSurfaceRefs: readonly string[];
  readonly allowedFileSurfaceRefs: readonly string[];
  readonly forbiddenFileSurfaceRefs: readonly string[];
  readonly allowedMcpToolRefs: readonly string[];
  readonly forbiddenMcpToolRefs: readonly string[];
  readonly allowedActionTypeRefs: readonly string[];
  readonly forbiddenActionTypeRefs: readonly string[];
  readonly allowedProjectSurfaceRefs: readonly string[];
  readonly forbiddenProjectSurfaceRefs: readonly string[];
  readonly allowedDataActions: readonly McpToolDataAction[];
  readonly forbiddenDataActions: readonly McpToolDataAction[];
  readonly allowedReleaseDeployRefs: readonly string[];
  readonly forbiddenReleaseDeployRefs: readonly string[];
  readonly allowedExternalEgressRefs: readonly string[];
  readonly forbiddenExternalEgressRefs: readonly string[];
  readonly diagnostics: readonly DtcSurfaceMismatchDiagnostic[];
  readonly requiredUserDecisionIds: readonly string[];
  readonly reviewDomainsClosed: readonly DigitalTwinDecisionDomain[];
}

const CLOSED_DECISION_STATUSES = new Set(["approved", "accepted-risk", "out-of-scope"]);

export function extractDtcMutationSurfacePolicy(
  dtc: DigitalTwinChangeContract,
): DtcMutationSurfacePolicy {
  const allowed = new Set<string>();
  const forbidden = new Set<string>();
  const allowedFile = new Set<string>();
  const forbiddenFile = new Set<string>();
  const allowedMcp = new Set<string>();
  const forbiddenMcp = new Set<string>();
  const allowedActionType = new Set<string>();
  const forbiddenActionType = new Set<string>();
  const allowedProjectSurface = new Set<string>();
  const forbiddenProjectSurface = new Set<string>();
  const allowedDataAction = new Set<McpToolDataAction>();
  const forbiddenDataAction = new Set<McpToolDataAction>();
  const allowedReleaseDeploy = new Set<string>();
  const forbiddenReleaseDeploy = new Set<string>();
  const allowedExternalEgress = new Set<string>();
  const forbiddenExternalEgress = new Set<string>();
  const diagnostics: DtcSurfaceMismatchDiagnostic[] = [];
  const requiredUserDecisionIds: string[] = [];
  const reviewDomainsClosed = new Set<DigitalTwinDecisionDomain>();

  for (const surface of dtc.permittedMutationSurfaces ?? []) {
    const ref = surface.surfaceRef;
    const readOnlyForbidden = surface.mutationKind === "read-only";
    const compatibilityTarget = readOnlyForbidden ? forbidden : allowed;

    if (ref.kind === "FileSurface") {
      const refs = collectFileSurfaceRefTokens(ref);
      addTokens(readOnlyForbidden ? forbiddenFile : allowedFile, refs);
      addTokens(compatibilityTarget, refs);
      continue;
    }

    if (ref.kind === "MCPTool") {
      const refs = collectMcpToolRefTokens(ref);
      addTokens(readOnlyForbidden ? forbiddenMcp : allowedMcp, refs);
      addTokens(compatibilityTarget, refs);

      const capability = resolveCapabilityForMcpRef(ref);
      if (capability?.dataAction && capability.dataAction !== "none") {
        (readOnlyForbidden ? forbiddenDataAction : allowedDataAction).add(capability.dataAction);
      }
      if (capability?.releaseDeploy || surface.mutationKind === "deploy") {
        addTokens(readOnlyForbidden ? forbiddenReleaseDeploy : allowedReleaseDeploy, refs);
      }
      if (capability?.externalEgress) {
        addTokens(readOnlyForbidden ? forbiddenExternalEgress : allowedExternalEgress, refs);
      }
      continue;
    }

    if (ref.kind === "ActionType") {
      const refs = collectActionTypeRefTokens(ref);
      addTokens(readOnlyForbidden ? forbiddenActionType : allowedActionType, refs);
      addTokens(compatibilityTarget, refs);
      continue;
    }

    if (ref.kind === "ProjectSurface") {
      const refs = collectProjectSurfaceRefTokens(ref);
      addTokens(readOnlyForbidden ? forbiddenProjectSurface : allowedProjectSurface, refs);
      addTokens(compatibilityTarget, refs);
      if (surface.mutationKind === "deploy") {
        addTokens(readOnlyForbidden ? forbiddenReleaseDeploy : allowedReleaseDeploy, refs);
      }
      continue;
    }

    const unsupportedRef = ref as unknown as { readonly kind?: string; readonly rid?: string };
    diagnostics.push({
      kind: "ProjectSurface",
      target: unsupportedRef.rid ?? "unknown",
      expected: ["FileSurface", "MCPTool", "ActionType", "ProjectSurface"],
      reason: `Unsupported DTC mutation surface kind ${unsupportedRef.kind ?? "unknown"}`,
    });
  }

  for (const surface of dtc.affectedSurfaces) {
    const value = normalizeSurfaceRef(surface);
    if (value !== undefined && looksLikeFileSurfaceRef(value)) {
      allowed.add(value);
      allowedFile.add(value);
    }
  }

  for (const decision of dtc.requiredUserDecisions ?? []) {
    requiredUserDecisionIds.push(decision.decisionId);
    if (CLOSED_DECISION_STATUSES.has(decision.status)) {
      reviewDomainsClosed.add(decision.domain);
    }
  }

  return {
    allowedSurfaceRefs: [...allowed],
    forbiddenSurfaceRefs: [...forbidden],
    allowedFileSurfaceRefs: [...allowedFile],
    forbiddenFileSurfaceRefs: [...forbiddenFile],
    allowedMcpToolRefs: [...allowedMcp],
    forbiddenMcpToolRefs: [...forbiddenMcp],
    allowedActionTypeRefs: [...allowedActionType],
    forbiddenActionTypeRefs: [...forbiddenActionType],
    allowedProjectSurfaceRefs: [...allowedProjectSurface],
    forbiddenProjectSurfaceRefs: [...forbiddenProjectSurface],
    allowedDataActions: [...allowedDataAction],
    forbiddenDataActions: [...forbiddenDataAction],
    allowedReleaseDeployRefs: [...allowedReleaseDeploy],
    forbiddenReleaseDeployRefs: [...forbiddenReleaseDeploy],
    allowedExternalEgressRefs: [...allowedExternalEgress],
    forbiddenExternalEgressRefs: [...forbiddenExternalEgress],
    diagnostics,
    requiredUserDecisionIds,
    reviewDomainsClosed: [...reviewDomainsClosed],
  };
}

export function surfaceRefMatchesTarget(surfaceRef: string, targetFile: string): boolean {
  const ref = normalizePath(surfaceRef);
  const target = normalizePath(targetFile);
  if (ref.length === 0) return false;
  if (ref.includes("*")) return globToRegExp(ref).test(target);
  const normalizedRef = stripTrailingSlash(ref);
  const directoryRef = ensureTrailingSlash(normalizedRef);
  if (target === normalizedRef || target.startsWith(directoryRef)) return true;
  if (normalizedRef.startsWith("/")) return false;
  return target.endsWith(`/${normalizedRef}`) || target.includes(`/${directoryRef}`);
}

export function mcpToolRefMatchesTool(
  surfaceRef: string,
  toolName: string | undefined,
): boolean {
  if (!toolName) return false;
  const ref = normalizeMcpToolToken(surfaceRef);
  const target = normalizeMcpToolToken(toolName);
  if (ref.length === 0 || target.length === 0) return false;
  return ref === target || target.endsWith(`__${ref}`) || target.includes(ref);
}

export function actionTypeRefMatchesAction(
  surfaceRef: string,
  actionTypeRid: string | undefined,
): boolean {
  if (!actionTypeRid) return false;
  const ref = normalizeSurfaceToken(surfaceRef);
  const target = normalizeSurfaceToken(actionTypeRid);
  if (ref.length === 0 || target.length === 0) return false;
  return target === ref || target.endsWith(`/${ref}`) || target.endsWith(`:${ref}`);
}

export function projectSurfaceRefMatchesTarget(
  surfaceRef: string,
  targetFile: string,
  projectScope?: ProjectScopeDefinition,
): boolean {
  const ref = normalizeSurfaceRef(surfaceRef);
  if (ref === undefined) return false;
  if (looksLikeFileSurfaceRef(ref) && surfaceRefMatchesTarget(ref, targetFile)) return true;

  const normalizedRef = normalizeSurfaceToken(ref);
  const normalizedTarget = normalizeSurfaceToken(targetFile);
  if (normalizedRef.length === 0) return false;

  if (normalizedTarget.includes(`/${normalizedRef}/`) || normalizedTarget.endsWith(`/${normalizedRef}`)) {
    return true;
  }

  for (const boundary of projectScope?.surfaceMutationBoundaries ?? []) {
    const boundaryTokens = [
      boundary.surface,
      boundary.durableWriteBoundary,
      ...boundary.owns,
      ...boundary.mustNotOwn,
    ].map(normalizeSurfaceToken);
    if (!boundaryTokens.some((token) => token === normalizedRef || token.includes(normalizedRef))) {
      continue;
    }
    for (const token of boundaryTokens) {
      if (token.length === 0) continue;
      if (looksLikeFileSurfaceRef(token) && surfaceRefMatchesTarget(token, targetFile)) return true;
      if (normalizedTarget.includes(token)) return true;
    }
  }

  return false;
}

export function extractActionTypeRid(input: Record<string, unknown> | undefined): string | undefined {
  const candidates = [
    input?.actionTypeRid,
    input?.actionTypeRef,
    input?.actionType,
    input?.action_type_rid,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
}

export function normalizeSurfaceRef(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.startsWith("file:") ? trimmed.slice("file:".length) : trimmed;
}

function collectFileSurfaceRefTokens(ref: { rid: string; displayName?: string; sourcePath?: string; pathGlob?: string }): string[] {
  return [ref.pathGlob, ref.sourcePath, ref.rid, ref.displayName]
    .map(normalizeSurfaceRef)
    .filter((value): value is string => value !== undefined);
}

function collectMcpToolRefTokens(ref: MCPToolRef): string[] {
  return [ref.toolName, ref.rid, ref.displayName, ref.sourcePath]
    .map(normalizeSurfaceRef)
    .filter((value): value is string => value !== undefined);
}

function collectActionTypeRefTokens(ref: ActionTypeRef): string[] {
  return [ref.rid, ref.displayName, ref.sourcePath]
    .map(normalizeSurfaceRef)
    .filter((value): value is string => value !== undefined);
}

function collectProjectSurfaceRefTokens(ref: ProjectSurfaceRef): string[] {
  return [ref.surfaceId, ref.sourcePath, ref.rid, ref.displayName]
    .map(normalizeSurfaceRef)
    .filter((value): value is string => value !== undefined);
}

function addTokens(target: Set<string>, tokens: readonly string[]): void {
  for (const token of tokens) target.add(token);
}

function resolveCapabilityForMcpRef(ref: MCPToolRef) {
  for (const token of collectMcpToolRefTokens(ref)) {
    const capability = getMcpToolCapability(normalizeMcpToolToken(token));
    if (capability) return capability;
  }
  return undefined;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function looksLikeFileSurfaceRef(value: string): boolean {
  return value.includes("/") || value.startsWith(".");
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeSurfaceToken(value: string): string {
  return value.trim().replace(/\\/g, "/").toLowerCase().replace(/^file:/, "").replace(/\/+$/, "");
}

function normalizeMcpToolToken(value: string): string {
  const normalized = value.trim().toLowerCase();
  const mcpRidPrefix = "mcp://palantir-mini/";
  if (normalized.startsWith(mcpRidPrefix)) return normalized.slice(mcpRidPrefix.length);
  const prefixes = [
    "mcp__plugin_palantir-mini_palantir-mini__",
    "mcp__palantir_mini__.",
    "mcp__palantir_mini__",
    "mcp__palantir-mini__",
  ];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  }
  return normalized;
}

function globToRegExp(glob: string): RegExp {
  let pattern = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === undefined) continue;
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      pattern += ".*";
      i += 1;
      continue;
    }
    if (char === "*") {
      pattern += "[^/]*";
      continue;
    }
    pattern += escapeRegExp(char);
  }
  const prefix = glob.startsWith("/") ? "^" : "(^|.*/)";
  return new RegExp(`${prefix}${pattern}$`);
}

function escapeRegExp(char: string): string {
  return /[\\^$+?.()|[\]{}]/.test(char) ? `\\${char}` : char;
}
