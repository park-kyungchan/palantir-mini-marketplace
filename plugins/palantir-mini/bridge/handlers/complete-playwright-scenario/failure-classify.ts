// palantir-mini v3.4.0 — complete-playwright-scenario sibling: failure classification
// + outcome shape validation + canonicalization.

import type { PlaywrightFailureClass } from "../../../lib/event-log/types";
import type { PlaywrightOutcome } from "./types";

const FAILURE_PATTERNS: Array<{ class: PlaywrightFailureClass; matchers: RegExp[] }> = [
  {
    class: "timeout",
    matchers: [/timeout/i, /exceeded.*\d+\s*ms/i, /timed out/i],
  },
  {
    class: "selector_not_found",
    matchers: [/selector.*(not.found|did not match|no element)/i, /locator.*not.found/i, /element.*not.visible/i],
  },
  {
    class: "assertion_failed",
    matchers: [/expect.*to(BeVisible|HaveText|HaveCount|EqualText)/i, /assertion.*fail/i, /expected.*but.*received/i],
  },
  {
    class: "unexpected_navigation",
    matchers: [/navigated.away/i, /unexpected.*navigation/i, /url.*changed.unexpectedly/i],
  },
  {
    class: "transient_network",
    matchers: [/net::ERR_/i, /ECONNRESET/i, /ECONNREFUSED/i, /network.*request.*failed/i],
  },
  {
    class: "browser_crash",
    matchers: [/browser.*(crash|disconnect|closed unexpectedly)/i, /target.*closed/i, /page.*has been closed/i],
  },
];

export function classifyPlaywrightFailure(failedStep?: string, failureMessage?: string): PlaywrightFailureClass {
  const haystack = `${failedStep ?? ""} ${failureMessage ?? ""}`.trim();
  if (haystack.length === 0) return "other";
  for (const entry of FAILURE_PATTERNS) {
    for (const matcher of entry.matchers) {
      if (matcher.test(haystack)) return entry.class;
    }
  }
  return "other";
}

export function isPlaywrightOutcomeShape(value: unknown): value is PlaywrightOutcome {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.passed !== "boolean") return false;
  // B-27 (harness-h4 canary): JSON-natural `null` for failedStep/failureMessage
  // represents "no failed step" and must be accepted alongside `undefined`.
  if (o.failedStep != null && typeof o.failedStep !== "string") return false;
  if (o.failureMessage != null && typeof o.failureMessage !== "string") return false;
  if (o.durationMs !== undefined && typeof o.durationMs !== "number") return false;
  if (o.retries !== undefined && typeof o.retries !== "number") return false;
  if (o.stepResults !== undefined && !Array.isArray(o.stepResults)) return false;
  return true;
}

/**
 * Fills in missing optional fields, classifies failureClass if absent, and
 * coerces numeric fields to non-negative integers where applicable.
 */
export function canonicalize(raw: PlaywrightOutcome): PlaywrightOutcome {
  const canon: PlaywrightOutcome = { passed: raw.passed };
  if (raw.failedStep)        canon.failedStep        = raw.failedStep;
  if (raw.failureMessage)    canon.failureMessage    = raw.failureMessage;
  if (raw.stepResults)       canon.stepResults       = raw.stepResults;
  if (raw.evidenceArtifacts) canon.evidenceArtifacts = raw.evidenceArtifacts;
  if (typeof raw.durationMs === "number" && raw.durationMs >= 0) {
    canon.durationMs = Math.round(raw.durationMs);
  }
  if (typeof raw.retries === "number" && raw.retries >= 0) {
    canon.retries = Math.max(0, Math.floor(raw.retries));
  }
  if (!raw.passed) {
    canon.failureClass = raw.failureClass ?? classifyPlaywrightFailure(raw.failedStep, raw.failureMessage);
  } else if (raw.failureClass) {
    canon.failureClass = raw.failureClass;
  }
  return canon;
}
