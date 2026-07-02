// palantir-mini — check-semantic-loss tests (W2 elevation lossy-copy regression guard)
//
// Covers:
//   1. Live-repo green gate: checkSemanticLoss() → pass against the REAL
//      register-accepted.ts mapping functions.
//   2. Regression proof: evaluateSemanticLoss() → fail when handed a synthetic
//      LOSSY mapping-function set that drops a field (proves the check
//      actually catches regressions, not just that it always passes).
//   3. Release-mode wiring: pmPluginSelfCheck({ mode: "release" }) carries
//      semanticLossResult and lists "semantic-loss" in activeChecks.
//   4. semantic-loss mode narrowly gates only this axis.

import { test, expect, describe } from "bun:test";
import { pmPluginSelfCheck } from "../../../../bridge/handlers/pm-plugin-self-check";
import {
  checkSemanticLoss,
  evaluateSemanticLoss,
  type SemanticLossMappingFunctions,
} from "../../../../bridge/handlers/pm-plugin-self-check/check-semantic-loss";
import {
  mapObjectTypeCandidateToDeclaration,
  mapLinkTypeCandidateToLinkEditFields,
  mapActionTypeCandidateToDeclaration,
  mapFunctionCandidateToDeclaration,
  mapRoleCandidateToDeclaration,
  chatbotContextLineagePayload,
} from "../../../../lib/ontology-engineering-workflow/register-accepted";

describe("checkSemanticLoss — live-repo green gate", () => {
  test("passes against the REAL register-accepted.ts mapping functions", () => {
    const result = checkSemanticLoss();
    expect(result.status).toBe("pass");
    expect(result.violations).toEqual([]);
    expect(result.total).toBeGreaterThan(0);
  });
});

describe("evaluateSemanticLoss — regression proof (synthetic LOSSY mapper goes RED)", () => {
  test("a lossy mapObjectTypeCandidateToDeclaration (drops whyItMayMatter) fails the check", () => {
    const lossyFns: SemanticLossMappingFunctions = {
      mapObjectTypeCandidateToDeclaration: (candidate) => ({
        // Regression: NO semantics field at all — mirrors the pre-W2 bug.
        plainName: candidate.plainName,
        evidenceRefs: candidate.evidenceRefs,
        candidateId: candidate.candidateId,
      }),
      mapLinkTypeCandidateToLinkEditFields,
      mapActionTypeCandidateToDeclaration,
      mapFunctionCandidateToDeclaration,
      mapRoleCandidateToDeclaration,
      chatbotContextLineagePayload,
    };
    const result = evaluateSemanticLoss(lossyFns);
    expect(result.status).toBe("fail");
    expect(result.violations.some((v) => v.startsWith("ObjectType.semantics.whyItMayMatter"))).toBe(true);
  });

  test("a lossy mapLinkTypeCandidateToLinkEditFields (drops businessMeaning) fails the check — THE CORE BUG regression path", () => {
    const lossyFns: SemanticLossMappingFunctions = {
      mapObjectTypeCandidateToDeclaration,
      mapLinkTypeCandidateToLinkEditFields: (candidate, ctx) => ({
        // Regression: businessMeaning silently dropped (the exact pre-W2 bug).
        semantics: { businessMeaning: "", evidenceRefs: candidate.evidenceRefs },
        status: "active" as const,
        provenance: { candidateId: candidate.candidateId, promotedAt: ctx.promotedAt, byWhom: ctx.byWhom },
      }),
      mapActionTypeCandidateToDeclaration,
      mapFunctionCandidateToDeclaration,
      mapRoleCandidateToDeclaration,
      chatbotContextLineagePayload,
    };
    const result = evaluateSemanticLoss(lossyFns);
    expect(result.status).toBe("fail");
    expect(result.violations.some((v) => v.startsWith("LinkType.semantics.businessMeaning"))).toBe(true);
  });

  test("a lossy mapFunctionCandidateToDeclaration (drops evaluatorKind) fails the check", () => {
    const lossyFns: SemanticLossMappingFunctions = {
      mapObjectTypeCandidateToDeclaration,
      mapLinkTypeCandidateToLinkEditFields,
      mapActionTypeCandidateToDeclaration,
      mapFunctionCandidateToDeclaration: (candidate, ctx) => ({
        plainName: candidate.plainName,
        semantics: { businessMeaning: candidate.logicIntent, evidenceRefs: candidate.evidenceRefs },
        status: "active" as const,
        provenance: { candidateId: candidate.candidateId, promotedAt: ctx.promotedAt, byWhom: ctx.byWhom },
        // evaluatorKind / invokingActorScopeRef intentionally omitted (regression).
      }),
      mapRoleCandidateToDeclaration,
      chatbotContextLineagePayload,
    };
    const result = evaluateSemanticLoss(lossyFns);
    expect(result.status).toBe("fail");
    expect(result.violations.some((v) => v.startsWith("Function.evaluatorKind"))).toBe(true);
  });
});

describe("pm_plugin_self_check — semantic-loss wiring", () => {
  test("release mode: carries semanticLossResult and lists 'semantic-loss' in activeChecks", async () => {
    const result = await pmPluginSelfCheck({ mode: "release" });
    expect(result.activeChecks).toContain("semantic-loss");
    expect(result.semanticLossResult).toBeDefined();
    expect(result.semanticLossResult.status).toBe("pass");
  });

  test("semantic-loss mode narrowly gates only this axis", async () => {
    const result = await pmPluginSelfCheck({ mode: "semantic-loss" });
    expect(result.activeChecks).toEqual(["semantic-loss"]);
    expect(result.mode).toBe("semantic-loss");
  });
});
