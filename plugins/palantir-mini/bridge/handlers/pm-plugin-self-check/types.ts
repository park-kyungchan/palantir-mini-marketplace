// palantir-mini v3.3.0 — pm-plugin-self-check shared types + constants (B.3)
// Extracted from pm-plugin-self-check.ts (375 LOC) per N1-LARGE wave 1.

import * as path from "path";
import type { WorkflowFamilyReleaseGateResult } from "../../../lib/release/workflow-family-release-gate";
import type { SurfaceContractAuditFinding } from "../../../lib/surface/audit";
import type { DeletionReadinessResult } from "./check-deletion-readiness";
import type { SkillToolDeclarationsCheckResult } from "./check-skill-tool-declarations";
import type { SchemasSnapshotManifestCheckResult } from "./check-schemas-snapshot-manifest";
import type { HookSeedCheckResult } from "./check-hook-seed";
import type { AgentModelPolicyCheckResult } from "./check-agent-model-policy";

/** Plugin root resolved from this file's location (bridge/handlers/pm-plugin-self-check/types.ts → ../../.. = plugin root). */
export const PLUGIN_ROOT = path.resolve(__dirname, "../../..");

export type PmPluginSelfCheckMode =
  | "public-mcp"
  | "handler-inventory"
  | "hooks"
  | "skills"
  | "project-skill-ontology"
  | "agents"
  | "managed-settings"
  | "surface-contracts"
  | "hook-seed"
  | "agent-model-policy"
  | "release";

export type PmPluginSelfCheckStatus = "pass" | "fail" | "skipped";

/**
 * In-band runtime-identity self-report (additive identity metadata, NOT a
 * pass/fail check). Lets "what pm version is running?" be answered by ONE tool
 * call. Always populated, regardless of mode.
 */
export interface PmRuntimeIdentity {
  packageName: string;   // package.json "name"
  version: string;       // package.json "version" — AUTHORITATIVE running version (the running copy's own package.json)
  pluginRoot: string;    // PLUGIN_ROOT — where the running code executes from (cache copy when installed, source when dev)
  gitSha: string | null; // best-effort git HEAD of pluginRoot; null when pluginRoot is not a git checkout (an installed cache copy)
}

export interface PmPluginSelfCheckArgs {
  /** Optional: project path for project-specific codegen header verification. Defaults to plugin root. */
  projectPath?: string;
  /** Optional: agent name for emit_event 5-dim envelope. */
  agentName?: string;
  /** Optional mode. Defaults to release, which evaluates every authoritative release axis. */
  mode?: PmPluginSelfCheckMode;
}

