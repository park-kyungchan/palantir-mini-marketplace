import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadProjectOntologyIndex,
  type ProjectOntologyIndex,
} from "../../../lib/capability/project-ontology-index";
import { validateCapabilityContract } from "../../../lib/capability/capability-contract";
import { listPendingContextApprovals } from "../../../lib/ontology-context/approval";
import { readEvents } from "../../../lib/event-log/read";
import {
  CLAUDE_ONLY_HOOK_EVENTS,
  CODEX_SCHEMA_ONLY_HOOK_EVENTS,
  CODEX_UNSUPPORTED_HOOK_EVENTS,
  projectRuntimeHookMount,
} from "../../../lib/hooks/workflow-registry";
import {
  readCurrentFDEOntologyEngineeringSession,
} from "../../../lib/fde-ontology-engineering/session-store";
import { readFDESemanticIntentContextSidecar } from "../../../lib/fde-ontology-engineering/semantic-intent-context";
import {
  classifyEvidenceSource,
  evaluateFDEEvidencePromotionSeverity,
  type FDEEvidenceUse,
} from "../../../lib/evidence/evidence-source-policy";
import { validateEvidencePromotionLedger } from "../../../lib/evidence/evidence-promotion-ledger";
import { composeSubrepoReadOnlyApplicationState } from "../../../lib/ontology-context/subrepo-read-only-index";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

export interface OntologyRuntimeHealthSignal {
  readonly signalId: string;
  readonly severity: "warn" | "fail";
  readonly evidencePath: string;
  readonly expected: string;
  readonly observed: string;
}

export interface OntologyRuntimeHealthResult {
  readonly mode: "ontology-runtime";
  readonly project: string;
  readonly projectId: string;
  readonly capabilityCount: number;
  readonly surfaceCount: number;
  readonly validationPackCount: number;
  readonly knownIssueCount: number;
  readonly signals: readonly OntologyRuntimeHealthSignal[];
  readonly verdict: "pass" | "fail";
}

function signal(
  signalId: string,
  evidencePath: string,
  expected: string,
  observed: string,
  severity: "warn" | "fail" = "warn",
): OntologyRuntimeHealthSignal {
  return { signalId, severity, evidencePath, expected, observed };
}

function validateIndex(index: ProjectOntologyIndex): OntologyRuntimeHealthSignal[] {
  const signals: OntologyRuntimeHealthSignal[] = [];
  const capabilityIds = new Set(index.capabilities.map((capability) => capability.capabilityId));
  const validationPackIds = new Set(index.validationPacks.map((pack) => pack.validationPackId));

  for (const capability of index.capabilities) {
    for (const issue of validateCapabilityContract(capability).issues) {
      signals.push(signal(
        issue.issueId,
        capability.sourceRef,
        issue.message,
        `${capability.capabilityId}.${issue.field}`,
        issue.severity,
      ));
    }
    if (
      capability.actionBoundary.mayMutateProjectFiles &&
      capability.actionBoundary.mutationSurfaces.length === 0
    ) {
      signals.push(signal(
        "capability.missing-mutation-surface",
        capability.sourceRef,
        "mutation-capable capabilities declare at least one mutation surface",
        capability.capabilityId,
        "fail",
      ));
    }
    for (const pack of capability.outputOntology.validationPacks) {
      if (validationPackIds.has(pack)) continue;
      signals.push(signal(
        "capability.validation-pack-unregistered",
        capability.sourceRef,
        `${pack} should be present in ProjectOntologyIndex.validationPacks`,
        capability.capabilityId,
      ));
    }
  }

  for (const issue of index.knownIssues) {
    for (const affected of issue.affectedCapabilityRefs) {
      if (capabilityIds.has(affected) || capabilityIds.has(`known-issue:${issue.issueId}`)) continue;
      signals.push(signal(
        "known-issue-capability-missing",
        issue.source,
        `${affected} should be present as a capability or skill compatibility projection`,
        issue.issueId,
      ));
    }
  }

  if (index.capabilities.length === 0) {
    signals.push(signal(
      "project-ontology-index.no-capabilities",
      ".palantir-mini/ontology-index",
      "at least one capability from ontology-index or skill-registry",
      "none",
      "warn",
    ));
  }

  return signals;
}

