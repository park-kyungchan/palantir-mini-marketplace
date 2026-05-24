import {
  artifactExists,
  classifyReleaseChangedSurfaces,
  collectChangedFiles,
  eventType,
  payloadObject,
  readJsonArtifacts,
  readProjectEvents,
  uniqueSorted,
} from "../../../lib/harness/release-evidence";
import type { PmPluginSelfCheckResult } from "./types";

type OutcomeReplayEvidenceResult = PmPluginSelfCheckResult["outcomeReplayEvidenceResult"];

interface ReplayEvidence {
  readonly sourceRef: string;
  readonly sprintNumber?: number;
  readonly passed: boolean;
}

const OUTCOME_REPLAY_ARTIFACT_DIRS = [
  ".palantir-mini/session/outcome-replays",
  ".palantir-mini/session/artifacts/outcome-replays",
  ".palantir-mini/harness/outcome-replays",
] as const;

function stringField(data: Record<string, unknown>, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function numberField(data: Record<string, unknown>, field: string): number | undefined {
  const value = data[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function passedReplay(data: Record<string, unknown>): boolean {
  const finalVerdict = stringField(data, "finalVerdict") ?? stringField(data, "verdict");
  const totalEvents = numberField(data, "totalEvents");
  const timeline = data.timeline;
  const hasTimeline = Array.isArray(timeline) ? timeline.length > 0 : totalEvents !== undefined && totalEvents > 0;
  return finalVerdict === "passed" && hasTimeline;
}

function replayEvidence(
  sourceRef: string,
  passed: boolean,
  sprintNumber?: number,
): ReplayEvidence {
  return {
    sourceRef,
    passed,
    ...(sprintNumber !== undefined ? { sprintNumber } : {}),
  };
}

function eventEvidence(project: string): ReplayEvidence[] {
  return readProjectEvents(project).flatMap((event) => {
    const data = payloadObject(event);
    const type = eventType(event);
    const isReplay = type === "harness_outcome_replay_completed" ||
      stringField(data, "errorClass") === "harness_outcome_replay_completed";
    if (!isReplay) return [];
    const artifactPath = stringField(data, "artifactPath") ?? stringField(data, "reportPath");
    if (artifactPath && !artifactExists(project, artifactPath)) return [];
    const sourceRef = artifactPath ?? `${type}:${String((event as { eventId?: unknown }).eventId ?? event.when)}`;
    return [replayEvidence(sourceRef, passedReplay(data), numberField(data, "sprintNumber"))];
  });
}

function fileEvidence(project: string): ReplayEvidence[] {
  return readJsonArtifacts(project, OUTCOME_REPLAY_ARTIFACT_DIRS).map((artifact) =>
    replayEvidence(
      artifact.sourcePath,
      passedReplay(artifact.data),
      numberField(artifact.data, "sprintNumber"),
    )
  );
}

export function checkOutcomeReplayEvidence(
  project: string,
  changedFiles = collectChangedFiles(project),
): OutcomeReplayEvidenceResult {
  const changedSurfaces = classifyReleaseChangedSurfaces(changedFiles);
  const required = changedSurfaces.some((surface) => surface.surface === "harness");
  const evidenceItems = [...eventEvidence(project), ...fileEvidence(project)];
  const passingEvidence = evidenceItems.filter((item) => item.passed);
  const status: OutcomeReplayEvidenceResult["status"] =
    required && passingEvidence.length === 0 ? "fail" : "pass";

  return {
    status,
    details: !required
      ? "No harness release slice requires outcome replay evidence."
      : `Harness release slice requires outcome replay evidence; passing=${passingEvidence.length}; observed=${evidenceItems.length}.`,
    required,
    sprintNumbers: evidenceItems
      .flatMap((item) => item.sprintNumber === undefined ? [] : [item.sprintNumber])
      .sort((left, right) => left - right),
    replayArtifactCount: evidenceItems.length,
    evidenceRefs: uniqueSorted(evidenceItems.map((item) => item.sourceRef)),
    missingReplayEvidence: required && passingEvidence.length === 0
      ? ["harness release slice requires a passing pm_harness_outcome_replay artifact or event"]
      : [],
  };
}

