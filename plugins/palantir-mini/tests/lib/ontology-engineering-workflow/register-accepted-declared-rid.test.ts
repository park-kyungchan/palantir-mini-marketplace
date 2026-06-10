// palantir-mini — register-accepted: declaredRid preference (PR-F static half).
//
// PROVES the additive `declaredRid` plumbing on the register seam: when a
// candidate carries a SOURCE-authored `declaredRid`, registerAcceptedCandidates
// uses it verbatim (so an authored pm.self.ontology/* rid round-trips); when it is
// absent, the seam falls back to the freshly-minted projectPrimitiveRid(...). Zero
// behavior change for the absent case (the pre-existing minted-rid path).

import { test, expect, describe } from "bun:test";

import { registerAcceptedCandidates } from "../../../lib/ontology-engineering-workflow/register-accepted";
import { createUniversalOntologyEntry } from "../../../lib/ontology-entry/universal-entry";
import { createFDEOntologyEngineeringSessionFromEntry } from "../../../lib/fde-ontology-engineering/session-store";
import { projectPrimitiveRid } from "../../../lib/actions/project-primitive-rid";
import type { FDEOntologyEngineeringSession } from "../../../lib/fde-ontology-engineering/types";

const PROJECT_ROOT = "/tmp/pm-register-accepted-declared-rid-fixture";

function baseSession(): FDEOntologyEngineeringSession {
  return createFDEOntologyEngineeringSessionFromEntry({
    entry: createUniversalOntologyEntry({
      rawUserRequest: "declaredRid preference fixture",
      projectRoot: PROJECT_ROOT,
    }),
  });
}

describe("registerAcceptedCandidates — declaredRid preference", () => {
  test("prefers candidate.declaredRid over the minted rid when present", async () => {
    const declared = "ri.ontology.main.object-type.pm-self-authored-student";
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      objectCandidates: [
        {
          candidateId: "object:student",
          plainName: "Student",
          whyItMayMatter: "learner",
          evidenceRefs: ["ref:s-1"],
          declaredRid: declared,
        },
      ],
    };

    const result = await registerAcceptedCandidates({ session, projectRoot: PROJECT_ROOT });

    const minted = projectPrimitiveRid(PROJECT_ROOT, "object-type", "Student");
    expect(declared).not.toBe(minted); // the declared rid is genuinely different
    expect(result.registered.objectTypes).toContain(declared);
    expect(result.registered.objectTypes).not.toContain(minted);
  });

  test("falls back to projectPrimitiveRid when declaredRid is absent", async () => {
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      objectCandidates: [
        {
          candidateId: "object:lesson",
          plainName: "Lesson",
          whyItMayMatter: "unit",
          evidenceRefs: ["ref:l-1"],
        },
      ],
    };

    const result = await registerAcceptedCandidates({ session, projectRoot: PROJECT_ROOT });

    const minted = projectPrimitiveRid(PROJECT_ROOT, "object-type", "Lesson");
    expect(result.registered.objectTypes).toEqual([minted]);
  });

  test("alreadyRegistered against a declaredRid skips the duplicate", async () => {
    const declared = "ri.ontology.main.function.pm-self-authored-slope";
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      functionCandidates: [
        {
          candidateId: "function:slope",
          plainName: "Slope",
          logicIntent: "compute slope",
          deterministic: true,
          evidenceRefs: ["ref:f-1"],
          declaredRid: declared,
        },
      ],
    };

    const result = await registerAcceptedCandidates({
      session,
      projectRoot: PROJECT_ROOT,
      alreadyRegistered: new Set([declared]),
    });

    expect(result.registered.functions).toHaveLength(0);
    expect(result.edits).toHaveLength(0);
  });

  test("a link with declaredRid registers under the declared rid (endpoints still resolve)", async () => {
    const declaredLink = "ri.ontology.main.link-type.pm-self-authored-requires";
    const session: FDEOntologyEngineeringSession = {
      ...baseSession(),
      objectCandidates: [
        {
          candidateId: "object:student",
          plainName: "Student",
          whyItMayMatter: "learner",
          evidenceRefs: ["ref:s-1"],
        },
        {
          candidateId: "object:lesson",
          plainName: "Lesson",
          whyItMayMatter: "unit",
          evidenceRefs: ["ref:l-1"],
        },
      ],
      linkCandidates: [
        {
          candidateId: "link:requires",
          plainName: "requires",
          sourceObject: "Student",
          targetObject: "Lesson",
          businessMeaning: "requires",
          evidenceRefs: ["ref:e-1"],
          declaredRid: declaredLink,
        },
      ],
    };

    const result = await registerAcceptedCandidates({ session, projectRoot: PROJECT_ROOT });

    expect(result.skipped.links).toHaveLength(0);
    expect(result.registered.linkTypes).toContain(declaredLink);
    expect(result.registered.linkTypes).not.toContain(
      projectPrimitiveRid(PROJECT_ROOT, "link-type", "requires"),
    );
  });
});