// ─── New validators (PR-8) ───────────────────────────────────────────────────

/**
 * Validator 1 (PR-10 consumer): every workflow_trace_opened in last 24h has a
 * matching workflow_trace_closed for the same traceId.
 */
function validateWorkflowTraceClosure(projectRoot: string): OntologyRuntimeHealthSignal[] {
  const signals: OntologyRuntimeHealthSignal[] = [];
  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return signals;
  try {
    const events = readEvents(eventsPath);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const opened = new Map<string, { time: number; mode: string }>();
    const closed = new Set<string>();
    for (const ev of events) {
      const evRecord = ev as unknown as Record<string, unknown>;
      const type = String(evRecord["type"] ?? "");
      const time = Date.parse(String(evRecord["when"] ?? "")) || 0;
      if (time < cutoff) continue;
      const payload = (evRecord["payload"] as Record<string, unknown>) ?? {};
      const traceId = String(payload["traceId"] ?? "");
      if (!traceId) continue;
      if (type === "workflow_trace_opened") {
        opened.set(traceId, { time, mode: String(payload["mode"] ?? "") });
      } else if (type === "workflow_trace_closed") {
        closed.add(traceId);
      }
    }
    for (const [traceId, info] of opened) {
      if (closed.has(traceId)) continue;
      signals.push(signal(
        "ontology-runtime-circuit-incomplete",
        `events.jsonl#${traceId}`,
        `workflow_trace_opened (mode=${info.mode}) requires a matching workflow_trace_closed within 24h`,
        `unclosed since ${new Date(info.time).toISOString()}`,
        "warn",
      ));
    }
  } catch {/* best-effort */}
  return signals;
}

/**
 * Validator 2 (PR-4 consumer): every OntologyContextApproval references a real
 * sourceQueryRef that resolves to a file on disk (ontology-context-query store).
 */
function validateApprovalRefs(projectRoot: string): OntologyRuntimeHealthSignal[] {
  const signals: OntologyRuntimeHealthSignal[] = [];
  try {
    const approvals = listPendingContextApprovals(projectRoot);
    for (const summary of approvals) {
      const queryRef = summary.sourceQueryRef;
      if (!queryRef) continue;
      // Resolve ontology-context-query:// URIs to their on-disk path
      const queryPath = queryRef.startsWith("ontology-context-query://")
        ? path.join(
            projectRoot,
            ".palantir-mini",
            "session",
            "ontology-context-queries",
            `${queryRef.replace("ontology-context-query://", "")}.json`,
          )
        : queryRef;
      if (fs.existsSync(queryPath)) continue;
      signals.push(signal(
        "ontology-runtime-circuit-incomplete",
        summary.approvalRef,
        "OntologyContextApproval.sourceQueryRef must reference a real file on disk",
        `missing: ${queryPath}`,
        "fail",
      ));
    }
  } catch {/* best-effort */}
  return signals;
}

/**
 * Validator 3 (PR-1 consumer): ProjectOntologyIndex schemaVersion must be
 * a v1.x string (palantir-mini/project-ontology-index/v1).
 *
 * Exported for unit-testing with a synthetic index object (the runtime always
 * produces the canonical constant, but future code paths or schema regressions
 * may produce a missing or pre-v1 value).
 */
