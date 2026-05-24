// palantir-mini v3.3.0 — pm-plugin-self-check rule-audit check (B.3)
// Extracted from pm-plugin-self-check.ts. Aggregates pmRuleAudit findings.

import pmRuleAudit from "../pm-rule-audit";
import type { PmPluginSelfCheckResult } from "./types";

export async function checkRuleAudit(): Promise<PmPluginSelfCheckResult["ruleAuditResult"]> {
  try {
    const result = await pmRuleAudit({ includeAdvisory: false });

    const driftFindings = result.findings.filter((f) =>
      f.kind === "drift:file-count" || f.kind === "drift:memory-counter"
    );
    const staleCrossRefFindings = result.findings.filter((f) => f.kind === "stale-crossref");
    const unclaimedHookCitationFindings = result.findings.filter((f) => f.kind === "stale-hook-citation");

    const blockingFindings = [
      ...driftFindings,
      ...staleCrossRefFindings,
      ...unclaimedHookCitationFindings,
    ].filter((f) => f.severity === "block");

    return {
      status: blockingFindings.length === 0 ? "pass" : "fail",
      driftLines: driftFindings.length,
      staleCrossRefs: staleCrossRefFindings.length,
      unclaimedHookCitations: unclaimedHookCitationFindings.length,
    };
  } catch {
    return {
      status: "fail",
      driftLines: -1,
      staleCrossRefs: -1,
      unclaimedHookCitations: -1,
    };
  }
}
