import { createHash } from "node:crypto";
import * as fs from "fs";
import * as path from "path";
import { emit } from "../../scripts/log";
import type { EventEnvelope } from "../event-log/types";
import { upsertKnownIssue } from "../issues/issue-store";
import type { KnownIssue } from "../issues/known-issue";
import {
  classifyHarnessFailure,
  harnessFailureObservationId,
  readHarnessFailureLedger,
  type HarnessFailureClassification,
} from "./failure-ledger";

export type HarnessRatchetScope =
  | "timeout"
  | "hook-policy"
  | "capability-gap"
  | "validation"
  | "managed-settings"
  | "broad-suite";

export interface HarnessRatchetProposalInput {
  readonly scope: HarnessRatchetScope;
  readonly reason: string;
  readonly evidenceRefs: readonly string[];
  readonly proposedChange: string;
  readonly rollback: string;
}

export interface HarnessRatchetProposal extends HarnessRatchetProposalInput {
  readonly proposalId: string;
  readonly lifecycle: "internal";
  readonly status: "proposed";
  readonly broadSuiteClassification?: HarnessFailureClassification;
  readonly releaseBlocking?: boolean;
}

export type BackPropagationProposalTarget =
  | "ontology-contract"
  | "eval-suite"
  | "rule"
  | "harness-check"
  | "known-issue-ledger"
  | "research-routing";

export interface BackPropagationOutcomeSnapshot {
  readonly verdict?: "pass" | "fail" | "unknown";
  readonly score?: number;
  readonly contractRef?: string;
  readonly evalSuiteId?: string;
  readonly evalRunId?: string;
  readonly description?: string;
}

export interface BackPropagationOutcomePairEvidence {
  readonly outcomePairId: string;
  readonly sourceEventId?: string;
  readonly actionRid?: string;
  readonly expected?: BackPropagationOutcomeSnapshot;
  readonly actual?: BackPropagationOutcomeSnapshot;
  readonly evidenceRefs?: readonly string[];
}

export interface BackPropagationProposalRoute {
  readonly target: BackPropagationProposalTarget;
  readonly targetRef: string;
}

export interface BackPropagationProposalLineage {
  readonly sourceEvent: {
    readonly eventId: string;
    readonly eventType: string;
    readonly valueGrade: "T3" | "T4";
    readonly when: string;
    readonly actionRid?: string;
  };
  readonly refinementTarget?: {
    readonly kind: string;
    readonly filePathOrRid: string;
    readonly description: string;
    readonly confidenceLevel: string;
  };
  readonly outcomePairs: readonly BackPropagationOutcomePairEvidence[];
  readonly routing: BackPropagationProposalRoute;
}

export interface BackPropagationProposal {
  readonly proposalId: string;
  readonly kind: "BackPropagationProposal";
  readonly status: "pending";
  readonly approvalRequired: true;
  readonly reversible: true;
  readonly mutationBoundary: "proposal-only";
  readonly target: BackPropagationProposalTarget;
  readonly targetRef: string;
  readonly reason: string;
  readonly proposedChange: string;
  readonly rollback: string;
  readonly sourceEventIds: readonly string[];
  readonly outcomePairIds: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly lineage: BackPropagationProposalLineage;
}

export interface BuildBackPropagationProposalsInput {
  readonly events: readonly EventEnvelope[];
  readonly outcomePairs?: readonly BackPropagationOutcomePairEvidence[];
}

const RATCHET_EVENT_TYPES = new Set([
  "hook_timeout_observed",
  "prompt_dtc_denied",
  "project_scope_conformance_failed",
  "contract_ref_unresolved",
  "pm_plugin_self_check_failed",
  "managed_settings_drift",
  "broad_test_failure_observed",
  "subagent_output_contract_failed",
]);

export function createHarnessRatchetProposal(
  input: HarnessRatchetProposalInput,
): HarnessRatchetProposal {
  const slug = input.scope.replace(/[^a-z0-9]+/g, "-");
  const digestInput = `${input.reason}::${input.evidenceRefs.join("|")}::${input.proposedChange}`;
  const digest = createHash("sha256").update(digestInput).digest("hex").slice(0, 12);
  return {
    ...input,
    proposalId: `harness-ratchet:${slug}:${digest}`,
    lifecycle: "internal",
    status: "proposed",
  };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? "undefined" : serialized;
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(record[key])}`
  ).join(",")}}`;
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

function eventIdString(event: EventEnvelope): string {
  return String(event.eventId ?? "");
}

