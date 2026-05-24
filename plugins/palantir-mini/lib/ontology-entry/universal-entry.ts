import * as crypto from "node:crypto";
import type { PromptRuntime } from "../prompt-front-door";

export const UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION =
  "palantir-mini/universal-ontology-entry/v1";

export type UniversalRequestKind =
  | "question"
  | "analysis"
  | "planning"
  | "implementation"
  | "debugging"
  | "content-authoring"
  | "review"
  | "release";

export interface UniversalOntologyEntry {
  readonly entryId: string;
  readonly schemaVersion: typeof UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION;
  readonly createdAt: string;

  readonly prompt: {
    readonly promptId?: string;
    readonly promptHash?: string;
    readonly sessionId?: string;
    readonly runtime?: PromptRuntime;
    readonly excerpt: string;
  };

  readonly project: {
    readonly projectRoot: string;
    readonly candidateProjectIds: readonly string[];
  };

  readonly classification: {
    readonly requestKind: UniversalRequestKind;
    readonly mutationExpected: boolean;
    readonly learnerVisible: boolean;
    readonly requiresDtc: boolean;
    readonly canProceedReadOnly: boolean;
  };

  readonly ontologySeed: {
    readonly nouns: readonly string[];
    readonly verbs: readonly string[];
    readonly surfaceHints: readonly string[];
    readonly capabilityHints: readonly string[];
  };

  readonly status:
    | "captured"
    | "context-retrieved"
    | "clarifying"
    | "semantic-approved"
    | "dtc-required"
    | "routed";
}

export interface CreateUniversalOntologyEntryInput {
  readonly rawUserRequest: string;
  readonly projectRoot: string;
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly sessionId?: string;
  readonly runtime?: PromptRuntime;
  readonly createdAt?: string;
}

const STRONG_MUTATION_TERMS = [
  "implement",
  "add",
  "edit",
  "write",
  "fix",
  "patch",
  "mutate",
  "create",
  "delete",
  "remove",
  "commit",
  "merge",
  "deploy",
  "구현",
  "수정",
  "추가",
  "삭제",
  "반영",
  "패치",
  "커밋",
  "배포",
  "머지",
];

const WEAK_WORK_TERMS = [
  "work",
  "progress",
  "proceed",
  "proposal",
  "review",
  "analyze",
  "analysis",
  "cleanup",
  "summarize",
  "진행",
  "작업",
  "검토",
  "리뷰",
  "정리",
  "제안",
  "분석",
];

const WRITABLE_SURFACE_MARKERS = [
  "writable surface",
  "write surface",
  "writesurface",
  "writeSurfaces",
  "mutation surface",
  "mutationSurface",
  "mutationSurfaces",
  "mayMutateProjectFiles",
  "mutation boundary",
];

const READ_ONLY_TERMS = [
  "explain",
  "review",
  "analyze",
  "inspect",
  "show",
  "tell",
  "plan",
  "compare",
  "평가",
  "분석",
  "검토",
  "계획",
  "알려",
  "설명",
  ...WEAK_WORK_TERMS,
];

const VERB_HINTS = [
  "inspect",
  "derive",
  "validate",
  "route",
  "forecast",
  "author",
  "compile",
  "review",
  "release",
  "handoff",
  "implementation",
  "debug",
  "계획",
  "구현",
  "검증",
  "분석",
  "연결",
  "정리",
];

function stableId(input: CreateUniversalOntologyEntryInput, createdAt: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      promptId: input.promptId,
      promptHash: input.promptHash,
      projectRoot: input.projectRoot,
      rawUserRequest: input.rawUserRequest,
      createdAt,
    }))
    .digest("hex")
    .slice(0, 16);
  return `universal-ontology-entry:${hash}`;
}

