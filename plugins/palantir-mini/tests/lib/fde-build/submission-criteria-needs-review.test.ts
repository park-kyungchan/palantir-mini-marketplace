// palantir-mini sprint-138 Slice 3.B — submission-criteria-readiness tests
import { describe, test, expect } from "bun:test";
import { detectSubmissionCriteriaNeedsHumanReview } from "../../../lib/fde-build/submission-criteria-readiness";

// =============================================================================
// Tests
// =============================================================================

describe("detectSubmissionCriteriaNeedsHumanReview", () => {
  test("ObjectQueryResult criterion is flagged for human review", () => {
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: [
        { name: "writebackOnlyApprovedActions", type: "ObjectQueryResult" },
        { name: "groupCheck", type: "GroupMember" },
        { name: "stringCheck", type: "StringEquality" },
      ],
    });
    expect(result).toContain("writebackOnlyApprovedActions");
    expect(result).toContain("groupCheck");
    expect(result).not.toContain("stringCheck");
  });

  test("GroupMember criterion is flagged for human review", () => {
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: [
        { name: "groupCheck", type: "GroupMember" },
      ],
    });
    expect(result).toContain("groupCheck");
  });

  test("StringEquality criterion is NOT flagged", () => {
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: [{ name: "stringCheck", type: "StringEquality" }],
    });
    expect(result).not.toContain("stringCheck");
    expect(result).toHaveLength(0);
  });

  test("Range, ArraySize, StringLength, StringRegexMatch, OneOf, ObjectPropertyValue, Unevaluable are NOT flagged", () => {
    const nonDeferredCriteria = [
      { name: "rangeCheck", type: "Range" },
      { name: "arraySizeCheck", type: "ArraySize" },
      { name: "stringLengthCheck", type: "StringLength" },
      { name: "regexCheck", type: "StringRegexMatch" },
      { name: "oneOfCheck", type: "OneOf" },
      { name: "propValueCheck", type: "ObjectPropertyValue" },
      { name: "unevalCheck", type: "Unevaluable" },
    ];
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: nonDeferredCriteria,
    });
    expect(result).toHaveLength(0);
  });

  test("empty criteria list returns empty array", () => {
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: [],
    });
    expect(result).toHaveLength(0);
  });

  test("mixed deferred and non-deferred returns only deferred names", () => {
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: [
        { name: "rangeCheck", type: "Range" },
        { name: "queryCheck", type: "ObjectQueryResult" },
        { name: "memberCheck", type: "GroupMember" },
        { name: "regexCheck", type: "StringRegexMatch" },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result).toContain("queryCheck");
    expect(result).toContain("memberCheck");
  });

  test("returns criterion NAME not criterion TYPE", () => {
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: [
        { name: "mySpecialQuery", type: "ObjectQueryResult" },
      ],
    });
    expect(result).toContain("mySpecialQuery");
    expect(result).not.toContain("ObjectQueryResult");
  });

  test("multiple ObjectQueryResult criteria are all flagged", () => {
    const result = detectSubmissionCriteriaNeedsHumanReview({
      criteriaInUse: [
        { name: "query1", type: "ObjectQueryResult" },
        { name: "query2", type: "ObjectQueryResult" },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result).toContain("query1");
    expect(result).toContain("query2");
  });
});
