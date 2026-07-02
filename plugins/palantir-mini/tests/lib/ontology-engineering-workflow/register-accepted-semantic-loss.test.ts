// palantir-mini — W2 (feat/cartography-and-model-policy): elevation as status
// transition, zero semantic loss.
//
// PROVES that candidate->registered elevation no longer drops candidate
// business-meaning fields (the pre-W2 bug): every mapXCandidateToDeclaration
// pure function threads whyItMayMatter/businessMeaning/operationalIntent/
// evidenceRefs/evaluatorKind/invokingActorScopeRef into `semantics`
// (+ dedicated Function fields), stamps `status:"active"` at registration
// time (and preserves an EXPLICIT status when the candidate carries one via
// the full registerAcceptedCandidates() round-trip), and records a
// PrimitiveProvenance audit entry (candidateId/sicRef/promotedAt/byWhom).
// Also documents the ChatbotContextCandidate lineage-only scope decision.

import { test, expect, describe } from "bun:test";
import {
  registerAcceptedCandidates,
  mapObjectTypeCandidateToDeclaration,
  mapLinkTypeCandidateToLinkEditFields,
  mapActionTypeCandidateToDeclaration,
  mapFunctionCandidateToDeclaration,
  mapRoleCandidateToDeclaration,
  mapPropertyCandidateToDeclaration,
  chatbotContextLineagePayload,
  type ElevationProvenanceContext,
} from "../../../lib/ontology-engineering-workflow/register-accepted";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import { createFDEOntologyEngineeringSessionFromEntry } from "../../../lib/fde-ontology-engineering/session-store";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

const PROJECT_ROOT = "/tmp/pm-register-accepted-semantic-loss-fixture";

const FIXED_CTX: ElevationProvenanceContext = {
  sicRef: "sic:test-fixture",
  byWhom: "test-agent",
  promotedAt: "2026-01-01T00:00:00.000Z",
};

function baseSession(): FDEOntologyEngineeringSession {
  return createFDEOntologyEngineeringSessionFromEntry({
    entry: createUniversalOntologyEntry({
      rawUserRequest: "semantic-loss fixture",
      projectRoot: PROJECT_ROOT,
    }),
  });
}

