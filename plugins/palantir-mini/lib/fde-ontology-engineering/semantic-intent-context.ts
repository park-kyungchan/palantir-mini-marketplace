import * as fs from "node:fs";
import * as path from "node:path";
import type {
  FDEOntologyEngineeringSession,
  FDESemanticIntentContext,
} from "./types";
import { fdeOntologyEngineeringSessionDir } from "./session-store";
import { evaluateFDEReadinessProfile } from "./readiness-profile";

const SIDECAR_FILE = "semantic-intent-context.json";

function safeSegment(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128) || "session";
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function unique(values: readonly (string | undefined)[]): readonly string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  )));
}

export function fdeSemanticIntentContextPath(
  projectRoot: string,
  sessionId: string,
): string {
  return path.join(fdeOntologyEngineeringSessionDir(projectRoot, sessionId), SIDECAR_FILE);
}

export function fdeSemanticIntentContextRef(sessionId: string): string {
  return `fde-semantic-intent-context://session/${safeSegment(sessionId)}`;
}

export function buildFDESemanticIntentContext(
  session: FDEOntologyEngineeringSession,
  createdAt = new Date().toISOString(),
): FDESemanticIntentContext {
  const accepted = new Set(session.acceptedHypothesisIds);
  return {
    schemaVersion: "palantir-mini/fde-semantic-intent-context/v1",
    contextId: fdeSemanticIntentContextRef(session.sessionId),
    sessionId: session.sessionId,
    projectRoot: session.projectRoot,
    ...(session.semanticIntentContractRef
      ? { semanticIntentContractRef: session.semanticIntentContractRef }
      : {}),
    ...(session.digitalTwinChangeContractRef
      ? { digitalTwinChangeContractRef: session.digitalTwinChangeContractRef }
      : {}),
    ...(session.confirmedUserGoal ?? session.missionModel?.operationalDecision
      ? { confirmedGoal: session.confirmedUserGoal ?? session.missionModel?.operationalDecision }
      : {}),
    confirmedNonGoals: session.confirmedNonGoals,
    acceptedHypotheses: session.latentHypotheses
      .filter((hypothesis) => accepted.has(hypothesis.hypothesisId) || hypothesis.status === "accepted")
      .map((hypothesis) => ({
        hypothesisId: hypothesis.hypothesisId,
        ...(hypothesis.ruleId ? { ruleId: hypothesis.ruleId } : {}),
        ...(hypothesis.family ? { family: hypothesis.family } : {}),
        plainLanguage: hypothesis.plainLanguage,
        whyLeadInferredThis: hypothesis.whyLeadInferredThis,
        evidenceNeeded: hypothesis.evidenceNeeded,
        readinessRequirementIds: hypothesis.readinessRequirementIds ?? [],
        sourceRefs: hypothesis.sourceRefs,
      })),
    ontologyCandidates: {
      objects: session.objectCandidates.map((candidate) => candidate.plainName),
      links: session.linkCandidates.map((candidate) => candidate.plainName),
      actions: session.actionCandidates.map((candidate) => candidate.plainName),
      functions: session.functionCandidates.map((candidate) => candidate.plainName),
      chatbotContexts: session.chatbotContextCandidates.map((candidate) => candidate.plainName),
    },
    readinessProfile: session.readinessProfile ?? evaluateFDEReadinessProfile(session),
    trace: {
      sourceTurnIds: session.turnRecordIds,
      ...(session.workflowTraceRef ? { workflowTraceRef: session.workflowTraceRef } : {}),
      ...(session.ontologyContextQueryRef
        ? { ontologyContextQueryRef: session.ontologyContextQueryRef }
        : {}),
      ...(session.semanticIntentContextRef
        ? { semanticIntentContextRef: session.semanticIntentContextRef }
        : {}),
    },
    acceptedHypothesisRuleIds: unique(session.latentHypotheses
      .filter((hypothesis) => accepted.has(hypothesis.hypothesisId) || hypothesis.status === "accepted")
      .map((hypothesis) => hypothesis.ruleId)),
    readinessRequirementIds: unique(session.latentHypotheses
      .filter((hypothesis) => accepted.has(hypothesis.hypothesisId) || hypothesis.status !== "inferred")
      .flatMap((hypothesis) => hypothesis.readinessRequirementIds ?? [])),
    sourceRefs: unique([
      ...session.sourceRefs,
      session.ontologyContextQueryRef,
      session.workflowTraceRef,
      session.semanticIntentContractRef,
      session.digitalTwinChangeContractRef,
    ]),
    createdAt,
  };
}

export function writeFDESemanticIntentContextSidecar(
  context: FDESemanticIntentContext,
): { readonly sidecarPath: string; readonly contextRef: string } {
  const sidecarPath = fdeSemanticIntentContextPath(context.projectRoot, context.sessionId);
  atomicWriteJson(sidecarPath, context);
  return { sidecarPath, contextRef: context.contextId };
}

export function readFDESemanticIntentContextSidecar(
  projectRoot: string,
  sessionId: string,
): FDESemanticIntentContext | null {
  const sidecarPath = fdeSemanticIntentContextPath(projectRoot, sessionId);
  if (!fs.existsSync(sidecarPath)) return null;
  return JSON.parse(fs.readFileSync(sidecarPath, "utf8")) as FDESemanticIntentContext;
}
