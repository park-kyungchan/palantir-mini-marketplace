import { describe, expect, test } from "bun:test";
import { normalizeTermValue, stableHash, stableJson } from "../../../lib/semantic-consistency/normalize";

describe("semantic-consistency normalize", () => {
  test("normalizes Unicode, whitespace, punctuation, and stable source namespace hash", () => {
    const left = normalizeTermValue("  Ｃustomer\u2019s   Account  ", {
      sourceSystemId: "crm",
      fieldPath: "Account.Name",
    });
    const right = normalizeTermValue("Customer's Account", {
      sourceSystemId: "crm",
      fieldPath: "Account.Name",
    });

    expect(left.normalized).toBe("customer's account");
    expect(left.slug).toBe("customer-s-account");
    expect(left.locale).toBe("en");
    expect(left.hash).toBe(right.hash);
    expect(left.normalizationVersion).toBe("semantic-normalize/v1");
  });

  test("keeps source-system namespace in hash", () => {
    const crm = normalizeTermValue("customer", { sourceSystemId: "crm", fieldPath: "Account.Name" });
    const billing = normalizeTermValue("customer", { sourceSystemId: "billing", fieldPath: "Invoice.Payer" });
    expect(crm.normalized).toBe(billing.normalized);
    expect(crm.hash).not.toBe(billing.hash);
  });

  test("detects mixed Korean and English locale", () => {
    const mixed = normalizeTermValue("고객 Customer");
    expect(mixed.normalized).toBe("고객 customer");
    expect(mixed.locale).toBe("mixed");
  });

  test("stableJson and stableHash are object insertion-order independent", () => {
    const left = { b: 2, a: { y: true, x: ["one", "two"] } };
    const right = { a: { x: ["one", "two"], y: true }, b: 2 };
    expect(stableJson(left)).toBe(stableJson(right));
    expect(stableHash(left)).toBe(stableHash(right));
  });
});