export interface PmPluginSelfCheckResult {
  /**
   * In-band runtime-identity self-report. Identity metadata only — NOT a
   * pass/fail check, so it is absent from every mode/check list and does not
   * influence overallStatus.
   */
  runtimeIdentity: PmRuntimeIdentity;
  mode: PmPluginSelfCheckMode;
  activeChecks: string[];
  skippedChecks: string[];
  schemaPinResult: { status: "pass" | "fail"; details: string };
  codegenHeadersResult: { status: "pass" | "fail" | "skipped"; details: string };
  ruleAuditResult: {
    status: "pass" | "fail";
    driftLines: number;
    staleCrossRefs: number;
    unclaimedHookCitations: number;
  };
  declaredAgentsResult: { status: "pass" | "fail"; total: number; missing: string[] };
  declaredSkillsResult: {
    status: "pass" | "fail";
    total: number;
    missing: string[];
    missingCategory: string[];
  };
  /**
   * Skill→tool binding guard (P1-11): every skill allowed-tools
   * mcp__palantir-mini__X must resolve to a live TOOLS entry. Influences
   * overallStatus.
   */
  skillToolDeclarationsResult: SkillToolDeclarationsCheckResult;
  /**
   * v2.27.0 advisory only — does NOT influence overallStatus.
   * Cross-check between filesystem walk + primitive seed registry.
   * `filesystemOnly`: agents/skills present on disk but missing from seed registry.
   * `seedOnly`: agents/skills present in seed registry but missing on disk.
   */
  primitiveSeedAdvisories: {
    agents: { filesystemOnly: string[]; seedOnly: string[] };
    skills: { filesystemOnly: string[]; seedOnly: string[] };
  };
  /**
   * Consumer peerDep alignment check (I.7 architecture review).
   * Verifies all consumer project package.json files declare the same
   * @palantirKC/claude-schemas peerDependency range.
   * "fail" when ≥2 distinct ranges found; "pass" when exactly 1; "skipped" when 0.
   * Advisory in vNext mode-based self-check: reported for release context, but
   * external consumer drift does not block plugin-owned release checks.
   */
  consumerPeerDepResult: {
    status: "pass" | "fail" | "skipped";
    details: string;
    /** Divergent entries by project path when status is "fail". */
    divergentEntries?: Array<{ projectPath: string; peerDepRange: string }>;
  };
  /**
   * MCP tools registration consistency check (sprint-060 W2.2 R6-F2).
   * Verifies gap between handler *.ts files and TOOLS array entries in mcp-server.ts
   * stays within tolerance (gap ≤ 10). Prevents silent dead-handler regressions
   * like PR #321 (sprint-057 W2) where 3 handlers were implemented but unregistered.
   * Influences overallStatus.
   */
  mcpToolsRegistrationResult: {
    status:              "pass" | "fail" | "skipped";
    details:             string;
    handlerFileCount:    number;
    registeredToolCount: number;
    gap:                 number;
    registeredHandlerModules: number;
    missingHandlerModules: string[];
    missingMetadataFields: string[];
    unregisteredTopLevelHandlers: string[];
    /**
     * P2-5 (task #15): the unregistered handlers split internal-vs-dead per
     * bridge/handlers/_deprecation-map.ts UNREGISTERED_HANDLER_CLASSIFICATION.
     * The dead-handler tolerance (gap <= 10) is now backed by an enumerated,
     * classified record instead of an unexplained count.
     * `unclassifiedUnregisteredHandlers` empty = every unregistered handler is
     * accounted for.
     */
    internalUnregisteredHandlers: string[];
    deadUnregisteredHandlers: string[];
    unclassifiedUnregisteredHandlers: string[];
  };
  hookRegistryResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    hookCommandCount: number;
    forbiddenLifecycleCommands: string[];
    timeoutPolicyViolations: string[];
    ontologyEngineeringWorkflowPolicyViolations: string[];
    hookTimeoutBypassInvoked: boolean;
  };
  managedSettingsResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    fragmentCount: number;
    missingPublicTools: string[];
    extraPluginTools: string[];
  };
  projectSkillOntologyResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    projectRoot: string;
    skillCount: number;
    contractsFound: number;
    missingOntologyFrontmatter: string[];
    staleSemanticSources: string[];
    unsafeMutationSkills: string[];
    presenterEditViolations: string[];
    studioStructureViolations: string[];
    contractIssues: Array<{
      skillPath: string;
      issueId: string;
      field: string;
      severity: "fail" | "warn";
      message: string;
    }>;
  };
  workflowResponseTemplateResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    completeSampleValid: boolean;
    forbiddenMarkerRejected: boolean;
  };
  workflowFamilyReleaseGateResult: WorkflowFamilyReleaseGateResult;
  surfaceContractAuditResult: {
    status: PmPluginSelfCheckStatus | "advisory";
    details: string;
    scannedFileCount: number;
    requiredSurfaceCount: number;
    helperFileCount: number;
    contractCount: number;
    missingContractCount: number;
    missingRequiredContractCount: number;
    invalidContractCount: number;
    unsupportedRepresentationCount: number;
    findings: readonly SurfaceContractAuditFinding[];
  };
  deletionReadinessResult: DeletionReadinessResult;
  /**
   * schemas-snapshot MANIFEST integrity check. Fails when the recorded
   * runtime-overlay/schemas-snapshot/MANIFEST.json fileSha256Index no longer
   * matches the live snapshot files (drift after editing a primitive without
   * regenerating). Regenerate with
   * `bun run scripts/refresh-schemas-snapshot-manifest.ts`. Influences
   * overallStatus in release mode.
   */
  schemasSnapshotManifestResult: SchemasSnapshotManifestCheckResult;
  /**
   * Hook self-Ontology SEED integrity check (bd-012 P2-4). Fails when the
   * hand-maintained HOOK_INSTANCES seed in
   * runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts no longer
   * matches the live hooks/ filesystem + hooks/hooks.json wiring (a hook added,
   * removed, or re-wired without updating the seed + EXPECTED_* pins). Influences
   * overallStatus in release mode.
   */
  hookSeedResult: HookSeedCheckResult;
  /**
   * Sonnet-only subagent model policy check (owner directive: "subagents are
   * ALWAYS spawned as Sonnet with maximum reasoning effort"). Fails when any
   * active agents/*.md (excluding .archived/) declares a `model:` frontmatter
   * value other than "sonnet", or omits the field entirely. Influences
   * overallStatus in release mode.
   */
  agentModelPolicyResult: AgentModelPolicyCheckResult;
  overallStatus: "pass" | "fail";
  /**
   * v6.0.0 removal advisories from DEPRECATION_MAP.
   * Lists every MCP tool removed in v6.0.0 with "use X instead" guidance.
   * Advisory only — does NOT influence overallStatus.
   */
  removedToolAdvisories?: string[];
}
