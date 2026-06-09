// palantir-mini — Ontology-construction ANTI-PATTERN lints (Wave-4).
//
// A callable, PURE heuristic pass over the OE candidate set. Each lint is a
// pure helper over the candidate arrays; none throws. The pass runs all 8 lints
// and concatenates their findings in a stable order. Findings mirror the
// ContractValidationIssue severity style ("blocking" | "advisory"); the two
// load-bearing lints (Action Sprawl, The Misnomer) are "blocking", the other
// six are "advisory". Surfacing (not enforcement) is the slice default — the
// register seam attaches findings advisorily and never blocks the commit on them.

export interface ConstructionLintFinding {
  readonly patternId: string;
  readonly patternName: string;
  readonly severity: "blocking" | "advisory";
  readonly message: string;
  readonly candidateIds: string[];
}

/** Minimal structural shapes the lints read — kept loose (any[]) so the pass is
 *  defensive against missing/optional fields and never throws. */
interface ObjectLike {
  readonly candidateId?: unknown;
  readonly plainName?: unknown;
  readonly whyItMayMatter?: unknown;
}
interface LinkLike {
  readonly candidateId?: unknown;
  readonly plainName?: unknown;
  readonly sourceObject?: unknown;
  readonly targetObject?: unknown;
  readonly businessMeaning?: unknown;
}
interface ActionLike {
  readonly candidateId?: unknown;
  readonly plainName?: unknown;
  readonly operationalIntent?: unknown;
}
interface FunctionLike {
  readonly candidateId?: unknown;
  readonly plainName?: unknown;
  readonly logicIntent?: unknown;
}
interface RoleLike {
  readonly candidateId?: unknown;
  readonly plainName?: unknown;
}

export interface ConstructionLintInput {
  readonly objects?: readonly unknown[];
  readonly actions?: readonly unknown[];
  readonly functions?: readonly unknown[];
  readonly links?: readonly unknown[];
  readonly roles?: readonly unknown[];
}

// ---------------------------------------------------------------------------
// small, defensive accessors
// ---------------------------------------------------------------------------

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function candId(value: unknown, fallbackIndex: number): string {
  const id = str((value as { candidateId?: unknown } | undefined)?.candidateId).trim();
  return id.length > 0 ? id : `#${fallbackIndex}`;
}

function asArray<T>(value: readonly unknown[] | undefined): T[] {
  return Array.isArray(value) ? (value.slice() as T[]) : [];
}

/** lowercase + collapse internal whitespace + trim. */
function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** word tokens (lowercased, alnum + Korean) for Jaccard / first/last splits. */
function tokens(value: string): string[] {
  return norm(value)
    .split(/[^a-z0-9가-힣]+/i)
    .filter((token) => token.length > 0);
}

// ===========================================================================
// 1. System Silos (advisory)
//    Same object surfaced from multiple source systems. Strip trailing
//    source/runtime qualifiers; any normalized group of size >= 2 → 1 finding.
// ===========================================================================

function stripSourceQualifier(plainName: string): string {
  let name = plainName.trim();
  // trailing parenthetical "(...)"
  name = name.replace(/\s*\([^)]*\)\s*$/g, "");
  // leading/trailing "From X"
  name = name.replace(/\s+from\s+\S+.*$/i, "");
  name = name.replace(/^from\s+\S+\s+/i, "");
  // trailing " - X"
  name = name.replace(/\s*-\s*\S+.*$/g, "");
  // trailing _prod / _dev (and similar env suffixes)
  name = name.replace(/_(prod|dev|stage|staging|test|qa)\b.*$/i, "");
  return norm(name);
}

function lintSystemSilos(objects: ObjectLike[]): ConstructionLintFinding[] {
  const groups = new Map<string, string[]>();
  objects.forEach((obj, index) => {
    const plain = str(obj.plainName);
    if (plain.trim().length === 0) return;
    const key = stripSourceQualifier(plain);
    if (key.length === 0) return;
    const list = groups.get(key) ?? [];
    list.push(candId(obj, index));
    groups.set(key, list);
  });
  const findings: ConstructionLintFinding[] = [];
  for (const [key, ids] of groups) {
    if (ids.length >= 2) {
      findings.push({
        patternId: "system-silos",
        patternName: "System Silos",
        severity: "advisory",
        message:
          `${ids.length} object candidates normalize to "${key}" after stripping source/runtime qualifiers — ` +
          "these likely model ONE ObjectType fed by multiple source systems, not separate objects.",
        candidateIds: ids,
      });
    }
  }
  return findings;
}

