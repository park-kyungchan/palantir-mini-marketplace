// palantir-mini — construction anti-pattern lint pass (Wave-4) unit tests.
//
// For EACH of the 8 lints: one candidate set that TRIGGERS it (a finding with
// the right patternId + severity) and one CLEAN set (no finding of that
// pattern). Plus: the aggregate pass concats all, and severity discipline
// (Action Sprawl + Misnomer = "blocking"; the other six = "advisory").

import { test, expect, describe } from "bun:test";

import {
  lintConstructionCandidates,
  type ConstructionLintFinding,
} from "../../lib/construction-lint/lint-candidates";

function ids(findings: readonly ConstructionLintFinding[], patternId: string): string[] {
  return findings.filter((f) => f.patternId === patternId).flatMap((f) => f.candidateIds);
}
function find(findings: readonly ConstructionLintFinding[], patternId: string) {
  return findings.find((f) => f.patternId === patternId);
}

const obj = (candidateId: string, plainName: string, whyItMayMatter = "") => ({
  candidateId,
  plainName,
  whyItMayMatter,
  evidenceRefs: [],
});
const link = (
  candidateId: string,
  plainName: string,
  sourceObject: string,
  targetObject: string,
  businessMeaning: string,
) => ({ candidateId, plainName, sourceObject, targetObject, businessMeaning, evidenceRefs: [] });
const action = (candidateId: string, plainName: string, operationalIntent: string) => ({
  candidateId,
  plainName,
  operationalIntent,
  writebackRisk: "low" as const,
  evidenceRefs: [],
});
const fn = (candidateId: string, plainName: string, logicIntent: string) => ({
  candidateId,
  plainName,
  logicIntent,
  evidenceRefs: [],
});

describe("lint 1 — System Silos", () => {
  test("TRIGGER: same object from two source systems", () => {
    const f = lintConstructionCandidates({
      objects: [
        obj("o1", "Customer (Salesforce)"),
        obj("o2", "Customer - SAP"),
      ],
    });
    expect(find(f, "system-silos")?.severity).toBe("advisory");
    expect(ids(f, "system-silos").sort()).toEqual(["o1", "o2"]);
  });
  test("CLEAN: distinct objects", () => {
    const f = lintConstructionCandidates({ objects: [obj("o1", "Customer"), obj("o2", "Invoice")] });
    expect(find(f, "system-silos")).toBeUndefined();
  });
});

describe("lint 2 — The Kitchen Sink", () => {
  test("TRIGGER: ETL/metadata-shaped object", () => {
    const f = lintConstructionCandidates({
      objects: [obj("o1", "ingested_at"), obj("o2", "Row Sequence")],
    });
    expect(find(f, "kitchen-sink")?.severity).toBe("advisory");
    expect(ids(f, "kitchen-sink").sort()).toEqual(["o1", "o2"]);
  });
  test("CLEAN: real business object", () => {
    const f = lintConstructionCandidates({ objects: [obj("o1", "Customer")] });
    expect(find(f, "kitchen-sink")).toBeUndefined();
  });
});

describe("lint 3 — Department Silos", () => {
  test("TRIGGER: same entity word, different dept word", () => {
    const f = lintConstructionCandidates({
      objects: [obj("o1", "Sales Customer"), obj("o2", "Support Customer")],
    });
    expect(find(f, "department-silos")?.severity).toBe("advisory");
    expect(ids(f, "department-silos").sort()).toEqual(["o1", "o2"]);
  });
  test("CLEAN: same leading word does not trip", () => {
    const f = lintConstructionCandidates({
      objects: [obj("o1", "Sales Customer"), obj("o2", "Sales Region")],
    });
    expect(find(f, "department-silos")).toBeUndefined();
  });
});

describe("lint 4 — The God Object", () => {
  test("TRIGGER: object endpoint of > 8 links", () => {
    const links = Array.from({ length: 9 }, (_, i) =>
      link(`l${i}`, `Rel ${i}`, "Customer", `Other ${i}`, "a meaningful business relation"),
    );
    const f = lintConstructionCandidates({ objects: [obj("o1", "Customer")], links });
    expect(find(f, "god-object")?.severity).toBe("advisory");
    expect(ids(f, "god-object")).toEqual(["o1"]);
  });
  test("CLEAN: <= 8 links is fine", () => {
    const links = Array.from({ length: 5 }, (_, i) =>
      link(`l${i}`, `Rel ${i}`, "Customer", `Other ${i}`, "a meaningful business relation"),
    );
    const f = lintConstructionCandidates({ objects: [obj("o1", "Customer")], links });
    expect(find(f, "god-object")).toBeUndefined();
  });
});

describe("lint 5 — The Golden Hammer", () => {
  test("TRIGGER: action that is a pure calculation", () => {
    const f = lintConstructionCandidates({
      actions: [action("a1", "Compute Total", "calculate the order total from line items")],
    });
    expect(find(f, "golden-hammer")?.severity).toBe("advisory");
    expect(ids(f, "golden-hammer")).toContain("a1");
  });
  test("CLEAN: a real writeback action", () => {
    const f = lintConstructionCandidates({
      actions: [action("a1", "Approve Order", "approve the order and notify the customer")],
      functions: [fn("f1", "Risk Score", "score the order risk via a model")],
    });
    expect(find(f, "golden-hammer")).toBeUndefined();
  });
});

