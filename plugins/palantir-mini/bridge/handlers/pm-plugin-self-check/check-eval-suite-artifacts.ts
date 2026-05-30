import {
  artifactExists,
  classifyReleaseChangedSurfaces,
  collectChangedFiles,
  eventType,
  payloadObject,
  readJsonArtifacts,
  readProjectEvents,
  uniqueSorted,
  type ReleaseChangedSurface,
} from "../../../lib/harness/release-evidence";
import type { PmPluginSelfCheckResult } from "./types";

type EvalSuiteArtifactsResult = PmPluginSelfCheckResult["evalSuiteArtifactsResult"];

interface EvalRunArtifact {
  readonly suiteId: string;
  readonly runId?: string;
  readonly sourceRef: string;
  readonly passed: boolean;
}

const REQUIRED_SUITES_BY_SURFACE: Partial<Record<ReleaseChangedSurface, readonly string[]>> = {
  router: [
    "suite:prompt-to-dtc-regression",
    "suite:ontology-engineering-cross-runtime-enforcement",
  ],
  contract: [
    "suite:prompt-to-dtc-regression",
    "suite:ontology-engineering-cross-runtime-enforcement",
  ],
  prompt: [
    "suite:prompt-to-dtc-regression",
    "suite:ontology-engineering-cross-runtime-enforcement",
  ],
  dtc: [
    "suite:prompt-to-dtc-regression",
    "suite:ontology-engineering-cross-runtime-enforcement",
  ],
  agent: ["suite:fde-turn-quality-hooks"],
  harness: ["suite:release-gate-harness-evidence"],
  governance: ["suite:ontology-engineering-cross-runtime-enforcement"],
  runtime: ["suite:ontology-engineering-cross-runtime-enforcement"],
  "semantic-consistency": ["suite:semantic-consistency-regression"],
};

const EVAL_ARTIFACT_DIRS = [
  ".palantir-mini/eval-runs",
  ".palantir-mini/session/eval-runs",
  ".palantir-mini/session/artifacts/eval-runs",
  ".palantir-mini/harness/eval-runs",
] as const;

function stringField(data: Record<string, unknown>, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function suiteIdFrom(data: Record<string, unknown>): string | undefined {
  const nestedSuite = data.suite && typeof data.suite === "object"
    ? data.suite as Record<string, unknown>
    : undefined;
  return stringField(data, "suiteId") ??
    stringField(data, "evalSuiteId") ??
    (nestedSuite ? stringField(nestedSuite, "suiteId") : undefined);
}

function runIdFrom(data: Record<string, unknown>): string | undefined {
  return stringField(data, "evalRunId") ?? stringField(data, "runId");
}

function passedFrom(data: Record<string, unknown>): boolean {
  if (data.passed === true) return true;
  const status = stringField(data, "status") ?? stringField(data, "verdict");
  return status !== undefined && ["pass", "passed", "success", "succeeded"].includes(status.toLowerCase());
}

function evalArtifact(
  suiteId: string,
  sourceRef: string,
  passed: boolean,
  runId?: string,
): EvalRunArtifact {
  return {
    suiteId,
    sourceRef,
    passed,
    ...(runId ? { runId } : {}),
  };
}

function eventArtifacts(project: string): EvalRunArtifact[] {
  return readProjectEvents(project).flatMap((event) => {
    const data = payloadObject(event);
    const type = eventType(event);
    const errorClass = stringField(data, "errorClass");
    const isEvalEvent = [
      "eval_suite_run_completed",
      "aip_eval_suite_run_completed",
      "eval_suite_run_artifact",
    ].includes(type) || errorClass === "eval_suite_run_artifact";
    if (!isEvalEvent) return [];
    const suiteId = suiteIdFrom(data);
    const artifactPath = stringField(data, "artifactPath") ?? stringField(data, "reportPath");
    if (!suiteId || !artifactExists(project, artifactPath)) return [];
    return [evalArtifact(suiteId, artifactPath!, passedFrom(data), runIdFrom(data))];
  });
}

function fileArtifacts(project: string): EvalRunArtifact[] {
  return readJsonArtifacts(project, EVAL_ARTIFACT_DIRS).flatMap((artifact) => {
    const suiteId = suiteIdFrom(artifact.data);
    if (!suiteId) return [];
    return [evalArtifact(suiteId, artifact.sourcePath, passedFrom(artifact.data), runIdFrom(artifact.data))];
  });
}

export function checkEvalSuiteArtifacts(
  project: string,
  changedFiles = collectChangedFiles(project),
): EvalSuiteArtifactsResult {
  const changedSurfaces = classifyReleaseChangedSurfaces(changedFiles);
  const requiredPairs = changedSurfaces.flatMap((surface) =>
    (REQUIRED_SUITES_BY_SURFACE[surface.surface] ?? []).map((suiteId) => ({
      surface: surface.surface,
      path: surface.path,
      suiteId,
      reason: surface.reason,
    }))
  );
  const requiredSuiteIds = uniqueSorted(requiredPairs.map((pair) => pair.suiteId));
  const artifacts = [...eventArtifacts(project), ...fileArtifacts(project)];
  const passingSuites = new Set(artifacts.filter((artifact) => artifact.passed).map((artifact) => artifact.suiteId));
  const missingArtifacts = requiredPairs
    .filter((pair) => !passingSuites.has(pair.suiteId))
    .map((pair) => ({
      surface: pair.surface,
      suiteId: pair.suiteId,
      reason: `${pair.reason}; changed path=${pair.path}`,
    }));
  const status: EvalSuiteArtifactsResult["status"] = missingArtifacts.length > 0 ? "fail" : "pass";

  return {
    status,
    details: requiredSuiteIds.length === 0
      ? "No changed router/contract/prompt/DTC/agent/harness surfaces require eval suite run artifacts."
      : `Required eval suite artifacts=${requiredSuiteIds.length}; passing artifacts=${artifacts.filter((artifact) => artifact.passed).length}; missing=${missingArtifacts.length}.`,
    changedSurfaceCount: changedSurfaces.length,
    changedSurfaces,
    requiredSuiteIds,
    runArtifactCount: artifacts.length,
    artifactRefs: uniqueSorted(artifacts.map((artifact) =>
      artifact.runId ? `${artifact.suiteId}:${artifact.runId}:${artifact.sourceRef}` : `${artifact.suiteId}:${artifact.sourceRef}`
    )),
    missingArtifacts,
  };
}