export function validateIndexSchemaVersion(index: ProjectOntologyIndex): OntologyRuntimeHealthSignal[] {
  const signals: OntologyRuntimeHealthSignal[] = [];
  const schemaVersion = (index as unknown as { schemaVersion?: string }).schemaVersion ?? "";
  // Accept any value containing "/v1"; flag missing or pre-v1 values.
  if (!schemaVersion || !schemaVersion.includes("/v1")) {
    signals.push(signal(
      "ontology-runtime-circuit-incomplete",
      "project-ontology-index",
      "ProjectOntologyIndex.schemaVersion must be palantir-mini/project-ontology-index/v1 (schemas v1.51.0+)",
      schemaVersion || "missing",
      "fail",
    ));
  }
  return signals;
}

/**
 * Validator 4 (PR-11 consumer): every pre_mutation_governance_decided event
 * for a protected mutation (allowed=true) must carry at least one of
 * refs.semanticIntentContractRef / refs.digitalTwinChangeContractRef.
 */
function validateGovernanceRefs(projectRoot: string): OntologyRuntimeHealthSignal[] {
  const signals: OntologyRuntimeHealthSignal[] = [];
  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return signals;
  const PROTECTED_TOOLS = new Set<string>(["Edit", "Write", "MultiEdit", "commit_edits"]);
  try {
    const events = readEvents(eventsPath);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const ev of events) {
      const evRecord = ev as unknown as Record<string, unknown>;
      if (evRecord["type"] !== "pre_mutation_governance_decided") continue;
      const time = Date.parse(String(evRecord["when"] ?? "")) || 0;
      if (time < cutoff) continue;
      const payload = (evRecord["payload"] as Record<string, unknown>) ?? {};
      const toolName = String(payload["toolName"] ?? "");
      if (!PROTECTED_TOOLS.has(toolName)) continue;
      if (!payload["allowed"]) continue; // denied decisions don't need contract refs
      const refs = (payload["refs"] as Record<string, unknown>) ?? {};
      const hasSic = Boolean(refs["semanticIntentContractRef"]);
      const hasDtc = Boolean(refs["digitalTwinChangeContractRef"]);
      if (hasSic || hasDtc) continue;
      signals.push(signal(
        "ontology-runtime-circuit-incomplete",
        `events.jsonl#${String(payload["decisionId"] ?? "")}`,
        `pre_mutation_governance_decided for protected tool=${toolName} must carry semanticIntentContractRef or digitalTwinChangeContractRef`,
        "neither present",
        "warn",
      ));
    }
  } catch {/* best-effort */}
  return signals;
}

/**
 * Validator 5 (PR-14 stub): every deprecated-candidate MCP tool must have a
 * replacement note in _deprecation-map.ts. Until PR-14 lands, emits a single
 * warn-severity signal so the gap remains visible.
 */
function validateDeprecatedMcpReplacements(projectRoot: string): OntologyRuntimeHealthSignal[] {
  const mapPath = path.join(
    projectRoot,
    ".claude",
    "plugins",
    "palantir-mini",
    "bridge",
    "handlers",
    "_deprecation-map.ts",
  );
  if (fs.existsSync(mapPath)) {
    // PR-14 landed — validation would happen here once map shape is finalized.
    return [];
  }
  return [signal(
    "ontology-runtime-circuit-incomplete",
    "bridge/handlers/_deprecation-map.ts",
    "every deprecated-candidate MCP tool requires a replacement note (PR-14 _deprecation-map.ts)",
    "PR-14 not yet shipped — stub",
    "warn",
  )];
}

function fdeSourceRefUse(session: FDEOntologyEngineeringSession): FDEEvidenceUse {
  if (
    session.phase === "semantic-contract-ready" ||
    session.phase === "dtc-ready" ||
    Boolean(session.semanticIntentContractRef) ||
    Boolean(session.digitalTwinChangeContractRef)
  ) {
    return "authority";
  }
  return "reference";
}

