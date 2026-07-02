// palantir-mini — pm-plugin-self-check semantic-loss (elevation lossy-copy) check
//
// W2 (feat/cartography-and-model-policy): candidate→registered elevation used
// to be a LOSSY copy — business-meaning fields captured on a candidate
// (whyItMayMatter / businessMeaning / operationalIntent / evidenceRefs /
// evaluatorKind / invokingActorScopeRef) were dropped and never reached the
// registered ontology primitive. This axis is the REGRESSION GUARD for that
// fix: it imports the REAL, pure `mapXCandidateToDeclaration` functions from
// lib/ontology-engineering-workflow/register-accepted.ts, constructs synthetic
// candidates with EVERY semantic field populated, runs them through the real
// mapping functions, and asserts the resulting registered declaration/edit
// fields contain every expected value.
//
// DESIGN CHOICE — behavioral over static: this check calls the ACTUAL mapping
// functions the elevation pipeline uses at runtime (not a source-text grep for
// field names), so it stays robust across refactors of register-accepted.ts —
// as long as the exported mapping functions keep their documented contract
// (candidate in, declaration/edit-fields bag out), the check keeps working
// even if the internal implementation changes shape entirely. It goes RED
// only when a mapping function actually stops threading a field through — the
// real regression this axis exists to catch.
//
// STATIC FALLBACK (documented, narrowly scoped): the ChatbotContextCandidate
// lineage-only decision (no registration path — see register-accepted.ts file
// doc comment) is checked by asserting `chatbotContextLineagePayload()` (also
// a real exported function, not text-scraped) preserves every field, rather
// than trying to behaviorally prove "no registration path exists", which
// would require enumerating the absence of a function — an ill-posed
// behavioral assertion. This one part is a narrow structural check (the
// exported symbol name `chatbotContextLineagePayload` exists and is callable)
// rather than a fully behavioral round-trip through `registerAcceptedCandidates`,
// documented here rather than silently mixed into the rest of the axis.
//
// Authority:
//   - owner directive (W2 elevation-as-status-transition; mirrors the
//     check-agent-model-policy.ts structural pattern per this task's spec)
//   - lib/ontology-engineering-workflow/register-accepted.ts (the real mapping
//     functions this axis imports and exercises)

import {
  mapObjectTypeCandidateToDeclaration,
  mapLinkTypeCandidateToLinkEditFields,
  mapActionTypeCandidateToDeclaration,
  mapFunctionCandidateToDeclaration,
  mapRoleCandidateToDeclaration,
  chatbotContextLineagePayload,
  type ElevationProvenanceContext,
} from "../../../lib/ontology-engineering-workflow/register-accepted";
import type {
  ObjectTypeCandidate,
  LinkTypeCandidate,
  ActionTypeCandidate,
  FunctionCandidate,
  RoleCandidate,
  ChatbotContextCandidate,
} from "../../../lib/fde-ontology-engineering/types";

export interface SemanticLossCheckResult {
  status: "pass" | "fail";
  details: string;
  total: number;
  compliant: string[];
  violations: string[];
}

const FIXED_CTX: ElevationProvenanceContext = {
  sicRef: "sic:pm-plugin-self-check-fixture",
  byWhom: "test-agent",
  promotedAt: "2026-01-01T00:00:00.000Z",
};

/** Synthetic candidates carrying EVERY semantic-bearing field populated. */
const SYNTHETIC_OBJECT: ObjectTypeCandidate = {
  candidateId: "object:semantic-loss-fixture",
  plainName: "SemanticLossFixtureObject",
  whyItMayMatter: "fixture-why-it-may-matter",
  evidenceRefs: ["fixture://evidence/object"],
};

const SYNTHETIC_LINK: LinkTypeCandidate = {
  candidateId: "link:semantic-loss-fixture",
  plainName: "semanticLossFixtureLink",
  sourceObject: "SemanticLossFixtureObject",
  targetObject: "SemanticLossFixtureObject",
  businessMeaning: "fixture-business-meaning",
  evidenceRefs: ["fixture://evidence/link"],
};