describe("lint 6 — Action Sprawl (BLOCKING)", () => {
  test("TRIGGER (b): setter-shaped action name", () => {
    const f = lintConstructionCandidates({
      actions: [action("a1", "Set Status", "set the status field")],
    });
    expect(find(f, "action-sprawl")?.severity).toBe("blocking");
    expect(ids(f, "action-sprawl")).toContain("a1");
  });
  test("TRIGGER (a): > 10 actions", () => {
    const actions = Array.from({ length: 11 }, (_, i) =>
      action(`a${i}`, `Do Thing ${i}`, `perform distinct operation number ${i} now`),
    );
    const f = lintConstructionCandidates({ actions });
    expect(find(f, "action-sprawl")?.severity).toBe("blocking");
    expect(ids(f, "action-sprawl").length).toBe(11);
  });
  test("TRIGGER (c): near-duplicate operationalIntent (Jaccard >= 0.6)", () => {
    const f = lintConstructionCandidates({
      actions: [
        action("a1", "Update Customer Email", "update the customer email address"),
        action("a2", "Change Customer Email", "update the customer email address now"),
      ],
    });
    expect(find(f, "action-sprawl")?.severity).toBe("blocking");
    expect(ids(f, "action-sprawl").sort()).toEqual(["a1", "a2"]);
  });
  test("CLEAN: few, intent-shaped, distinct actions", () => {
    const f = lintConstructionCandidates({
      actions: [
        action("a1", "Approve Order", "approve a pending order for fulfillment"),
        action("a2", "Cancel Shipment", "cancel an in-transit shipment and refund"),
      ],
    });
    expect(find(f, "action-sprawl")).toBeUndefined();
  });
});

describe("lint 7 — The Time Machine", () => {
  test("TRIGGER: versioning encoded in a property", () => {
    const f = lintConstructionCandidates({
      objects: [obj("o1", "Policy Version"), obj("o2", "Account", "tracks the is_current snapshot")],
    });
    expect(find(f, "time-machine")?.severity).toBe("advisory");
    expect(ids(f, "time-machine").sort()).toEqual(["o1", "o2"]);
  });
  test("CLEAN: no version/history language", () => {
    const f = lintConstructionCandidates({ objects: [obj("o1", "Account", "the customer account")] });
    expect(find(f, "time-machine")).toBeUndefined();
  });
});

describe("lint 8 — The Misnomer (BLOCKING)", () => {
  test("TRIGGER: generic object name + vague link meaning (incl. Korean)", () => {
    const f = lintConstructionCandidates({
      objects: [obj("o1", "Data"), obj("o2", "값")],
      links: [link("l1", "Rel", "Order", "Customer", "related to the customer"), link("l2", "Rel2", "A", "B", "관련")],
    });
    const finding = find(f, "misnomer");
    expect(finding?.severity).toBe("blocking");
    expect(finding?.candidateIds.sort()).toEqual(["l1", "l2", "o1", "o2"]);
  });
  test("CLEAN: real names + concrete link meaning", () => {
    const f = lintConstructionCandidates({
      objects: [obj("o1", "Customer")],
      links: [link("l1", "Places", "Customer", "Order", "a customer places an order")],
    });
    expect(find(f, "misnomer")).toBeUndefined();
  });
});

describe("aggregate pass", () => {
  test("runs all 8 lints and concats findings; severity discipline holds", () => {
    const f = lintConstructionCandidates({
      objects: [
        obj("o1", "Customer (Salesforce)"),
        obj("o2", "Customer - SAP"),
        obj("o3", "ingested_at"),
        obj("o4", "Sales Account"),
        obj("o5", "Support Account"),
        obj("o6", "Policy Version"),
        obj("o7", "Data"),
        obj("hub", "Hub"),
      ],
      actions: [action("a1", "Set Status", "set the status field"), action("a2", "Compute Total", "calculate total")],
      functions: [fn("f1", "Join", "concat first and last name")],
      links: [
        ...Array.from({ length: 9 }, (_, i) =>
          link(`hl${i}`, `Rel ${i}`, "Hub", `N${i}`, "a meaningful relation"),
        ),
        link("lv", "Rel", "A", "B", "related to"),
      ],
    });

    const patterns = new Set(f.map((x) => x.patternId));
    // all 8 patterns fire on this kitchen-sink-of-anti-patterns set
    for (const p of [
      "system-silos",
      "kitchen-sink",
      "department-silos",
      "god-object",
      "golden-hammer",
      "action-sprawl",
      "time-machine",
      "misnomer",
    ]) {
      expect(patterns.has(p)).toBe(true);
    }

    // severity discipline: exactly action-sprawl + misnomer are blocking
    const blocking = new Set(f.filter((x) => x.severity === "blocking").map((x) => x.patternId));
    expect(blocking).toEqual(new Set(["action-sprawl", "misnomer"]));
    const advisory = f.filter((x) => x.severity === "advisory").map((x) => x.patternId);
    for (const p of advisory) {
      expect(["action-sprawl", "misnomer"]).not.toContain(p);
    }
  });

  test("empty input → no findings, never throws", () => {
    expect(lintConstructionCandidates({})).toEqual([]);
    expect(lintConstructionCandidates({ objects: [], actions: [], functions: [], links: [], roles: [] })).toEqual([]);
  });

  test("defensive: malformed candidates (missing fields) do not throw", () => {
    const f = lintConstructionCandidates({
      objects: [{} as unknown, { plainName: 123 } as unknown],
      links: [{} as unknown],
      actions: [{ operationalIntent: null } as unknown],
    });
    expect(Array.isArray(f)).toBe(true);
  });
});