function validateFDEOntologyRuntime(projectRoot: string): OntologyRuntimeHealthSignal[] {
  const signals: OntologyRuntimeHealthSignal[] = [];
  const session = readCurrentFDEOntologyEngineeringSession(projectRoot);
  if (!session) return signals;
  if (session.readinessProfile?.missingRequired.length) {
    signals.push(signal(
      "fde-readiness-profile-incomplete",
      `fde-ontology-engineering://${session.sessionId}`,
      "FDE readiness profile should have no missing required fields before contract drafting",
      session.readinessProfile.missingRequired.join(", "),
      "warn",
    ));
  }
  if (session.semanticIntentContextRef) {
    const sidecar = readFDESemanticIntentContextSidecar(projectRoot, session.sessionId);
    if (!sidecar) {
      signals.push(signal(
        "fde-semantic-intent-sidecar-missing",
        session.semanticIntentContextRef,
        "FDESemanticIntentContext sidecar should exist when session references it",
        "missing",
        "fail",
      ));
    }
  }
  const sourceRefUse = fdeSourceRefUse(session);
  for (const sourceRef of session.sourceRefs) {
    if (!sourceRef.startsWith("/") && !sourceRef.startsWith(".")) continue;
    const promotionDecision = evaluateFDEEvidencePromotionSeverity({
      projectRoot,
      sourcePath: sourceRef,
      phase: session.phase,
      use: sourceRefUse,
    });
    const decision = promotionDecision.policyDecision;
    if (promotionDecision.severity !== "none") {
      signals.push(signal(
        "evidence-promotion-required",
        sourceRef,
        "FDE source evidence promotion severity should match phase and authority use",
        `${decision.ssotStatus}; phase=${promotionDecision.phase}; use=${promotionDecision.use}; ${promotionDecision.reason}`,
        promotionDecision.severity,
      ));
      continue;
    }
    if (decision.allowed) continue;
    signals.push(signal(
      "evidence-policy-unsupported-source",
      sourceRef,
      "FDE source evidence should classify as reference_only / not_promoted or be explicit non-file evidence",
      decision.kind,
      "warn",
    ));
  }
  return signals;
}

function validateEvidencePromotionDrift(projectRoot: string): OntologyRuntimeHealthSignal[] {
  return validateEvidencePromotionLedger(projectRoot).map((item) =>
    signal(
      item.signalId,
      item.sourcePath,
      item.expected,
      item.observed,
      "warn",
    )
  );
}

function validateSubrepoRisk(projectRoot: string): OntologyRuntimeHealthSignal[] {
  const state = composeSubrepoReadOnlyApplicationState(projectRoot);
  if (!state.available) return [];
  return [
    ...state.dirtyPaths.map((dirtyPath) => signal(
      "subrepo-risk-dirty",
      dirtyPath,
      "read-only subrepo index should surface dirty state for DTC acknowledgement",
      "dirty",
      "warn",
    )),
    ...state.mismatchPaths.map((mismatchPath) => signal(
      "subrepo-risk-mismatch",
      mismatchPath,
      "read-only subrepo index should surface expected-head mismatches for DTC acknowledgement",
      "mismatch",
      "warn",
    )),
    ...state.dirtyDetails.flatMap((detail) =>
      detail.dirtyEntries.map((dirtyEntry) => signal(
        "subrepo-risk-dirty-entry",
        detail.path,
        "read-only subrepo index should expose generated dirty entries for DTC acknowledgement",
        dirtyEntry,
        "warn",
      ))
    ),
    ...state.mismatchDetails.flatMap((detail) => {
      const signals: OntologyRuntimeHealthSignal[] = [];
      if (detail.remoteBranchMatchesLocal === false) {
        signals.push(signal(
          "subrepo-risk-remote-branch-mismatch",
          detail.path,
          "read-only subrepo index should expose remoteBranchMatchesLocal=false for DTC acknowledgement",
          `${detail.remoteBranch ?? "remote"} vs local`,
          "warn",
        ));
      }
      if (
        detail.head !== undefined &&
        detail.expectedHead !== undefined &&
        detail.head !== detail.expectedHead
      ) {
        signals.push(signal(
          "subrepo-risk-head-expected-mismatch",
          detail.path,
          "read-only subrepo index should expose head-vs-expected mismatch for DTC acknowledgement",
          `${detail.head} != ${detail.expectedHead}`,
          "warn",
        ));
      }
      return signals;
    }),
  ];
}