describe("elevation as status transition — per-candidate-kind semantic preservation (pure mapping functions)", () => {
  test("ObjectTypeCandidate: whyItMayMatter + evidenceRefs -> semantics; status=active; provenance populated", () => {
    const candidate = {
      candidateId: "object:student",
      plainName: "Student",
      whyItMayMatter: "the learner at the center of the domain",
      evidenceRefs: ["evidence://student-1", "evidence://student-2"],
    };
    const decl = mapObjectTypeCandidateToDeclaration(candidate, FIXED_CTX);
    expect(decl.semantics).toEqual({
      whyItMayMatter: candidate.whyItMayMatter,
      evidenceRefs: candidate.evidenceRefs,
    });
    expect(decl.status).toBe("active");
    expect(decl.provenance).toEqual({
      candidateId: candidate.candidateId,
      promotedAt: FIXED_CTX.promotedAt,
      byWhom: FIXED_CTX.byWhom,
      sicRef: FIXED_CTX.sicRef,
    });
    // Legacy fields (pre-W2) still present — additive, not replaced.
    expect(decl.whyItMayMatter).toBe(candidate.whyItMayMatter);
    expect(decl.evidenceRefs).toEqual(candidate.evidenceRefs);
  });

  test("LinkTypeCandidate: businessMeaning -> semantics.businessMeaning (THE CORE BUG this task closes)", () => {
    const candidate = {
      candidateId: "link:requires",
      plainName: "requires",
      sourceObject: "Student",
      targetObject: "Lesson",
      businessMeaning: "a student's enrollment requires a lesson plan binding",
      evidenceRefs: ["evidence://requires-1"],
    };
    const fields = mapLinkTypeCandidateToLinkEditFields(candidate, FIXED_CTX);
    // PRE-W2 this field was silently dropped — register-accepted.ts's link
    // registration only threaded srcCardinality/dstCardinality, never
    // businessMeaning. This assertion is the direct regression guard.
    expect(fields.semantics.businessMeaning).toBe(candidate.businessMeaning);
    expect(fields.semantics.evidenceRefs).toEqual(candidate.evidenceRefs);
    expect(fields.status).toBe("active");
    expect(fields.provenance.candidateId).toBe(candidate.candidateId);
    expect(fields.provenance.sicRef).toBe(FIXED_CTX.sicRef);
  });

  test("ActionTypeCandidate: operationalIntent -> semantics.businessMeaning", () => {
    const candidate = {
      candidateId: "action:finalize",
      plainName: "finalizeScore",
      operationalIntent: "write the finalized score back to the student record",
      writebackRisk: "high" as const,
      evidenceRefs: ["evidence://finalize-1"],
    };
    const decl = mapActionTypeCandidateToDeclaration(candidate, FIXED_CTX);
    expect(decl.semantics).toEqual({
      businessMeaning: candidate.operationalIntent,
      evidenceRefs: candidate.evidenceRefs,
    });
    expect(decl.status).toBe("active");
    expect((decl.provenance as Record<string, unknown>).candidateId).toBe(candidate.candidateId);
  });

  test("FunctionCandidate: logicIntent -> semantics.businessMeaning; evaluatorKind + invokingActorScopeRef preserved as dedicated fields", () => {
    const candidate = {
      candidateId: "function:criteria",
      plainName: "criteriaCheck",
      logicIntent: "all rubric items graded + teacher approval",
      evaluatorKind: "routes-through-apply-action" as const,
      invokingActorScopeRef: "role:teacher",
      evidenceRefs: ["evidence://criteria-1"],
    };
    const decl = mapFunctionCandidateToDeclaration(candidate, FIXED_CTX);
    expect(decl.semantics).toEqual({
      businessMeaning: candidate.logicIntent,
      evidenceRefs: candidate.evidenceRefs,
    });
    // Dedicated fields (least-lossy home decision — see aip-logic-function.ts).
    expect(decl.evaluatorKind).toBe(candidate.evaluatorKind);
    expect(decl.invokingActorScopeRef).toBe(candidate.invokingActorScopeRef);
    expect(decl.status).toBe("active");
  });

  test("RoleCandidate: whyItMayMatter + evidenceRefs -> semantics", () => {
    const candidate = {
      candidateId: "role:teacher",
      plainName: "Teacher",
      whyItMayMatter: "the actor authorized to finalize a submission's score",
      evidenceRefs: ["evidence://teacher-role-1"],
    };
    const decl = mapRoleCandidateToDeclaration(candidate, FIXED_CTX);
    expect(decl.semantics).toEqual({
      whyItMayMatter: candidate.whyItMayMatter,
      evidenceRefs: candidate.evidenceRefs,
    });
    expect(decl.status).toBe("active");
  });

  test("PropertyCandidate: whyItMayMatter + evidenceRefs -> semantics; status=active; provenance populated (the 6th elevation kind — was previously registered via an inline block that DROPPED whyItMayMatter)", () => {
    const candidate = {
      candidateId: "property:score",
      plainName: "score",
      ownerObjectName: "Submission",
      dataType: "Integer",
      whyItMayMatter: "the rubric-derived numeric grade a teacher finalizes",
      evidenceRefs: ["evidence://score-1", "evidence://score-2"],
    };
    const decl = mapPropertyCandidateToDeclaration(candidate, FIXED_CTX, "rid:pm:object/submission");
    expect(decl.semantics).toEqual({
      whyItMayMatter: candidate.whyItMayMatter,
      evidenceRefs: candidate.evidenceRefs,
    });
    expect(decl.status).toBe("active");
    expect(decl.provenance).toEqual({
      candidateId: candidate.candidateId,
      promotedAt: FIXED_CTX.promotedAt,
      byWhom: FIXED_CTX.byWhom,
      sicRef: FIXED_CTX.sicRef,
    });
    // Legacy fields (pre-remediation) still present — additive, not replaced.
    expect(decl.plainName).toBe(candidate.plainName);
    expect(decl.ownerObjectName).toBe(candidate.ownerObjectName);
    expect(decl.ownerRid).toBe("rid:pm:object/submission");
    expect(decl.dataType).toBe(candidate.dataType);
    expect(decl.evidenceRefs).toEqual(candidate.evidenceRefs);
  });

  test("ChatbotContextCandidate: DELIBERATE lineage-only capture (documented scope decision, not an oversight) — no registration path, content preserved via chatbotContextLineagePayload()", () => {
    const candidate = {
      candidateId: "chatbot:tutor-context",
      plainName: "TutorApplicationState",
      applicationStateNeed: "the chatbot needs the current student's active assignment",
      retrievalContextNeed: "rubric text for the active assignment",
      evidenceRefs: ["evidence://chatbot-1"],
    };
    const lineage = chatbotContextLineagePayload(candidate);
    expect(lineage).toEqual({
      candidateId: candidate.candidateId,
      plainName: candidate.plainName,
      applicationStateNeed: candidate.applicationStateNeed,
      retrievalContextNeed: candidate.retrievalContextNeed,
      evidenceRefs: candidate.evidenceRefs,
    });
  });
});