// ===========================================================================
// 2. The Kitchen Sink (advisory)
//    Importing ETL/metadata columns as objects. plainName ends with _at, or
//    contains sequence/timestamp/etl/ingested/loaded.
// ===========================================================================

const KITCHEN_SINK_MARKERS = ["sequence", "timestamp", "etl", "ingested", "loaded"];

function isKitchenSinkName(plainName: string): boolean {
  const n = norm(plainName);
  if (n.length === 0) return false;
  if (/_at$/.test(n)) return true;
  return KITCHEN_SINK_MARKERS.some((marker) => n.includes(marker));
}

function lintKitchenSink(objects: ObjectLike[]): ConstructionLintFinding[] {
  const ids: string[] = [];
  objects.forEach((obj, index) => {
    if (isKitchenSinkName(str(obj.plainName))) ids.push(candId(obj, index));
  });
  if (ids.length === 0) return [];
  return [{
    patternId: "kitchen-sink",
    patternName: "The Kitchen Sink",
    severity: "advisory",
    message:
      `${ids.length} object candidate(s) look like ETL/ingestion-metadata columns (e.g. *_at, timestamp, etl, ingested). ` +
      "Would anyone search/filter by this? If not, it is plumbing, not an ObjectType.",
    candidateIds: ids,
  }];
}

// ===========================================================================
// 3. Department Silos (advisory)
//    >= 2 objects sharing the SAME trailing entity word but DIFFERENT leading
//    (team/dept-like) word. Split on whitespace; same last token, different first.
// ===========================================================================

function lintDepartmentSilos(objects: ObjectLike[]): ConstructionLintFinding[] {
  const byLastToken = new Map<string, Array<{ id: string; first: string }>>();
  objects.forEach((obj, index) => {
    const toks = tokens(str(obj.plainName));
    if (toks.length < 2) return;
    const last = toks[toks.length - 1] ?? "";
    const first = toks[0] ?? "";
    if (last.length === 0 || first.length === 0) return;
    const list = byLastToken.get(last) ?? [];
    list.push({ id: candId(obj, index), first });
    byLastToken.set(last, list);
  });
  const findings: ConstructionLintFinding[] = [];
  for (const [last, entries] of byLastToken) {
    const distinctFirst = new Set(entries.map((entry) => entry.first));
    if (entries.length >= 2 && distinctFirst.size >= 2) {
      findings.push({
        patternId: "department-silos",
        patternName: "Department Silos",
        severity: "advisory",
        message:
          `${entries.length} object candidates share the entity word "${last}" but carry different leading ` +
          `(team/dept-like) words [${[...distinctFirst].join(", ")}] — likely ONE ObjectType, not per-department copies.`,
        candidateIds: entries.map((entry) => entry.id),
      });
    }
  }
  return findings;
}

// ===========================================================================
// 4. The God Object (advisory)
//    An object that is an endpoint (source or target) of MORE THAN 8 links.
// ===========================================================================

function lintGodObject(
  objects: ObjectLike[],
  links: LinkLike[],
): ConstructionLintFinding[] {
  // Fan count keyed by normalized object name; map back to candidateId for the object.
  const idByName = new Map<string, string>();
  objects.forEach((obj, index) => {
    const key = norm(str(obj.plainName));
    if (key.length === 0) return;
    if (!idByName.has(key)) idByName.set(key, candId(obj, index));
  });
  const fan = new Map<string, number>();
  for (const link of links) {
    for (const endpoint of [link.sourceObject, link.targetObject]) {
      const key = norm(str(endpoint));
      if (key.length === 0) continue;
      fan.set(key, (fan.get(key) ?? 0) + 1);
    }
  }
  const findings: ConstructionLintFinding[] = [];
  for (const [key, count] of fan) {
    if (count > 8) {
      const id = idByName.get(key);
      findings.push({
        patternId: "god-object",
        patternName: "The God Object",
        severity: "advisory",
        message:
          `Object "${key}" is an endpoint of ${count} link candidates (> 8) — possible God Object; ` +
          "consider splitting it into smaller, focused ObjectTypes.",
        candidateIds: id ? [id] : [],
      });
    }
  }
  return findings;
}

