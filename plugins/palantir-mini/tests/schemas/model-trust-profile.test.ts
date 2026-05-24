import { describe, test, expect } from "bun:test";
import {
  MODEL_TRUST_PROFILE_SCHEMA_VERSION,
  DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE,
  type ModelTrustProfile,
} from "@palantirKC/claude-schemas/ontology/primitives/model-trust-profile";

describe("ModelTrustProfile invariants (PR-14)", () => {
  test("schemaVersion is v1", () => {
    expect(MODEL_TRUST_PROFILE_SCHEMA_VERSION).toBe("palantir-mini/model-trust-profile/v1");
  });

  test("default template has all 5 bypass flags false", () => {
    expect(DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE.mayBypassOntologyContextQuery).toBe(false);
    expect(DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE.mayBypassDtcForMutation).toBe(false);
    expect(DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE.mayBypassValidationForCommit).toBe(false);
    expect(DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE.mayBypassWorkflowTrace).toBe(false);
    expect(DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE.mayBypassProjectScopeBoundary).toBe(false);
  });

  test("default template mayReduceClarificationQuestions is operator-tunable (initially false)", () => {
    expect(DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE.mayReduceClarificationQuestions).toBe(false);
  });

  test("type-level: 5 bypass flags are typed as literal false", () => {
    // This test passes at compile time via the literal-false types in the interface.
    // Any attempt to construct a profile with a true bypass flag is a TS error.
    const profile: ModelTrustProfile = {
      ...DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE,
      modelId: "test-model",
    };
    expect(profile.mayBypassOntologyContextQuery).toBe(false);
  });

  test("operator can flip mayReduceClarificationQuestions to true", () => {
    const profile: ModelTrustProfile = {
      ...DEFAULT_MODEL_TRUST_PROFILE_TEMPLATE,
      modelId: "claude-opus-4-7",
      mayReduceClarificationQuestions: true,
    };
    expect(profile.mayReduceClarificationQuestions).toBe(true);
    // Bypasses remain false
    expect(profile.mayBypassDtcForMutation).toBe(false);
  });
});