function eventActionRid(event: EventEnvelope): string | undefined {
  const lineageActionRid = event.lineageRefs?.actionRid;
  if (typeof lineageActionRid === "string" && lineageActionRid.length > 0) {
    return lineageActionRid;
  }
  const payload = event.payload as Record<string, unknown>;
  for (const key of ["actionRid", "contractId", "loopId", "scenarioId", "dryRunRef"]) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  const id = eventIdString(event);
  return id.length > 0 ? id : undefined;
}

function refinementTargetFor(event: EventEnvelope): BackPropagationProposalLineage["refinementTarget"] {
  const target = event.withWhat?.refinementTarget as Record<string, unknown> | undefined;
  if (!target) return undefined;
  const kind = target["kind"];
  const filePathOrRid = target["filePathOrRid"];
  const description = target["description"];
  const confidenceLevel = target["confidenceLevel"];
  if (
    typeof kind !== "string" ||
    typeof filePathOrRid !== "string" ||
    typeof description !== "string" ||
    typeof confidenceLevel !== "string"
  ) {
    return undefined;
  }
  if (
    kind.length === 0 ||
    filePathOrRid.length === 0 ||
    description.length === 0 ||
    confidenceLevel.length === 0
  ) {
    return undefined;
  }
  return { kind, filePathOrRid, description, confidenceLevel };
}

function backPropagationValueGrade(event: EventEnvelope): "T3" | "T4" | null {
  if (event.valueGrade === "T3" || event.valueGrade === "T4") return event.valueGrade;
  if (event.valueGrade !== undefined) return null;
  const payload = event.payload as Record<string, unknown>;
  if (typeof payload["promotedFrom"] === "string") return "T4";
  const reasoning = event.withWhat?.reasoning ?? "";
  const memoryLayers = event.withWhat?.memoryLayers ?? [];
  if (
    reasoning.length >= 40 &&
    memoryLayers.length > 0 &&
    refinementTargetFor(event) !== undefined
  ) {
    return "T3";
  }
  return null;
}

export function isBackPropagationInputEvent(event: EventEnvelope): boolean {
  return backPropagationValueGrade(event) !== null;
}

export function pairOutcomeEvidenceForEvent(
  event: EventEnvelope,
  outcomePairs: readonly BackPropagationOutcomePairEvidence[] = [],
): BackPropagationOutcomePairEvidence[] {
  const id = eventIdString(event);
  const actionRid = eventActionRid(event);
  const lineageOutcomePairId = event.lineageRefs?.outcomePairId as string | undefined;
  return outcomePairs
    .filter((pair) =>
      pair.sourceEventId === id ||
      (actionRid !== undefined && pair.actionRid === actionRid) ||
      (lineageOutcomePairId !== undefined && pair.outcomePairId === lineageOutcomePairId)
    )
    .slice()
    .sort((a, b) => a.outcomePairId.localeCompare(b.outcomePairId));
}

function firstOutcomeValue(
  pairs: readonly BackPropagationOutcomePairEvidence[],
  field: keyof BackPropagationOutcomeSnapshot,
): string | undefined {
  for (const pair of pairs) {
    const expected = pair.expected?.[field];
    if (typeof expected === "string" && expected.length > 0) return expected;
    const actual = pair.actual?.[field];
    if (typeof actual === "string" && actual.length > 0) return actual;
  }
  return undefined;
}

export function routeBackPropagationProposalTarget(
  event: EventEnvelope,
  outcomePairs: readonly BackPropagationOutcomePairEvidence[] = [],
): BackPropagationProposalRoute {
  const target = refinementTargetFor(event);
  if (target) {
    switch (target.kind) {
      case "primitive-field-add":
      case "primitive-field-extend-enum":
        return { target: "ontology-contract", targetRef: target.filePathOrRid };
      case "grading-criterion-threshold":
        return { target: "eval-suite", targetRef: target.filePathOrRid };
      case "rule-conformance-policy":
        return { target: "rule", targetRef: target.filePathOrRid };
      case "event-type-add":
        return { target: "harness-check", targetRef: target.filePathOrRid };
      case "failure-category-add":
        return { target: "known-issue-ledger", targetRef: target.filePathOrRid };
      default:
        return { target: "research-routing", targetRef: target.filePathOrRid };
    }
  }

  const payload = event.payload as Record<string, unknown>;
  const evalRef = firstOutcomeValue(outcomePairs, "evalRunId") ??
    firstOutcomeValue(outcomePairs, "evalSuiteId");
  if (evalRef !== undefined) return { target: "eval-suite", targetRef: evalRef };

  const contractRef = firstOutcomeValue(outcomePairs, "contractRef");
  if (contractRef !== undefined) return { target: "ontology-contract", targetRef: contractRef };

  for (const key of ["ruleId", "ruleRef", "ruleCitation"]) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return { target: "rule", targetRef: value };
    }
  }
  for (const key of ["knownIssueId", "failureClass"]) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return { target: "known-issue-ledger", targetRef: value };
    }
  }
  for (const key of ["testPath", "harnessCheck", "errorClass"]) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return { target: "harness-check", targetRef: value };
    }
  }
  const id = eventIdString(event);
  return { target: "research-routing", targetRef: id.length > 0 ? id : "unknown-event" };
}

