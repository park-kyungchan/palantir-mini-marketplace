// palantir-mini v3.3.0 — MCP tool handler: pm_plugin_self_check
// Domain: OPS (substrate health aggregator)
//
// Thin orchestrator after v3.3.0 N1-LARGE wave 1 decomposition. Per-axis checks
// extracted to ./pm-plugin-self-check/check-*.ts. Public API unchanged:
// pmPluginSelfCheck named export + default export preserved.
//
// Aggregates substrate health: schema pin + codegen headers + rule audit +
// agent-on-disk + skill-on-disk + (advisory) primitive-seed cross-check.
//
// Authority:
//   - ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §9.2 + §10
//   - ~/.claude/plans/immutable-forging-summit.md §4.1 T2d-8
//   - rules/07-plugins-and-mcp.md (file-ownership: hook-builder writes handlers/)
//   - rules/10-events-jsonl.md (5-dim envelope via emit())

import pkg from "../../package.json";
import { emit, projectRoot as resolveProjectRoot } from "../../scripts/log";
import { checkSchemaPin } from "./pm-plugin-self-check/check-schema-pin";
import { checkCodegenHeaders } from "./pm-plugin-self-check/check-codegen-headers";
import { checkRuleAudit } from "./pm-plugin-self-check/check-rule-audit";
import { checkDeclaredAgents, checkDeclaredSkills } from "./pm-plugin-self-check/check-declarations";
import { checkSkillToolDeclarations } from "./pm-plugin-self-check/check-skill-tool-declarations";
import { checkPrimitiveSeedAdvisories } from "./pm-plugin-self-check/check-primitive-seeds";
import { checkConsumerPeerDeps } from "./pm-plugin-self-check/check-consumer-peerdeps";
import { checkMcpRegistration } from "./pm-plugin-self-check/check-mcp-registration";
import { checkHookRegistry } from "./pm-plugin-self-check/check-hooks";
import { checkManagedSettings } from "./pm-plugin-self-check/check-managed-settings";
import { checkProjectSkillOntology } from "./pm-plugin-self-check/check-project-skill-ontology";
import { checkWorkflowResponseTemplate } from "./pm-plugin-self-check/check-workflow-response-template";
import { checkDeletionReadiness } from "./pm-plugin-self-check/check-deletion-readiness";
import { DEPRECATION_MAP } from "./_deprecation-map";
import { gitHeadSha as resolveGitHeadSha } from "../../lib/git/head-sha";
import { auditSurfaceContracts } from "../../lib/surface/audit";
import { evaluateWorkflowFamilyReleaseGate } from "../../lib/release/workflow-family-release-gate";
import {
  PLUGIN_ROOT,
  type PmPluginSelfCheckArgs,
  type PmPluginSelfCheckMode,
  type PmPluginSelfCheckResult,
  type PmRuntimeIdentity,
} from "./pm-plugin-self-check/types";

// Backward-compat re-exports
export type { PmPluginSelfCheckArgs, PmPluginSelfCheckResult } from "./pm-plugin-self-check/types";

/**
 * Best-effort git HEAD commit SHA of a checkout. Returns null — never throws —
 * when the path is not a git checkout (e.g. an installed cache copy of the
 * plugin). Preserves this site's string|null contract by mapping the shared
 * resolver's "no-git" sentinel to null.
 */
function gitHeadSha(root: string): string | null {
  const sha = resolveGitHeadSha(root);
  return sha === "no-git" ? null : sha;
}

const CHECKS_BY_MODE: Record<PmPluginSelfCheckMode, readonly string[]> = {
  "public-mcp": ["mcp-tools"],
  "handler-inventory": ["mcp-tools"],
  hooks: ["hooks"],
  skills: ["skills", "skill-tool-declarations"],
  "project-skill-ontology": ["project-skill-ontology"],
  agents: ["agents"],
  "managed-settings": ["managed-settings"],
  "surface-contracts": ["surface-contracts"],
  release: [
    "schema-pin",
    "codegen-headers",
    "rule-audit",
    "agents",
    "skills",
    "skill-tool-declarations",
    "mcp-tools",
    "hooks",
    "managed-settings",
    "workflow-response-template",
    "workflow-family-release-gate",
    "surface-contracts",
    "deletion-readiness",
  ],
};