function validateRuntimeHookSplit(): OntologyRuntimeHealthSignal[] {
  const projection = projectRuntimeHookMount("codex");
  const projectedCodexEvents = new Set([
    ...projection.supportedEvents,
    ...projection.unsupportedEvents,
    ...projection.schemaOnlyEvents,
    ...projection.workflows.map((workflow) => workflow.event),
  ]);
  const leakedClaudeOnly = CLAUDE_ONLY_HOOK_EVENTS.filter((event) => projectedCodexEvents.has(event));
  const missingUnsupported = CODEX_UNSUPPORTED_HOOK_EVENTS.filter((event) =>
    !projection.unsupportedEvents.includes(event)
  );
  const missingSchemaOnly = CODEX_SCHEMA_ONLY_HOOK_EVENTS.filter((event) =>
    !projection.schemaOnlyEvents.includes(event)
  );
  const signals: OntologyRuntimeHealthSignal[] = [];
  if (leakedClaudeOnly.length > 0) {
    signals.push(signal(
      "runtime-hook-split-drift",
      "lib/hooks/workflow-registry.ts",
      "non-Codex task and teammate lifecycle events must not project into Codex hook mounts",
      leakedClaudeOnly.join(", "),
      "fail",
    ));
  }
  if (missingUnsupported.length > 0) {
    signals.push(signal(
      "runtime-hook-split-drift",
      "lib/hooks/workflow-registry.ts",
      "Codex unsupported non-Codex lifecycle events must remain explicit",
      missingUnsupported.join(", "),
      "fail",
    ));
  }
  if (missingSchemaOnly.length > 0) {
    signals.push(signal(
      "runtime-hook-split-drift",
      "lib/hooks/workflow-registry.ts",
      "Codex schema-only hook events must remain explicit until smoke-proven",
      missingSchemaOnly.join(", "),
      "fail",
    ));
  }
  return signals;
}

export default async function pmHealthAuditOntologyRuntime(
  rawArgs: unknown,
): Promise<OntologyRuntimeHealthResult> {
  const args = (rawArgs ?? {}) as { project?: string };
  const project = args.project ?? process.cwd();
  const index = loadProjectOntologyIndex(project);

  const indexSignals = validateIndex(index);
  const traceSignals = validateWorkflowTraceClosure(project);
  const approvalSignals = validateApprovalRefs(project);
  const schemaSignals = validateIndexSchemaVersion(index);
  const governanceSignals = validateGovernanceRefs(project);
  const deprecationSignals = validateDeprecatedMcpReplacements(project);
  const fdeSignals = validateFDEOntologyRuntime(project);
  const evidencePromotionSignals = validateEvidencePromotionDrift(project);
  const subrepoSignals = validateSubrepoRisk(project);
  const hookSplitSignals = validateRuntimeHookSplit();

  const signals = [
    ...indexSignals,
    ...traceSignals,
    ...approvalSignals,
    ...schemaSignals,
    ...governanceSignals,
    ...deprecationSignals,
    ...fdeSignals,
    ...evidencePromotionSignals,
    ...subrepoSignals,
    ...hookSplitSignals,
  ];
  const verdict = signals.some((item) => item.severity === "fail") ? "fail" : "pass";

  return {
    mode: "ontology-runtime",
    project,
    projectId: index.projectId,
    capabilityCount: index.capabilities.length,
    surfaceCount: index.surfaces.length,
    validationPackCount: index.validationPacks.length,
    knownIssueCount: index.knownIssues.length,
    signals,
    verdict,
  };
}