function proposedBackPropagationChange(
  route: BackPropagationProposalRoute,
  event: EventEnvelope,
): string {
  const id = eventIdString(event);
  switch (route.target) {
    case "ontology-contract":
      return `Open an approval review for ontology contract refinement at ${route.targetRef} using BackPropagation evidence from ${id}.`;
    case "eval-suite":
      return `Open an approval review for eval expectation or suite coverage at ${route.targetRef} using BackPropagation evidence from ${id}.`;
    case "rule":
      return `Open an approval review for rule refinement at ${route.targetRef} using BackPropagation evidence from ${id}.`;
    case "harness-check":
      return `Open an approval review for harness check refinement at ${route.targetRef} using BackPropagation evidence from ${id}.`;
    case "known-issue-ledger":
      return `Open an approval review for known-issue ledger entry or mitigation at ${route.targetRef} using BackPropagation evidence from ${id}.`;
    case "research-routing":
    default:
      return `Route BackPropagation evidence from ${id} to research triage for target ${route.targetRef}.`;
  }
}

function backPropagationReason(
  event: EventEnvelope,
  grade: "T3" | "T4",
  route: BackPropagationProposalRoute,
  pairs: readonly BackPropagationOutcomePairEvidence[],
): string {
  const payload = event.payload as Record<string, unknown>;
  const detail = payload["reason"] ?? payload["details"] ?? payload["message"] ??
    payload["errorClass"] ?? event.type;
  const pairSummary = pairs.length > 0
    ? ` paired with ${pairs.length} outcome-pair evidence record(s)`
    : " without outcome-pair evidence";
  return `${grade} ${event.type} ${eventIdString(event)}${pairSummary}; route ${route.target}:${route.targetRef}; ${String(detail)}`.slice(0, 320);
}

function createBackPropagationProposal(
  event: EventEnvelope,
  pairs: readonly BackPropagationOutcomePairEvidence[],
): BackPropagationProposal | null {
  const grade = backPropagationValueGrade(event);
  if (grade === null) return null;

  const route = routeBackPropagationProposalTarget(event, pairs);
  const eventId = eventIdString(event);
  const outcomePairIds = uniqueSorted(pairs.map((pair) => pair.outcomePairId));
  const evidenceRefs = uniqueSorted([
    eventId,
    ...pairs.flatMap((pair) => [pair.outcomePairId, ...(pair.evidenceRefs ?? [])]),
  ]);
  const actionRid = eventActionRid(event);
  const refinementTarget = refinementTargetFor(event);
  const digest = createHash("sha256")
    .update(stableJson({
      eventId,
      grade,
      outcomePairIds,
      target: route.target,
      targetRef: route.targetRef,
    }))
    .digest("hex")
    .slice(0, 12);
  const proposalId = `backprop-proposal:${route.target}:${digest}`;
  const lineage: BackPropagationProposalLineage = {
    sourceEvent: {
      eventId,
      eventType: event.type,
      valueGrade: grade,
      when: event.when,
      ...(actionRid !== undefined ? { actionRid } : {}),
    },
    ...(refinementTarget !== undefined
      ? { refinementTarget }
      : {}),
    outcomePairs: pairs,
    routing: route,
  };
  return {
    proposalId,
    kind: "BackPropagationProposal",
    status: "pending",
    approvalRequired: true,
    reversible: true,
    mutationBoundary: "proposal-only",
    target: route.target,
    targetRef: route.targetRef,
    reason: backPropagationReason(event, grade, route, pairs),
    proposedChange: proposedBackPropagationChange(route, event),
    rollback: "Reject or delete this pending BackPropagationProposal; no source, schema, rule, eval, ledger, research, generated, or runtime mutation was applied by this record.",
    sourceEventIds: [eventId],
    outcomePairIds,
    evidenceRefs,
    lineage,
  };
}

