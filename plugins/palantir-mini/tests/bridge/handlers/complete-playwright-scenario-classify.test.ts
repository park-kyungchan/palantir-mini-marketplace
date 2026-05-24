/**
 * palantir-mini v3.5.0 — classifyPlaywrightFailure pure-function tests (B2 split sibling)
 *
 * Pure-function failure classification taxonomy (7 classes). Extracted from
 * complete-playwright-scenario.test.ts to keep orchestrator under budget.
 */

import { test, expect, describe } from "bun:test";
import { classifyPlaywrightFailure } from "../../../bridge/handlers/complete-playwright-scenario";

describe("classifyPlaywrightFailure", () => {
  test("timeout patterns → timeout", () => {
    expect(classifyPlaywrightFailure("click step", "Timeout 30000ms exceeded")).toBe("timeout");
    expect(classifyPlaywrightFailure("waitFor", "exceeded 5000 ms")).toBe("timeout");
  });

  test("selector patterns → selector_not_found", () => {
    expect(classifyPlaywrightFailure("click", "selector did not match any element")).toBe(
      "selector_not_found",
    );
    expect(classifyPlaywrightFailure("locate button", "locator not found")).toBe(
      "selector_not_found",
    );
  });

  test("assertion patterns → assertion_failed", () => {
    expect(classifyPlaywrightFailure("verify", "expect(page).toHaveText failed")).toBe(
      "assertion_failed",
    );
    expect(classifyPlaywrightFailure("check", "expected 'foo' but received 'bar'")).toBe(
      "assertion_failed",
    );
  });

  test("navigation patterns → unexpected_navigation", () => {
    expect(classifyPlaywrightFailure("step5", "navigated away from expected URL")).toBe(
      "unexpected_navigation",
    );
    expect(classifyPlaywrightFailure("", "URL changed unexpectedly during interaction")).toBe(
      "unexpected_navigation",
    );
  });

  test("network errno → transient_network", () => {
    expect(classifyPlaywrightFailure("fetch", "net::ERR_CONNECTION_REFUSED")).toBe(
      "transient_network",
    );
    expect(classifyPlaywrightFailure("", "ECONNRESET on api call")).toBe("transient_network");
  });

  test("browser termination → browser_crash", () => {
    expect(classifyPlaywrightFailure("step3", "browser disconnected unexpectedly")).toBe(
      "browser_crash",
    );
    expect(classifyPlaywrightFailure("", "target closed")).toBe("browser_crash");
  });

  test("unknown / empty / unmatched → other", () => {
    expect(classifyPlaywrightFailure(undefined, undefined)).toBe("other");
    expect(classifyPlaywrightFailure("", "")).toBe("other");
    expect(classifyPlaywrightFailure("step", "some random error mode")).toBe("other");
  });
});