function excerpt(value: string, maxLength = 240): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function termMatches(text: string, term: string): boolean {
  const lowered = text.toLowerCase();
  const normalizedTerm = term.toLowerCase();
  if (/^[a-z][a-z0-9-]*$/i.test(term)) {
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`).test(lowered);
  }
  return lowered.includes(normalizedTerm);
}

function hasAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => termMatches(text, term));
}

function hasStrongMutationSignal(text: string): boolean {
  return hasAny(text, STRONG_MUTATION_TERMS) || hasAny(text, WRITABLE_SURFACE_MARKERS);
}

function classifyKind(text: string): UniversalRequestKind {
  const lowered = text.toLowerCase();
  if (/(^|[^a-z0-9])(release|ship|deploy|merge|pr)([^a-z0-9]|$)|배포|머지/.test(lowered)) return "release";
  if (/(debug|bug|error|fail|trace|원인|버그|오류|실패)/.test(lowered)) return "debugging";
  if (/(review|검토|평가)/.test(lowered)) return "review";
  if (/(plan|proposal|계획|제안)/.test(lowered)) return "planning";
  if (hasStrongMutationSignal(text)) return "implementation";
  if (/(write|author|draft|문서|작성|정리)/.test(lowered)) return "content-authoring";
  if (hasAny(lowered, READ_ONLY_TERMS)) return "analysis";
  return "question";
}

function candidateProjectIds(projectRoot: string, text: string): readonly string[] {
  const lowered = `${projectRoot}\n${text}`.toLowerCase();
  const ids: string[] = [];
  for (const id of ["palantir-mini", "palantir-math", "mathcrew", "hyperframes", "kosmos"]) {
    if (lowered.includes(id)) ids.push(id);
  }
  if (ids.length === 0) ids.push(projectRoot.split("/").filter(Boolean).at(-1) ?? "project");
  return [...new Set(ids)];
}

function tokens(text: string): string[] {
  return Array.from(new Set(
    text
      .split(/[^A-Za-z0-9가-힣._/*-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  ));
}

function surfaceHints(raw: string): string[] {
  return tokens(raw).filter((token) =>
    token.includes("/") ||
    token.includes("*") ||
    /\.(ts|tsx|js|jsx|json|md|yml|yaml|toml|html)$/.test(token)
  );
}

function capabilityHints(raw: string): string[] {
  const lowered = raw.toLowerCase();
  const hints = [
    "ontology",
    "skill",
    "impact",
    "known issue",
    "validation",
    "workbench",
    "lecture trace",
    "hyperframes",
    "sequencer",
    "presenter",
    "dtc",
  ].filter((term) => lowered.includes(term));
  return [...new Set(hints)];
}

function nounHints(raw: string): string[] {
  const rawTokens = tokens(raw);
  const selected = rawTokens.filter((token) => {
    if (VERB_HINTS.some((verb) => token.toLowerCase() === verb.toLowerCase())) return false;
    return /[A-Z]/.test(token) || token.includes("-") || token.includes("/") || token.length >= 5;
  });
  return [...new Set(selected)].slice(0, 24);
}

function verbHints(raw: string): string[] {
  const lowered = raw.toLowerCase();
  return VERB_HINTS.filter((verb) => lowered.includes(verb.toLowerCase()));
}

export function createUniversalOntologyEntry(
  input: CreateUniversalOntologyEntryInput,
): UniversalOntologyEntry {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const requestKind = classifyKind(input.rawUserRequest);
  const mutationExpected = hasStrongMutationSignal(input.rawUserRequest);
  const readOnlySignal = hasAny(input.rawUserRequest, READ_ONLY_TERMS);
  const learnerVisible = /(student|learner|teacher|lecture|lesson|수업|학생|교사|강의|학습)/i
    .test(input.rawUserRequest);
  const requiresDtc = mutationExpected;
  const canProceedReadOnly = !mutationExpected || readOnlySignal;

  return {
    entryId: stableId(input, createdAt),
    schemaVersion: UNIVERSAL_ONTOLOGY_ENTRY_SCHEMA_VERSION,
    createdAt,
    prompt: {
      promptId: input.promptId,
      promptHash: input.promptHash,
      sessionId: input.sessionId,
      runtime: input.runtime,
      excerpt: excerpt(input.rawUserRequest),
    },
    project: {
      projectRoot: input.projectRoot,
      candidateProjectIds: candidateProjectIds(input.projectRoot, input.rawUserRequest),
    },
    classification: {
      requestKind,
      mutationExpected,
      learnerVisible,
      requiresDtc,
      canProceedReadOnly,
    },
    ontologySeed: {
      nouns: nounHints(input.rawUserRequest),
      verbs: verbHints(input.rawUserRequest),
      surfaceHints: surfaceHints(input.rawUserRequest),
      capabilityHints: capabilityHints(input.rawUserRequest),
    },
    status: "captured",
  };
}
