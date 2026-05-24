import * as fs from "node:fs";
import * as path from "node:path";
import { attachOntologyContextQueryRefToCapsule } from "../../lib/context/context-capsule";
import {
  createUniversalOntologyEntry,
  type UniversalOntologyEntry,
} from "../../lib/ontology-entry/universal-entry";
import {
  readCurrentUniversalOntologyEntry,
  readUniversalOntologyEntry,
  readUniversalOntologyEntryByRef,
  universalOntologyEntryRef,
  writeUniversalOntologyEntry,
} from "../../lib/ontology-entry/entry-store";
import { transitionUniversalOntologyEntry } from "../../lib/ontology-entry/lifecycle";
import {
  queryOntologyContext,
  type OntologyContextQueryResult,
} from "../../lib/ontology-context/query";
import {
  openOntologyWorkflowTrace,
  type OntologyWorkflowTrace,
} from "../../lib/ontology-workflow/emit";
import type { PromptRuntime } from "../../lib/prompt-front-door";

export interface OntologyContextQueryHandlerInput {
  readonly project: string;
  readonly entryId?: string;
  readonly entryRef?: string;
  readonly rawIntent?: string;
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly sessionId?: string;
  readonly runtime?: PromptRuntime;
  readonly includeSkillCapabilities?: boolean;
  readonly includeGenericCapabilities?: boolean;
  readonly includeImpactForecast?: boolean;
  readonly includeKnownIssues?: boolean;
  readonly includeValidationPacks?: boolean;
  /** Opt-in: when true, retrieves document context from <project>/.palantir-mini/document-corpus.json. Default false. */
  readonly includeDocumentContext?: boolean;
}

export interface OntologyContextQueryHandlerResult extends OntologyContextQueryResult {
  readonly queryPath: string;
  readonly queryRef: string;
  readonly universalOntologyEntryRef: string;
  readonly workflowTrace: OntologyWorkflowTrace;
}

function assertInput(value: unknown): asserts value is OntologyContextQueryHandlerInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("ontology_context_query requires an object input.");
  }
  const input = value as Partial<OntologyContextQueryHandlerInput>;
  if (typeof input.project !== "string" || input.project.trim().length === 0) {
    throw new Error("ontology_context_query requires project.");
  }
  if (
    input.rawIntent !== undefined &&
    (typeof input.rawIntent !== "string" || input.rawIntent.trim().length === 0)
  ) {
    throw new Error("ontology_context_query rawIntent must be a non-empty string when provided.");
  }
}

function queryDir(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", "ontology-context-queries");
}

function safeFileSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128) || "query";
}

function queryPath(projectRoot: string, queryId: string): string {
  return path.join(queryDir(projectRoot), `${safeFileSegment(queryId)}.json`);
}

function queryRef(queryId: string): string {
  return `ontology-context-query://${safeFileSegment(queryId)}`;
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function resolveEntry(input: OntologyContextQueryHandlerInput): UniversalOntologyEntry {
  if (input.entryRef) {
    const entry = readUniversalOntologyEntryByRef(input.project, input.entryRef);
    if (entry) return entry;
  }
  if (input.entryId) {
    const entry = readUniversalOntologyEntry(input.project, input.entryId);
    if (entry) return entry;
  }
  const current = readCurrentUniversalOntologyEntry(input.project);
  if (current) return current;
  if (!input.rawIntent) {
    throw new Error("ontology_context_query requires entryRef, entryId, current entry, or rawIntent.");
  }
  const write = writeUniversalOntologyEntry(createUniversalOntologyEntry({
    rawUserRequest: input.rawIntent,
    projectRoot: input.project,
    promptId: input.promptId,
    promptHash: input.promptHash,
    sessionId: input.sessionId,
    runtime: input.runtime,
  }));
  const created = readUniversalOntologyEntryByRef(input.project, write.entryRef);
  if (!created) throw new Error(`ontology_context_query failed to persist ${write.entryRef}.`);
  return created;
}

export async function ontologyContextQuery(
  input: OntologyContextQueryHandlerInput,
): Promise<OntologyContextQueryHandlerResult> {
  const entry = resolveEntry(input);
  const result = queryOntologyContext({
    entry,
    projectRoot: input.project,
    includeSkillCapabilities: input.includeSkillCapabilities,
    includeGenericCapabilities: input.includeGenericCapabilities,
    includeImpactForecast: input.includeImpactForecast,
    includeKnownIssues: input.includeKnownIssues,
    includeValidationPacks: input.includeValidationPacks,
    includeDocumentContext: input.includeDocumentContext ?? false,
  });
  const ref = queryRef(result.queryId);
  const entryRef = universalOntologyEntryRef(entry);
  const workflowTrace = await openOntologyWorkflowTrace({
    projectRoot: input.project,
    mode: "context-only",
    universalOntologyEntryRef: entryRef,
    ontologyContextQueryRef: ref,
    capabilityRefs: result.capabilityContext.selectedCapabilityIds,
    knownIssueRefs: result.issueContext.knownIssueIds,
    validationPackRefs: result.validationContext.requiredValidationPacks,
    sessionId: input.sessionId,
    reasoning: `ontology_context_query opens trace mode=context-only traceId pending — rule 01 §ForwardProp; PR-10 replaces dead createOntologyWorkflowTrace with live emitter`,
  });
  const output: OntologyContextQueryHandlerResult = {
    ...result,
    queryPath: queryPath(input.project, result.queryId),
    queryRef: ref,
    universalOntologyEntryRef: entryRef,
    workflowTrace,
  };
  atomicWriteJson(output.queryPath, output);
  await attachOntologyContextQueryRefToCapsule(input.promptId, ref, input.project);

  // Transition UniversalOntologyEntry to "context-retrieved" (best-effort).
  await transitionUniversalOntologyEntry({
    entry,
    nextStatus: "context-retrieved",
    refs: { ontologyContextQueryRef: ref },
    projectRoot: input.project,
  }).catch(() => {/* best-effort — transition never blocks query result */});

  return output;
}

export default async function handler(rawArgs: unknown): Promise<OntologyContextQueryHandlerResult> {
  assertInput(rawArgs);
  return ontologyContextQuery(rawArgs);
}