const ALL_CHECKS = [
  "schema-pin",
  "codegen-headers",
  "rule-audit",
  "agents",
  "skills",
  "skill-tool-declarations",
  "consumer-peerdeps",
  "mcp-tools",
  "hooks",
  "managed-settings",
  "project-skill-ontology",
  "workflow-response-template",
  "workflow-family-release-gate",
  "surface-contracts",
  "deletion-readiness",
] as const;

function modeFromArgs(mode: PmPluginSelfCheckArgs["mode"]): PmPluginSelfCheckMode {
  return mode && mode in CHECKS_BY_MODE ? mode : "release";
}

function statusFor(
  result: PmPluginSelfCheckResult,
  check: string,
): "pass" | "fail" | "skipped" {
  switch (check) {
    case "schema-pin": return result.schemaPinResult.status;
    case "codegen-headers": return result.codegenHeadersResult.status;
    case "rule-audit": return result.ruleAuditResult.status;
    case "agents": return result.declaredAgentsResult.status;
    case "skills": return result.declaredSkillsResult.status;
    case "skill-tool-declarations": return result.skillToolDeclarationsResult.status;
    case "consumer-peerdeps": return result.consumerPeerDepResult.status;
    case "mcp-tools": return result.mcpToolsRegistrationResult.status;
    case "hooks": return result.hookRegistryResult.status;
    case "managed-settings": return result.managedSettingsResult.status;
    case "project-skill-ontology": return result.projectSkillOntologyResult.status;
    case "workflow-response-template": return result.workflowResponseTemplateResult.status;
    case "workflow-family-release-gate": return result.workflowFamilyReleaseGateResult.status;
    case "surface-contracts": return result.surfaceContractAuditResult.status === "fail" ? "fail" : "pass";
    case "deletion-readiness": return result.deletionReadinessResult.status;
    default: return "skipped";
  }
}