export function buildBackPropagationProposals(
  input: BuildBackPropagationProposalsInput,
): BackPropagationProposal[] {
  return input.events
    .slice()
    .sort((a, b) => {
      const when = a.when.localeCompare(b.when);
      if (when !== 0) return when;
      return eventIdString(a).localeCompare(eventIdString(b));
    })
    .flatMap((event) => {
      const proposal = createBackPropagationProposal(
        event,
        pairOutcomeEvidenceForEvent(event, input.outcomePairs ?? []),
      );
      return proposal === null ? [] : [proposal];
    });
}

function parseEvents(eventsJsonlPath: string): EventEnvelope[] {
  if (!fs.existsSync(eventsJsonlPath)) return [];
  return fs
    .readFileSync(eventsJsonlPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as EventEnvelope];
      } catch {
        return [];
      }
    });
}

function ratchetType(event: EventEnvelope): string | null {
  if (RATCHET_EVENT_TYPES.has(event.type)) return event.type;
  const errorClass = (event.payload as { errorClass?: unknown })?.errorClass;
  return typeof errorClass === "string" && RATCHET_EVENT_TYPES.has(errorClass)
    ? errorClass
    : null;
}

function scopeForType(type: string): HarnessRatchetScope {
  switch (type) {
    case "hook_timeout_observed":
      return "timeout";
    case "managed_settings_drift":
      return "managed-settings";
    case "broad_test_failure_observed":
      return "broad-suite";
    case "project_scope_conformance_failed":
      return "capability-gap";
    case "prompt_dtc_denied":
    case "contract_ref_unresolved":
    case "subagent_output_contract_failed":
      return "validation";
    case "pm_plugin_self_check_failed":
    default:
      return "hook-policy";
  }
}

function reasonForEvent(type: string, event: EventEnvelope): string {
  const payload = event.payload as Record<string, unknown>;
  const detail = payload.reason ?? payload.details ?? payload.message ?? payload.errorClass ?? type;
  return String(detail).slice(0, 180);
}

function proposedChangeFor(type: string, scope: HarnessRatchetScope): string {
  switch (type) {
    case "hook_timeout_observed":
      return "Review hook timeout budget and classification; raise timeout or split heavy work out of lifecycle hooks.";
    case "prompt_dtc_denied":
      return "Clarify Prompt-to-DTC contract authoring path and add a focused regression for denied routing.";
    case "project_scope_conformance_failed":
      return "Update project-scope boundaries or route the edit to the correct writable surface.";
    case "contract_ref_unresolved":
      return "Repair contract-ref persistence or lookup before routing from approved refs.";
    case "managed_settings_drift":
      return "Sync managed-settings fragment with the current public MCP/tool policy.";
    case "broad_test_failure_observed":
      return "Keep known broad-suite debt ledgered while treating new or changed failures as release-blocking.";
    case "subagent_output_contract_failed":
      return "Tighten subagent output contract briefing and add verification for required sections.";
    case "pm_plugin_self_check_failed":
    default:
      return `Investigate ${scope} self-check failure and add a regression before release.`;
  }
}

function lowerBoundFromSinceMs(sinceMs: number): number {
  return sinceMs > 1_000_000_000_000 ? sinceMs : Date.now() - sinceMs;
}

function ratchetPath(projectRoot: string, proposalId: string): string {
  return path.join(projectRoot, ".palantir-mini", "harness", "ratchets", `${proposalId}.json`);
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

async function emitRatchetEvent(projectRoot: string, proposal: HarnessRatchetProposal): Promise<void> {
  const savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: true,
        errorClass: "harness_ratchet_proposed",
        proposalId: proposal.proposalId,
        scope: proposal.scope,
        evidenceRefs: proposal.evidenceRefs,
      } as Record<string, unknown>,
      toolName: "harness-ratchet-synthesize",
      cwd: projectRoot,
      identity: "monitor",
      memoryLayers: ["procedural", "semantic"],
      reasoning: `Harness ratchet proposal ${proposal.proposalId} synthesized from ${proposal.evidenceRefs.length} event(s).`,
    });
  } finally {
    if (savedEventsFile === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
    else process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  }
}

