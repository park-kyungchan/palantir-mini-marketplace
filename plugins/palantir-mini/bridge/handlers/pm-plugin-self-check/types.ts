// palantir-mini v3.3.0 — pm-plugin-self-check shared types + constants (B.3)
// Extracted from pm-plugin-self-check.ts (375 LOC) per N1-LARGE wave 1.

import * as path from "path";
import type { ReleaseChangedSurfaceEvidence } from "../../../lib/harness/release-evidence";
import type { SurfaceContractAuditFinding } from "../../../lib/surface/audit";

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
  | "release";

export type PmPluginSelfCheckStatus = "pass" | "fail" | "skipped";

export interface PmPluginSelfCheckArgs {
  /** Optional: project path for project-specific codegen header verification. Defaults to plugin root. */
  projectPath?: string;
  /** Optional: agent name for emit_event 5-dim envelope. */
  agentName?: string;
  /** Optional mode. Defaults to release, which evaluates every authoritative release axis. */
  mode?: PmPluginSelfCheckMode;
}

export interface PmPluginSelfCheckResult {
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
  broadTestRatchetResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    ledgerPath: string;
    ledgerEntryCount: number;
    observedFailureCount: number;
    releaseBlockingCount: number;
    missingMetadata: string[];
    observedIds: string[];
    classifications: Array<{
      testId: string;
      classification: string;
      releaseBlocking: boolean;
      reason: string;
    }>;
  };
  evalSuiteArtifactsResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    changedSurfaceCount: number;
    changedSurfaces: ReleaseChangedSurfaceEvidence[];
    requiredSuiteIds: string[];
    runArtifactCount: number;
    artifactRefs: string[];
    missingArtifacts: Array<{
      surface: string;
      suiteId: string;
      reason: string;
    }>;
  };
  adversarialVerifierEvidenceResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    requiredCategories: string[];
    evidenceCount: number;
    evidenceRefs: string[];
    missingCategories: string[];
  };
  outcomeReplayEvidenceResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    required: boolean;
    sprintNumbers: number[];
    replayArtifactCount: number;
    evidenceRefs: string[];
    missingReplayEvidence: string[];
  };
  workflowResponseTemplateResult: {
    status: PmPluginSelfCheckStatus;
    details: string;
    completeSampleValid: boolean;
    forbiddenMarkerRejected: boolean;
  };
  surfaceContractAuditResult: {
    status: PmPluginSelfCheckStatus | "advisory";
    details: string;
    scannedFileCount: number;
    contractCount: number;
    missingContractCount: number;
    invalidContractCount: number;
    findings: readonly SurfaceContractAuditFinding[];
  };
  overallStatus: "pass" | "fail";
  /**
   * v6.0.0 removal advisories from DEPRECATION_MAP.
   * Lists every MCP tool removed in v6.0.0 with "use X instead" guidance.
   * Advisory only — does NOT influence overallStatus.
   */
  removedToolAdvisories?: string[];
}
