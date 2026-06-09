// PR-D HOOK minimalism — checkHookCitations wiring strengthening.
// Proves the citation audit now asserts a cited hook is WIRED, not merely file-exists.
// This is the test that would have caught rule 25 citing the unwired
// session-start-cleanliness / session-start-dirty-classify hooks.

import { describe, expect, it } from "bun:test";
import { classifyHookCitation } from "../../../../bridge/handlers/pm-rule-audit/detect-stale-crossrefs";
import { checkHookCitations } from "../../../../bridge/handlers/pm-rule-audit/detect-stale-crossrefs";
import { HOOK_INSTANCES } from "#schemas/ontology/self";
import type { RuleAuditFinding } from "#schemas/ontology/primitives/rule";

describe("classifyHookCitation — wiring-aware citation audit", () => {
  const wiredHook = "session-start";
  const orphanHook = "prompt-fde-readiness-advisory"; // a real present-but-unwired hook
  const hooks = new Set([wiredHook, orphanHook]);
  const orphanIds = new Set([orphanHook]);

  it("hook present + wired → no finding (valid citation)", () => {
    expect(classifyHookCitation(10, "events-jsonl", wiredHook, hooks, orphanIds)).toBeNull();
  });

  it("hook absent → stale-hook-citation (advisory)", () => {
    const f = classifyHookCitation(99, "ghost-rule", "no-such-hook", hooks, orphanIds);
    expect(f?.kind).toBe("stale-hook-citation");
    expect(f?.severity).toBe("advisory");
  });

  it("hook present but UNWIRED → unwired-hook-citation (warn) — the governance-lie case", () => {
    const f = classifyHookCitation(25, "auto-merge-cleanup-default", orphanHook, hooks, orphanIds);
    expect(f?.kind).toBe("unwired-hook-citation");
    expect(f?.severity).toBe("warn");
    expect(f?.detail).toContain("UNWIRED");
  });

  it("would have caught a rule citing a removed/unwired hook (regression for rule 25)", () => {
    // Simulate the pre-PR state: rule 25 citing session-start-cleanliness, which was a
    // present-but-unwired orphan. file-exists-only audits passed it; the wiring check flags it.
    const fakeHooks = new Set(["session-start-cleanliness", "post-merge-cleanup"]);
    const fakeOrphans = new Set(["session-start-cleanliness"]);
    const f = classifyHookCitation(25, "auto-merge-cleanup-default", "session-start-cleanliness", fakeHooks, fakeOrphans);
    expect(f?.kind).toBe("unwired-hook-citation");
  });
});

describe("checkHookCitations — live registry is GREEN after PR-D removals", () => {
  it("real self-Ontology has exactly 2 orphan hooks (deferred OE-ceremony pair)", () => {
    const orphans = HOOK_INSTANCES.filter((h) => h.orphanInRegistry).map((h) => h.hookId).sort();
    expect(orphans).toEqual(["prompt-dtc-enforcement-gate", "prompt-fde-readiness-advisory"]);
  });

  it("no rule cites an unwired or missing hook (citation audit green)", () => {
    const findings: RuleAuditFinding[] = [];
    checkHookCitations(findings);
    const offenders = findings.filter(
      (f) => f.kind === "stale-hook-citation" || f.kind === "unwired-hook-citation",
    );
    expect(offenders).toEqual([]);
  });
});