const SYNTHETIC_ACTION: ActionTypeCandidate = {
  candidateId: "action:semantic-loss-fixture",
  plainName: "semanticLossFixtureAction",
  operationalIntent: "fixture-operational-intent",
  writebackRisk: "low",
  evidenceRefs: ["fixture://evidence/action"],
};

const SYNTHETIC_FUNCTION: FunctionCandidate = {
  candidateId: "function:semantic-loss-fixture",
  plainName: "semanticLossFixtureFunction",
  logicIntent: "fixture-logic-intent",
  evaluatorKind: "routes-through-apply-action",
  invokingActorScopeRef: "role:semantic-loss-fixture",
  evidenceRefs: ["fixture://evidence/function"],
};

const SYNTHETIC_ROLE: RoleCandidate = {
  candidateId: "role:semantic-loss-fixture",
  plainName: "SemanticLossFixtureRole",
  whyItMayMatter: "fixture-role-why-it-may-matter",
  evidenceRefs: ["fixture://evidence/role"],
};

const SYNTHETIC_CHATBOT: ChatbotContextCandidate = {
  candidateId: "chatbot:semantic-loss-fixture",
  plainName: "SemanticLossFixtureChatbotContext",
  applicationStateNeed: "fixture-application-state-need",
  retrievalContextNeed: "fixture-retrieval-context-need",
  evidenceRefs: ["fixture://evidence/chatbot"],
};

/**
 * Runs every real mapping function against synthetic fully-populated
 * candidates and asserts the expected semantic fields survived. Exported
 * (not just called internally) so a test can inject an alternate set of
 * mapping functions (e.g. a synthetic LOSSY mapper) to prove the check goes
 * RED on a real regression — see
 * tests/bridge/handlers/pm-plugin-self-check/check-semantic-loss.test.ts.
 */
export interface SemanticLossMappingFunctions {
  mapObjectTypeCandidateToDeclaration: typeof mapObjectTypeCandidateToDeclaration;
  mapLinkTypeCandidateToLinkEditFields: typeof mapLinkTypeCandidateToLinkEditFields;
  mapActionTypeCandidateToDeclaration: typeof mapActionTypeCandidateToDeclaration;
  mapFunctionCandidateToDeclaration: typeof mapFunctionCandidateToDeclaration;
  mapRoleCandidateToDeclaration: typeof mapRoleCandidateToDeclaration;
  chatbotContextLineagePayload: typeof chatbotContextLineagePayload;
}

const REAL_MAPPING_FUNCTIONS: SemanticLossMappingFunctions = {
  mapObjectTypeCandidateToDeclaration,
  mapLinkTypeCandidateToLinkEditFields,
  mapActionTypeCandidateToDeclaration,
  mapFunctionCandidateToDeclaration,
  mapRoleCandidateToDeclaration,
  chatbotContextLineagePayload,
};