// ===========================================================================
// 5. The Golden Hammer (advisory)
//    actionCandidate whose operationalIntent reads as a pure calculation →
//    "should be a Function". functionCandidate whose logicIntent is trivial
//    concat/format only → advisory. Cross-kind mismatch.
// ===========================================================================

const PURE_CALC_VERBS = ["calculate", "compute", "sum", "convert", "derive", "format", "concat"];
const TRIVIAL_FN_MARKERS = ["concat", "format"];

function lintGoldenHammer(
  actions: ActionLike[],
  functions: FunctionLike[],
): ConstructionLintFinding[] {
  const actionIds: string[] = [];
  actions.forEach((action, index) => {
    const intent = norm(str(action.operationalIntent));
    if (intent.length === 0) return;
    if (PURE_CALC_VERBS.some((verb) => intent.includes(verb))) {
      actionIds.push(candId(action, index));
    }
  });
  const fnIds: string[] = [];
  functions.forEach((fn, index) => {
    const intent = norm(str(fn.logicIntent));
    if (intent.length === 0) return;
    if (TRIVIAL_FN_MARKERS.some((marker) => intent.includes(marker))) {
      fnIds.push(candId(fn, index));
    }
  });
  const ids = [...actionIds, ...fnIds];
  if (ids.length === 0) return [];
  return [{
    patternId: "golden-hammer",
    patternName: "The Golden Hammer",
    severity: "advisory",
    message:
      "Pure-calculation logic is modeled with the wrong primitive: " +
      `${actionIds.length} ActionType candidate(s) describe a calculation (should be a Function — no writeback), ` +
      `${fnIds.length} Function candidate(s) are trivial concat/format. Pick the primitive that fits the logic.`,
    candidateIds: ids,
  }];
}