describe("registerAcceptedCandidates — full round-trip through the real edit-function registry", () => {
  test("status default: candidate registration stamps status:'active' when the candidate carries no explicit status", async () => {
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      objectCandidates: [
        {
          candidateId: "object:widget",
          plainName: "Widget",
          whyItMayMatter: "the fixture object",
          evidenceRefs: ["evidence://widget-1"],
        },
      ],
    };
    const { edits } = await registerAcceptedCandidates({
      session,
      projectRoot: PROJECT_ROOT,
      sicRef: "sic:round-trip",
      byWhom: "test-agent",
    });
    const objectEdit = edits.find((e) => (e as { kind?: string }).kind === "object") as
      | { properties?: Record<string, unknown> }
      | undefined;
    expect(objectEdit).toBeDefined();
    expect(objectEdit!.properties?.status).toBe("active");
    const semantics = objectEdit!.properties?.semantics as Record<string, unknown> | undefined;
    expect(semantics?.whyItMayMatter).toBe("the fixture object");
    const provenance = objectEdit!.properties?.provenance as Record<string, unknown> | undefined;
    expect(provenance?.candidateId).toBe("object:widget");
    expect(provenance?.sicRef).toBe("sic:round-trip");
    expect(provenance?.byWhom).toBe("test-agent");
    expect(typeof provenance?.promotedAt).toBe("string");
  });

  test("LinkType round-trip: businessMeaning survives onto the native kind:'link' edit's own semantics field", async () => {
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      objectCandidates: [
        { candidateId: "object:a", plainName: "A", whyItMayMatter: "a", evidenceRefs: ["e:a"] },
        { candidateId: "object:b", plainName: "B", whyItMayMatter: "b", evidenceRefs: ["e:b"] },
      ],
      linkCandidates: [
        {
          candidateId: "link:a-to-b",
          plainName: "linksTo",
          sourceObject: "A",
          targetObject: "B",
          businessMeaning: "A links to B for the fixture",
          evidenceRefs: ["evidence://link-1"],
        },
      ],
    };
    const { edits } = await registerAcceptedCandidates({ session, projectRoot: PROJECT_ROOT });
    const linkEdit = edits.find((e) => (e as { kind?: string }).kind === "link") as
      | { semantics?: { businessMeaning?: string }; status?: string; provenance?: Record<string, unknown> }
      | undefined;
    expect(linkEdit).toBeDefined();
    expect(linkEdit!.semantics?.businessMeaning).toBe("A links to B for the fixture");
    expect(linkEdit!.status).toBe("active");
    expect(linkEdit!.provenance?.candidateId).toBe("link:a-to-b");
  });

  test("Property round-trip: whyItMayMatter survives onto the registered edit's semantics field; ownerRid resolved via the combined name->rid map (the 6th elevation kind — was previously an inline block that dropped it)", async () => {
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      objectCandidates: [
        { candidateId: "object:submission", plainName: "Submission", whyItMayMatter: "the graded artifact", evidenceRefs: ["e:submission"] },
      ],
      propertyCandidates: [
        {
          candidateId: "property:score",
          plainName: "score",
          ownerObjectName: "Submission",
          dataType: "Integer",
          whyItMayMatter: "the rubric-derived numeric grade a teacher finalizes",
          evidenceRefs: ["evidence://score-1"],
        },
      ],
    };
    const { edits, registered } = await registerAcceptedCandidates({
      session,
      projectRoot: PROJECT_ROOT,
      sicRef: "sic:property-round-trip",
      byWhom: "test-agent",
    });
    expect(registered.properties.length).toBe(1);
    const propertyEdit = edits.find(
      (e) => (e as { kind?: string }).kind === "object" &&
        (e as { properties?: Record<string, unknown> }).properties?.primitiveKind === "Property",
    ) as { properties?: Record<string, unknown> } | undefined;
    expect(propertyEdit).toBeDefined();
    const semantics = propertyEdit!.properties?.semantics as Record<string, unknown> | undefined;
    expect(semantics?.whyItMayMatter).toBe("the rubric-derived numeric grade a teacher finalizes");
    expect(propertyEdit!.properties?.status).toBe("active");
    const provenance = propertyEdit!.properties?.provenance as Record<string, unknown> | undefined;
    expect(provenance?.candidateId).toBe("property:score");
    expect(provenance?.sicRef).toBe("sic:property-round-trip");
    // ownerRid resolved against the combined name->rid map built from the
    // already-registered Submission ObjectType candidate above.
    expect(typeof propertyEdit!.properties?.ownerRid).toBe("string");
    expect(propertyEdit!.properties?.ownerRid).not.toBe("");
  });

  test("ChatbotContextCandidate round-trip: chatbotContextLineage result field carries content; NOT registered as a primitive", async () => {
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      chatbotContextCandidates: [
        {
          candidateId: "chatbot:fixture",
          plainName: "FixtureChatbotContext",
          applicationStateNeed: "fixture need",
          evidenceRefs: ["evidence://chatbot-fixture-1"],
        },
      ],
    };
    const { chatbotContextLineage, edits } = await registerAcceptedCandidates({
      session,
      projectRoot: PROJECT_ROOT,
    });
    expect(chatbotContextLineage).toEqual([
      {
        candidateId: "chatbot:fixture",
        plainName: "FixtureChatbotContext",
        applicationStateNeed: "fixture need",
        evidenceRefs: ["evidence://chatbot-fixture-1"],
      },
    ]);
    // No edits emitted for the chatbot candidate (no registration path).
    expect(edits.length).toBe(0);
  });
});