export async function synthesizeRatchetProposals(
  eventsJsonlPath: string,
  sinceMs: number,
  projectRoot: string,
): Promise<HarnessRatchetProposal[]> {
  const lowerBound = lowerBoundFromSinceMs(sinceMs);
  const broadFailureLedger = readHarnessFailureLedger(projectRoot);
  const clusters = new Map<string, {
    type: string;
    scope: HarnessRatchetScope;
    reason: string;
    evidenceRefs: string[];
    firstObservedAt: string;
    lastObservedAt: string;
    broadSuiteClassification?: HarnessFailureClassification;
    releaseBlocking?: boolean;
  }>();

  for (const event of parseEvents(eventsJsonlPath)) {
    const type = ratchetType(event);
    if (type === null) continue;
    const when = Date.parse(event.when);
    if (Number.isFinite(when) && when < lowerBound) continue;
    const observedAt = Number.isFinite(when) ? event.when : new Date().toISOString();
    const scope = scopeForType(type);
    const reason = reasonForEvent(type, event);
    const payload = event.payload as Record<string, unknown>;
    const broadObservation = type === "broad_test_failure_observed" &&
      typeof payload.testPath === "string"
      ? {
        testPath: payload.testPath,
        ...(typeof payload.testName === "string" ? { testName: payload.testName } : {}),
        ...(typeof payload.failureClass === "string"
          ? { failureClass: payload.failureClass }
          : {}),
      }
      : undefined;
    const broadClassification = broadObservation
      ? classifyHarnessFailure(broadObservation, broadFailureLedger)
      : undefined;
    const keySubject = broadObservation
      ? harnessFailureObservationId(broadObservation)
      : reason;
    const key = `${scope}:${type}:${keySubject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 96)}`;
    const existing = clusters.get(key);
    const eventId = String(event.eventId ?? `${type}:${event.when}`);
    if (existing) {
      existing.evidenceRefs.push(eventId);
      if (observedAt < existing.firstObservedAt) existing.firstObservedAt = observedAt;
      if (observedAt > existing.lastObservedAt) existing.lastObservedAt = observedAt;
      if (broadClassification?.releaseBlocking) existing.releaseBlocking = true;
      existing.broadSuiteClassification ??= broadClassification?.classification;
    } else {
      clusters.set(key, {
        type,
        scope,
        reason,
        evidenceRefs: [eventId],
        firstObservedAt: observedAt,
        lastObservedAt: observedAt,
        broadSuiteClassification: broadClassification?.classification,
        releaseBlocking: broadClassification?.releaseBlocking,
      });
    }
  }

  const proposals = [...clusters.values()].map((cluster) => {
    const proposal = createHarnessRatchetProposal({
      scope: cluster.scope,
      reason: cluster.reason,
      evidenceRefs: Array.from(new Set(cluster.evidenceRefs)).sort(),
      proposedChange: proposedChangeFor(cluster.type, cluster.scope),
      rollback: "Delete the ratchet proposal JSON and revert the follow-up policy/code change if it causes false positives.",
    });
    return {
      ...proposal,
      ...(cluster.broadSuiteClassification
        ? { broadSuiteClassification: cluster.broadSuiteClassification }
        : {}),
      ...(cluster.releaseBlocking !== undefined
        ? { releaseBlocking: cluster.releaseBlocking }
        : {}),
    };
  });

  for (const proposal of proposals) {
    atomicWriteJson(ratchetPath(projectRoot, proposal.proposalId), proposal);
    const cluster = [...clusters.values()].find((item) =>
      proposal.evidenceRefs.every((ref) => item.evidenceRefs.includes(ref))
    );
    if (cluster && cluster.evidenceRefs.length >= 2) {
      upsertKnownIssue(projectRoot, knownIssueFromRatchetCluster(projectRoot, cluster, proposal));
    }
    try {
      await emitRatchetEvent(projectRoot, proposal);
    } catch {
      // best-effort: proposal JSON is the durable artifact.
    }
  }

  return proposals;
}

function knownIssueFromRatchetCluster(
  projectRoot: string,
  cluster: {
    readonly type: string;
    readonly scope: HarnessRatchetScope;
    readonly reason: string;
    readonly evidenceRefs: readonly string[];
    readonly firstObservedAt: string;
    readonly lastObservedAt: string;
  },
  proposal: HarnessRatchetProposal,
): KnownIssue {
  return {
    issueId: proposal.proposalId.replace(/^harness-ratchet:/, "known-issue:"),
    projectId: path.basename(projectRoot),
    title: `Repeated ${cluster.type} failure`,
    source: "harness-ratchet-synthesize",
    firstObservedAt: cluster.firstObservedAt,
    lastObservedAt: cluster.lastObservedAt,
    observedCount: new Set(cluster.evidenceRefs).size,
    mitigationStatus: "unmitigated",
    triggerPatterns: [cluster.type, cluster.reason],
    affectedCapabilityRefs: [cluster.scope],
    affectedSurfaceRefs: [],
    validationPackRefs: ["harness-ratchet"],
    severity: cluster.evidenceRefs.length >= 3 ? "high" : "medium",
    status: "watching",
    recommendedAction: proposal.proposedChange,
    sourceRefs: Array.from(new Set(cluster.evidenceRefs)).sort(),
  };
}