/** Asserts a `Record<string, unknown>` deep-contains an expected sub-shape (helper, not a library dep). */
function containsField(bag: Record<string, unknown>, path: readonly string[], expected: unknown): boolean {
  let cursor: unknown = bag;
  for (const segment of path) {
    if (typeof cursor !== "object" || cursor === null) return false;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  if (Array.isArray(expected)) {
    return Array.isArray(cursor) && JSON.stringify(cursor) === JSON.stringify(expected);
  }
  return cursor === expected;
}

export function evaluateSemanticLoss(
  fns: SemanticLossMappingFunctions = REAL_MAPPING_FUNCTIONS,
): SemanticLossCheckResult {
  const compliant: string[] = [];
  const violations: string[] = [];

  // ── ObjectType: whyItMayMatter -> semantics.whyItMayMatter; evidenceRefs -> semantics.evidenceRefs.
  {
    const decl = fns.mapObjectTypeCandidateToDeclaration(SYNTHETIC_OBJECT, FIXED_CTX);
    const checks: Array<[string, boolean]> = [
      ["semantics.whyItMayMatter", containsField(decl, ["semantics", "whyItMayMatter"], SYNTHETIC_OBJECT.whyItMayMatter)],
      ["semantics.evidenceRefs", containsField(decl, ["semantics", "evidenceRefs"], SYNTHETIC_OBJECT.evidenceRefs)],
      ["status", containsField(decl, ["status"], "active")],
      ["provenance.candidateId", containsField(decl, ["provenance", "candidateId"], SYNTHETIC_OBJECT.candidateId)],
      ["provenance.sicRef", containsField(decl, ["provenance", "sicRef"], FIXED_CTX.sicRef)],
      ["provenance.byWhom", containsField(decl, ["provenance", "byWhom"], FIXED_CTX.byWhom)],
      ["provenance.promotedAt", containsField(decl, ["provenance", "promotedAt"], FIXED_CTX.promotedAt)],
    ];
    for (const [label, ok] of checks) {
      const key = `ObjectType.${label}`;
      if (ok) compliant.push(key); else violations.push(`${key}: expected field not found on mapObjectTypeCandidateToDeclaration() output`);
    }
  }

  // ── LinkType: businessMeaning -> semantics.businessMeaning (THE CORE BUG). ──
  {
    const fields = fns.mapLinkTypeCandidateToLinkEditFields(SYNTHETIC_LINK, FIXED_CTX);
    const checks: Array<[string, boolean]> = [
      ["semantics.businessMeaning", fields.semantics.businessMeaning === SYNTHETIC_LINK.businessMeaning],
      ["semantics.evidenceRefs", JSON.stringify(fields.semantics.evidenceRefs) === JSON.stringify(SYNTHETIC_LINK.evidenceRefs)],
      ["status", fields.status === "active"],
      ["provenance.candidateId", fields.provenance.candidateId === SYNTHETIC_LINK.candidateId],
      ["provenance.sicRef", fields.provenance.sicRef === FIXED_CTX.sicRef],
    ];
    for (const [label, ok] of checks) {
      const key = `LinkType.${label}`;
      if (ok) compliant.push(key); else violations.push(`${key}: expected field not found on mapLinkTypeCandidateToLinkEditFields() output — THE CORE BUG this axis exists to catch`);
    }
  }

  // ── ActionType: operationalIntent -> semantics.businessMeaning. ─────────────
  {
    const decl = fns.mapActionTypeCandidateToDeclaration(SYNTHETIC_ACTION, FIXED_CTX);
    const checks: Array<[string, boolean]> = [
      ["semantics.businessMeaning", containsField(decl, ["semantics", "businessMeaning"], SYNTHETIC_ACTION.operationalIntent)],
      ["semantics.evidenceRefs", containsField(decl, ["semantics", "evidenceRefs"], SYNTHETIC_ACTION.evidenceRefs)],
      ["status", containsField(decl, ["status"], "active")],
      ["provenance.candidateId", containsField(decl, ["provenance", "candidateId"], SYNTHETIC_ACTION.candidateId)],
    ];
    for (const [label, ok] of checks) {
      const key = `ActionType.${label}`;
      if (ok) compliant.push(key); else violations.push(`${key}: expected field not found on mapActionTypeCandidateToDeclaration() output`);
    }
  }

  // ── Function: logicIntent -> semantics.businessMeaning; evaluatorKind + invokingActorScopeRef preserved dedicated. ──
  {
    const decl = fns.mapFunctionCandidateToDeclaration(SYNTHETIC_FUNCTION, FIXED_CTX);
    const checks: Array<[string, boolean]> = [
      ["semantics.businessMeaning", containsField(decl, ["semantics", "businessMeaning"], SYNTHETIC_FUNCTION.logicIntent)],
      ["semantics.evidenceRefs", containsField(decl, ["semantics", "evidenceRefs"], SYNTHETIC_FUNCTION.evidenceRefs)],
      ["evaluatorKind", containsField(decl, ["evaluatorKind"], SYNTHETIC_FUNCTION.evaluatorKind)],
      ["invokingActorScopeRef", containsField(decl, ["invokingActorScopeRef"], SYNTHETIC_FUNCTION.invokingActorScopeRef)],
      ["status", containsField(decl, ["status"], "active")],
      ["provenance.candidateId", containsField(decl, ["provenance", "candidateId"], SYNTHETIC_FUNCTION.candidateId)],
    ];
    for (const [label, ok] of checks) {
      const key = `Function.${label}`;
      if (ok) compliant.push(key); else violations.push(`${key}: expected field not found on mapFunctionCandidateToDeclaration() output`);
    }
  }

  // ── Role: whyItMayMatter -> semantics.whyItMayMatter. ───────────────────────
  {
    const decl = fns.mapRoleCandidateToDeclaration(SYNTHETIC_ROLE, FIXED_CTX);
    const checks: Array<[string, boolean]> = [
      ["semantics.whyItMayMatter", containsField(decl, ["semantics", "whyItMayMatter"], SYNTHETIC_ROLE.whyItMayMatter)],
      ["semantics.evidenceRefs", containsField(decl, ["semantics", "evidenceRefs"], SYNTHETIC_ROLE.evidenceRefs)],
      ["status", containsField(decl, ["status"], "active")],
      ["provenance.candidateId", containsField(decl, ["provenance", "candidateId"], SYNTHETIC_ROLE.candidateId)],
    ];
    for (const [label, ok] of checks) {
      const key = `Role.${label}`;
      if (ok) compliant.push(key); else violations.push(`${key}: expected field not found on mapRoleCandidateToDeclaration() output`);
    }
  }

  // ── ChatbotContext: lineage-only capture (STATIC/structural fallback — see file doc comment). ──
  {
    const lineage = fns.chatbotContextLineagePayload(SYNTHETIC_CHATBOT);
    const checks: Array<[string, boolean]> = [
      ["candidateId", lineage.candidateId === SYNTHETIC_CHATBOT.candidateId],
      ["plainName", lineage.plainName === SYNTHETIC_CHATBOT.plainName],
      ["applicationStateNeed", lineage.applicationStateNeed === SYNTHETIC_CHATBOT.applicationStateNeed],
      ["retrievalContextNeed", lineage.retrievalContextNeed === SYNTHETIC_CHATBOT.retrievalContextNeed],
      ["evidenceRefs", JSON.stringify(lineage.evidenceRefs) === JSON.stringify(SYNTHETIC_CHATBOT.evidenceRefs)],
    ];
    for (const [label, ok] of checks) {
      const key = `ChatbotContext.${label}`;
      if (ok) compliant.push(key); else violations.push(`${key}: expected field not found on chatbotContextLineagePayload() output (lineage-only capture, no registration path — deliberate scope decision)`);
    }
  }

  const total = compliant.length + violations.length;
  const isPass = violations.length === 0;
  return {
    status: isPass ? "pass" : "fail",
    details: isPass
      ? `all ${total} semantic-field-preservation checks pass across ObjectType/LinkType/ActionType/Function/Role/ChatbotContext elevation mapping`
      : `${violations.length}/${total} semantic-field-preservation checks FAILED (candidate->registered elevation is dropping fields): ` +
        violations.join("; "),
    total,
    compliant,
    violations,
  };
}

export function checkSemanticLoss(): SemanticLossCheckResult {
  try {
    return evaluateSemanticLoss();
  } catch (err) {
    return {
      status: "fail",
      details: `semantic-loss check error: ${err instanceof Error ? err.message : String(err)}`,
      total: 0,
      compliant: [],
      violations: [],
    };
  }
}