export async function pmPluginSelfCheck(
  args: PmPluginSelfCheckArgs,
): Promise<PmPluginSelfCheckResult> {
  const project = args.projectPath ?? resolveProjectRoot();
  const mode = modeFromArgs(args.mode);
  const activeChecks = [...CHECKS_BY_MODE[mode]];
  const allChecks = [...ALL_CHECKS];

  const schemaPinResult = checkSchemaPin();
  const codegenHeadersResult = checkCodegenHeaders(args.projectPath);
  const ruleAuditResult = await checkRuleAudit();
  const declaredAgentsResult = checkDeclaredAgents();
  const declaredSkillsResult = checkDeclaredSkills();
  const skillToolDeclarationsResult = checkSkillToolDeclarations();
  const primitiveSeedAdvisories = checkPrimitiveSeedAdvisories();
  const consumerPeerDepResult = checkConsumerPeerDeps();
  // sprint-060 W2.2 R6-F2: Dead-handler regression check.
  const mcpToolsRegistrationResult = checkMcpRegistration();
  const hookRegistryResult = await checkHookRegistry({
    agentName: args.agentName,
    project,
  });
  const managedSettingsResult = checkManagedSettings();
  const projectSkillOntologyResult = checkProjectSkillOntology(project);
  const workflowResponseTemplateResult = checkWorkflowResponseTemplate();
  const workflowFamilyReleaseGateResult = evaluateWorkflowFamilyReleaseGate();
  const rawSurfaceContractAuditResult = auditSurfaceContracts({
    pluginRoot: PLUGIN_ROOT,
    mode: "all",
    failClosed: false,
  });
  const surfaceContractAuditResult = {
    ...rawSurfaceContractAuditResult,
    details:
      `Surface contract audit ${rawSurfaceContractAuditResult.status}: ` +
      `${rawSurfaceContractAuditResult.contractCount}/${rawSurfaceContractAuditResult.scannedFileCount} ` +
      `files carry local AIP/FDE surface contracts; required=${rawSurfaceContractAuditResult.requiredSurfaceCount}; ` +
      `helpers=${rawSurfaceContractAuditResult.helperFileCount}; missing=${rawSurfaceContractAuditResult.missingContractCount}; ` +
      `missingRequired=${rawSurfaceContractAuditResult.missingRequiredContractCount}; ` +
      `unsupportedRepresentation=${rawSurfaceContractAuditResult.unsupportedRepresentationCount}; ` +
      `invalid=${rawSurfaceContractAuditResult.invalidContractCount}.`,
  };
  const deletionReadinessResult = checkDeletionReadiness();

  // In-band runtime-identity self-report (additive; always populated regardless
  // of mode). Answers "what pm version is running?" in ONE tool call.
  const runtimeIdentity: PmRuntimeIdentity = {
    packageName: pkg.name,
    version: pkg.version,
    pluginRoot: PLUGIN_ROOT,
    gitSha: gitHeadSha(PLUGIN_ROOT) ?? null,
  };

  // overallStatus: PASS iff none of the active authoritative axes is FAIL (skipped is OK).
  // primitiveSeedAdvisories and consumerPeerDepResult are advisory in release mode:
  // consumer repos can drift independently from this plugin release surface.
  const overallStatus: "pass" | "fail" = activeChecks
    .map((check) => statusFor({
      runtimeIdentity,
      mode,
      activeChecks,
      skippedChecks: [],
      schemaPinResult,
      codegenHeadersResult,
      ruleAuditResult,
      declaredAgentsResult,
      declaredSkillsResult,
      skillToolDeclarationsResult,
      primitiveSeedAdvisories,
      consumerPeerDepResult,
      mcpToolsRegistrationResult,
      hookRegistryResult,
      managedSettingsResult,
      projectSkillOntologyResult,
      workflowResponseTemplateResult,
      workflowFamilyReleaseGateResult,
      surfaceContractAuditResult,
      deletionReadinessResult,
      overallStatus: "pass",
    }, check))
    .some((status) => status === "fail") ? "fail" : "pass";

  // Surface removal advisories for all v6.0.0-removed tools — helps callers who
  // may still reference the removed tool names in configs or code.
  const removedToolAdvisories: string[] = DEPRECATION_MAP.map(
    (e) => `[palantir-mini v${e.removedAtVersion}] Tool '${e.removed}' was removed. Use '${e.replacement}' instead.`,
  );

  const result: PmPluginSelfCheckResult = {
    runtimeIdentity,
    mode,
    activeChecks,
    skippedChecks: allChecks.filter((check) => !activeChecks.includes(check)),
    schemaPinResult,
    codegenHeadersResult,
    ruleAuditResult,
    declaredAgentsResult,
    declaredSkillsResult,
    skillToolDeclarationsResult,
    primitiveSeedAdvisories,
    consumerPeerDepResult,
    mcpToolsRegistrationResult,
    hookRegistryResult,
    managedSettingsResult,
    projectSkillOntologyResult,
    workflowResponseTemplateResult,
    workflowFamilyReleaseGateResult,
    surfaceContractAuditResult,
    deletionReadinessResult,
    overallStatus,
    removedToolAdvisories,
  };

  // Emit 5-dim event (rule 10 — append-only, emit before returning).
  await emit({
    type: "plugin_self_check_completed",
    payload: result,
    toolName: "pm_plugin_self_check",
    cwd: project,
    agentName: args.agentName,
    reasoning: `pm_plugin_self_check completed: mode=${mode} overall=${overallStatus} activeChecks=${activeChecks.join(",")} schemaPin=${schemaPinResult.status} ruleAudit=${ruleAuditResult.status} agents=${declaredAgentsResult.total} skills=${declaredSkillsResult.total} skillToolDecls=${skillToolDeclarationsResult.status} consumerPeerDep=${consumerPeerDepResult.status} mcp=${mcpToolsRegistrationResult.status} hooks=${hookRegistryResult.status} managedSettings=${managedSettingsResult.status} projectSkillOntology=${projectSkillOntologyResult.status} workflowResponseTemplate=${workflowResponseTemplateResult.status} workflowFamilyReleaseGate=${workflowFamilyReleaseGateResult.status} workflowFamilyReleaseFindings=${workflowFamilyReleaseGateResult.findings.length} surfaceContracts=${surfaceContractAuditResult.status} surfaceContractsMissing=${surfaceContractAuditResult.missingContractCount} primitive-advisories=${primitiveSeedAdvisories.agents.filesystemOnly.length + primitiveSeedAdvisories.agents.seedOnly.length + primitiveSeedAdvisories.skills.filesystemOnly.length + primitiveSeedAdvisories.skills.seedOnly.length} runtimeVersion=${runtimeIdentity.version}`,
    hypothesis:
      "Substrate health aggregation provides a single-call readiness signal before Phase 2 migration steps execute.",
  });

  return result;
}

export default async function pmPluginSelfCheckHandler(
  rawArgs: unknown,
): Promise<PmPluginSelfCheckResult> {
  return pmPluginSelfCheck((rawArgs ?? {}) as PmPluginSelfCheckArgs);
}
