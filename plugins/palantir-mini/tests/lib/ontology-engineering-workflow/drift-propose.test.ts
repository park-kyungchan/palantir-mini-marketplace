// palantir-mini v7.21.0 — drift-propose tests (Pillar C #2, gated scaffold).
//
// PROVES the detect→propose seam end-to-end WITHOUT crossing the no-auto-apply line:
//   (i)   per-file-sha report → composes a valid GlobalBranchingProposal
//         (isGlobalBranchingProposal === true), affectedResources rid matches,
//         validationSummary.notes carries noiseWarning verbatim.
//   (ii)  raw-sha report → ZERO proposals (gated out) + gateNote.
//   (iii) role / property stale entries → returned in skipped[] (enum gap), never dropped.
//   (iv)  the module is pure/read-only: it imports no fs/git/elevate/commit path.

import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";

import { driftPropose } from "../../../lib/ontology-engineering-workflow/drift-propose";
import { isGlobalBranchingProposal } from "#schemas/ontology/primitives/global-branching-proposal";
import type {
  OntologyStalenessReport,
  StalePrimitive,
} from "../../../lib/event-log/ontology-staleness";

function stale(rid: string, kind: StalePrimitive["kind"]): StalePrimitive {
  return {
    rid,
    kind,
    atopWhich: "atop-sha-1",
    backingSourceRef: "src/backing.ts",
    comparedAgainst: "per-file-sha",
  };
}

function report(
  comparator: "raw-sha" | "per-file-sha",
  staleEntries: StalePrimitive[],
): OntologyStalenessReport {
  return {
    project: "/tmp/pm-drift-propose-fixture",
    comparedAgainst: comparator === "per-file-sha" ? null : "head-sha",
    inspectedCount: staleEntries.length,
    stale: staleEntries,
    indeterminate: [],
    comparator,
    ...(staleEntries.length > 0 ? { noiseWarning: "PER-FILE-NOISE-WARNING-SENTINEL" } : {}),
  };
}

const NOW = "2026-06-16T00:00:00.000Z";

describe("driftPropose — Pillar C propose-step scaffold", () => {
  test("(i) per-file-sha report with a covered stale object → one valid GlobalBranchingProposal", () => {
    const r = report("per-file-sha", [stale("ri.ontology.main.object-type.foo", "objectType")]);
    const result = driftPropose(r, NOW);

    expect(result.proposals.length).toBe(1);
    const proposal = result.proposals[0]!;

    // Composed object satisfies the snapshot type guard.
    expect(isGlobalBranchingProposal(proposal)).toBe(true);

    // affectedResources rid matches the stale primitive; kind mapped to the enum value.
    expect(proposal.baseProposal.affectedResources).toEqual([
      { kind: "object-type", rid: "ri.ontology.main.object-type.foo" },
    ]);

    // noiseWarning threaded VERBATIM into validationSummary.notes.
    expect(proposal.baseProposal.validationSummary?.notes).toContain("PER-FILE-NOISE-WARNING-SENTINEL");

    // Single-reviewer policy, in-review, no apps.
    expect(proposal.approvalPolicy.requiredApprovals).toBe(1);
    expect(proposal.approvalPolicy.allowSelfApprove).toBe(false);
    expect(proposal.lifecycleState).toBe("in-review");
    expect(proposal.applicationsAffected).toEqual([]);
    expect(proposal.resourceCheckResults).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  test("(i-b) all four covered kinds map correctly", () => {
    const r = report("per-file-sha", [
      stale("rid-obj", "objectType"),
      stale("rid-link", "linkType"),
      stale("rid-act", "actionType"),
      stale("rid-fn", "function"),
    ]);
    const result = driftPropose(r, NOW);
    expect(result.proposals.length).toBe(4);
    const kinds = result.proposals.map((p) => p.baseProposal.affectedResources[0]!.kind).sort();
    expect(kinds).toEqual(["action-type", "aip-logic-function", "link-type", "object-type"]);
    result.proposals.forEach((p) => expect(isGlobalBranchingProposal(p)).toBe(true));
  });

  test("(ii) raw-sha report → zero proposals (gated out) with a gateNote", () => {
    const r = report("raw-sha", [stale("ri.ontology.main.object-type.foo", "objectType")]);
    const result = driftPropose(r, NOW);
    expect(result.proposals.length).toBe(0);
    expect(result.gateNote).toContain("raw-sha");
    expect(result.gateNote).toContain("per-file-sha");
  });

  test("(iii) role / property stale entries → returned in skipped[], never dropped", () => {
    const r = report("per-file-sha", [
      stale("ri.ontology.main.object-type.foo", "objectType"),
      stale("rid-role", "role"),
      stale("rid-prop", "property"),
    ]);
    const result = driftPropose(r, NOW);

    // Only the covered object becomes a proposal.
    expect(result.proposals.length).toBe(1);

    // role + property are explicitly skipped with the enum-gap reason.
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { rid: "rid-role", kind: "role", reason: "OntologyResourceKind enum gap, rule-08 follow-up" },
        { rid: "rid-prop", kind: "property", reason: "OntologyResourceKind enum gap, rule-08 follow-up" },
      ]),
    );
    expect(result.skipped.length).toBe(2);
  });

  test("(iii-b) role/property are reported in skipped[] even when gated (raw-sha)", () => {
    const r = report("raw-sha", [stale("rid-role", "role")]);
    const result = driftPropose(r, NOW);
    expect(result.proposals.length).toBe(0);
    expect(result.skipped.length).toBe(1);
    expect(result.skipped[0]!.kind).toBe("role");
  });

  test("(iv) the module is pure/read-only — imports no fs/git/elevate/commit path", () => {
    const src = fs.readFileSync(
      path.join(import.meta.dir, "../../../lib/ontology-engineering-workflow/drift-propose.ts"),
      "utf8",
    );
    // No filesystem / child-process / git / mutation IMPORTS (assert on import lines only,
    // so the JSDoc prose naming these forbidden paths does not false-positive).
    const importLines = src.split("\n").filter((l) => /^\s*import\b/.test(l));
    const imports = importLines.join("\n");
    expect(imports).not.toMatch(/["'](node:)?fs["']/);
    expect(imports).not.toMatch(/child_process|execFile|spawn/);
    // Never IMPORTS the register / commit / elevate path.
    expect(imports).not.toMatch(/elevate|register-accepted|commit/);
  });
});