// ===========================================================================
// 6. Action Sprawl (BLOCKING)
//    (a) total actions > 10; (b) plainName matches /^set\b/i or "Set <Word>";
//    (c) >= 2 actions with near-duplicate operationalIntent (Jaccard >= 0.6).
// ===========================================================================

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const token of a) if (b.has(token)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function lintActionSprawl(actions: ActionLike[]): ConstructionLintFinding[] {
  const offending = new Set<string>();
  const reasons: string[] = [];

  // (a) too many actions overall
  if (actions.length > 10) {
    reasons.push(`${actions.length} action candidates (> 10)`);
    actions.forEach((action, index) => offending.add(candId(action, index)));
  }

  // (b) setter-shaped names
  actions.forEach((action, index) => {
    const name = str(action.plainName).trim();
    if (name.length === 0) return;
    if (/^set\b/i.test(name) || /^set\s+\w+/i.test(name)) {
      offending.add(candId(action, index));
      reasons.push(`setter-shaped action name "${name}"`);
    }
  });

  // (c) near-duplicate operationalIntent (Jaccard >= 0.6)
  const intents = actions.map((action, index) => ({
    id: candId(action, index),
    set: new Set(tokens(str(action.operationalIntent))),
  }));
  for (let i = 0; i < intents.length; i += 1) {
    for (let j = i + 1; j < intents.length; j += 1) {
      const a = intents[i];
      const b = intents[j];
      if (a === undefined || b === undefined) continue;
      if (a.set.size === 0 || b.set.size === 0) continue;
      if (jaccard(a.set, b.set) >= 0.6) {
        offending.add(a.id);
        offending.add(b.id);
        reasons.push(`near-duplicate operationalIntent (${a.id} ~ ${b.id})`);
      }
    }
  }

  if (offending.size === 0) return [];
  return [{
    patternId: "action-sprawl",
    patternName: "Action Sprawl",
    severity: "blocking",
    message:
      "Action Sprawl: " + reasons.join("; ") +
      ". Collapse setters/near-duplicates into intent-shaped ActionTypes (e.g. one approve action, not many set-field actions).",
    candidateIds: [...offending],
  }];
}

// ===========================================================================
// 7. The Time Machine (advisory)
//    plainName or whyItMayMatter mentions version/history/is current/snapshot/as-of.
// ===========================================================================

const TIME_MACHINE_MARKERS = [
  "version",
  "history",
  "is current",
  "is_current",
  "iscurrent",
  "snapshot",
  "as-of",
  "as of",
];

function isTimeMachineText(value: string): boolean {
  const n = norm(value);
  if (n.length === 0) return false;
  return TIME_MACHINE_MARKERS.some((marker) => n.includes(marker));
}

function lintTimeMachine(objects: ObjectLike[]): ConstructionLintFinding[] {
  const ids: string[] = [];
  objects.forEach((obj, index) => {
    if (isTimeMachineText(str(obj.plainName)) || isTimeMachineText(str(obj.whyItMayMatter))) {
      ids.push(candId(obj, index));
    }
  });
  if (ids.length === 0) return [];
  return [{
    patternId: "time-machine",
    patternName: "The Time Machine",
    severity: "advisory",
    message:
      `${ids.length} object candidate(s) encode versioning/history in a property (version/snapshot/as-of/is_current). ` +
      "Model history as linked, time-stamped objects (event/version objects), not a single mutable version property.",
    candidateIds: ids,
  }];
}

// ===========================================================================
// 8. The Misnomer (BLOCKING)
//    (a) generic/short object plainName; (b) vague link businessMeaning.
//    Korean generic + vague terms included (the first SOURCE uses Korean labels).
// ===========================================================================

const BANNED_OBJECT_NAMES = new Set(
  [
    "item",
    "value",
    "type",
    "data",
    "object",
    "thing",
    "entity",
    "record",
    "info",
    "값",
    "항목",
    "데이터",
    "객체",
    "정보",
    "자료",
    "타입",
  ].map((token) => token.toLowerCase()),
);

const VAGUE_LINK_MEANINGS = [
  "related to",
  "relates to",
  "has",
  "links to",
  "associated",
  "connected",
  "refers to",
  "관련",
  "연결",
];

function lintMisnomer(
  objects: ObjectLike[],
  links: LinkLike[],
): ConstructionLintFinding[] {
  const objectIds: string[] = [];
  objects.forEach((obj, index) => {
    const name = norm(str(obj.plainName));
    if (name.length === 0) return;
    if (BANNED_OBJECT_NAMES.has(name) || name.length <= 2) {
      objectIds.push(candId(obj, index));
    }
  });

  const linkIds: string[] = [];
  links.forEach((link, index) => {
    const meaning = norm(str(link.businessMeaning));
    if (meaning.length === 0) return;
    if (VAGUE_LINK_MEANINGS.some((vague) => meaning.includes(vague))) {
      linkIds.push(candId(link, index));
    }
  });

  const ids = [...objectIds, ...linkIds];
  if (ids.length === 0) return [];
  return [{
    patternId: "misnomer",
    patternName: "The Misnomer",
    severity: "blocking",
    message:
      "The Misnomer: " +
      `${objectIds.length} object candidate(s) use a generic/too-short name (Item/Value/Data/값/항목 …), ` +
      `${linkIds.length} link candidate(s) carry a vague businessMeaning ("related to"/"has"/"관련" …). ` +
      "Use the operational business term, not a placeholder.",
    candidateIds: ids,
  }];
}

// ===========================================================================
// aggregate pass
// ===========================================================================

/**
 * Run ALL 8 construction anti-pattern lints over the candidate arrays and
 * concatenate their findings in a stable order (lint 1 → 8). Pure + defensive:
 * missing/optional fields are tolerated and no lint throws.
 */
export function lintConstructionCandidates(
  candidates: ConstructionLintInput,
): ConstructionLintFinding[] {
  const objects = asArray<ObjectLike>(candidates.objects);
  const actions = asArray<ActionLike>(candidates.actions);
  const functions = asArray<FunctionLike>(candidates.functions);
  const links = asArray<LinkLike>(candidates.links);
  const _roles = asArray<RoleLike>(candidates.roles); // reserved; no role-only lint in this slice
  void _roles;

  return [
    ...lintSystemSilos(objects),
    ...lintKitchenSink(objects),
    ...lintDepartmentSilos(objects),
    ...lintGodObject(objects, links),
    ...lintGoldenHammer(actions, functions),
    ...lintActionSprawl(actions),
    ...lintTimeMachine(objects),
    ...lintMisnomer(objects, links),
  ];
}
