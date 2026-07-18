// P510 S2: type/schema tests for MEM-001..MEM-005 (positive + negative),
// plus the validation-contract item 2 "no shared catch-all shape / cannot
// borrow another form's authority" proof. Complements
// tests/contracts/contracts.test.ts (envelope-level JSON-schema shape only)
// — this file exercises src/memory/memory-item.ts's layer-conditional
// guards directly, which the generic contract suite structurally cannot
// (no oneOf/if-then in the successor's minimal schema-validator subset).

import { describe, expect, test } from "bun:test";
import {
  classifyMemoryItem,
  isEpisodicMemoryItem,
  isMemoryLayer,
  isProceduralMemoryItem,
  isSemanticMemoryItem,
  isWorkingMemoryItem,
  MEMORY_LAYERS,
  type EpisodicMemoryItem,
  type MemoryItem,
  type ProceduralMemoryItem,
  type SemanticMemoryItem,
  type WorkingMemoryItem,
} from "../../src/memory/memory-item";

const ACTOR = { identity: "agent:claude-sonnet-5", role: "worker" };

// MEM-007: complete, valid provenance shared by every positive factory
// below — each field non-empty, matching src/memory/memory-item.ts's
// PROVENANCE_FIELDS. Individual tests override `provenance` (whole object
// or a field within it) to exercise the fail-closed incomplete-provenance
// path.
const PROVENANCE = {
  source: "sic-0009",
  session: "session-2026-07-18-001",
  actor: "agent:claude-sonnet-5",
  transformation: "sic-approval-extract",
  governingContract: "adr:ADR-006",
  priorState: "genesis",
};

function workingItem(overrides: Partial<Record<string, unknown>> = {}): WorkingMemoryItem {
  return {
    schemaVersion: "1.0.0",
    itemId: "mem-w-1",
    layer: "working",
    authority: { writer: "src/memory/memory-item.ts", sessionScope: "session-2026-07-18-001" },
    retention: { policy: "ephemeral", maxAgeSeconds: 900 },
    content: { note: "scratch" },
    createdAt: "2026-07-18T09:24:00Z",
    byWhom: ACTOR,
    provenance: PROVENANCE,
    ...overrides,
  } as WorkingMemoryItem;
}

function episodicItem(overrides: Partial<Record<string, unknown>> = {}): EpisodicMemoryItem {
  return {
    schemaVersion: "1.0.0",
    itemId: "mem-e-1",
    layer: "episodic",
    authority: { writer: "src/lineage/event-appender.ts", eventRef: "evt-0044" },
    retention: { policy: "retained", sequenceOrdinal: 12 },
    content: { outcome: "SIC turn-9 approved by user", summary: "approval recorded" },
    createdAt: "2026-07-18T09:25:00Z",
    byWhom: ACTOR,
    provenance: PROVENANCE,
    ...overrides,
  } as EpisodicMemoryItem;
}

function semanticItem(overrides: Partial<Record<string, unknown>> = {}): SemanticMemoryItem {
  return {
    schemaVersion: "1.0.0",
    itemId: "mem-s-1",
    layer: "semantic",
    authority: { writer: "src/memory/memory-item.ts", governingDecisionRef: "adr:ADR-006" },
    retention: { policy: "archived", archiveRef: "archive/2026-07/mem-s-1.json" },
    content: { concept: "single-writer mutation-authority per store", relations: [{ predicate: "governedBy", target: "adr:ADR-006" }] },
    createdAt: "2026-07-18T09:27:00Z",
    byWhom: { identity: "user:palantirkc" },
    provenance: PROVENANCE,
    ...overrides,
  } as SemanticMemoryItem;
}

function proceduralItem(overrides: Partial<Record<string, unknown>> = {}): ProceduralMemoryItem {
  return {
    schemaVersion: "1.0.0",
    itemId: "mem-p-1",
    layer: "procedural",
    authority: { writer: "src/memory/procedural-writer.ts", playbookRef: "playbook:p510-typed-memory" },
    retention: { policy: "archived", archiveRef: "archive/2026-07/mem-p-1.json" },
    content: { procedureId: "playbook:p510-typed-memory", steps: ["ground in ADR-006", "extend contract additively", "implement layer guards"] },
    createdAt: "2026-07-18T09:26:00Z",
    byWhom: { identity: "user:palantirkc" },
    provenance: PROVENANCE,
    ...overrides,
  } as ProceduralMemoryItem;
}

describe("MEM-005: machine-readable layer discrimination", () => {
  test("MEMORY_LAYERS fixes exactly the 4 canonical layers", () => {
    expect([...MEMORY_LAYERS].sort()).toEqual(["episodic", "procedural", "semantic", "working"]);
  });

  test("isMemoryLayer accepts only the 4 registered values", () => {
    for (const layer of MEMORY_LAYERS) expect(isMemoryLayer(layer)).toBe(true);
    expect(isMemoryLayer("long-term")).toBe(false);
    expect(isMemoryLayer(123)).toBe(false);
  });

  test("classifyMemoryItem dispatches each layer to its own guard and never returns a bare boolean/unknown", () => {
    for (const [item, layer] of [
      [workingItem(), "working"],
      [episodicItem(), "episodic"],
      [semanticItem(), "semantic"],
      [proceduralItem(), "procedural"],
    ] as const) {
      const result = classifyMemoryItem(item);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.layer).toBe(layer);
    }
  });

  test("classifyMemoryItem fails closed on an unregistered layer with a stable reason code (UNKNOWN-is-not-PASS)", () => {
    const result = classifyMemoryItem({ ...workingItem(), layer: "long-term" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail.length).toBeGreaterThan(0);
    }
  });

  test("classifyMemoryItem fails closed on a non-object value", () => {
    const result = classifyMemoryItem("not-an-object");
    expect(result.ok).toBe(false);
  });
});

describe("MEM-001: working memory — bounded, current-session, no minted authority", () => {
  test("positive: a well-formed working item is accepted", () => {
    expect(isWorkingMemoryItem(workingItem())).toBe(true);
  });

  test("positive: working content is optional (may be entirely absent)", () => {
    const { content: _drop, ...rest } = workingItem();
    expect(isWorkingMemoryItem(rest)).toBe(true);
  });

  test("negative: missing authority.sessionScope is rejected", () => {
    const item = workingItem({ authority: { writer: "src/memory/memory-item.ts" } });
    expect(isWorkingMemoryItem(item)).toBe(false);
  });

  test("negative: retention.policy other than \"ephemeral\" is rejected (working may not mint durable retention)", () => {
    const item = workingItem({ retention: { policy: "retained", maxAgeSeconds: 900 } });
    expect(isWorkingMemoryItem(item)).toBe(false);
  });

  test("negative: missing retention.maxAgeSeconds is rejected (retention must be explicitly bounded)", () => {
    const item = workingItem({ retention: { policy: "ephemeral" } });
    expect(isWorkingMemoryItem(item)).toBe(false);
  });
});

describe("MEM-002: episodic memory — event-anchored, identity/time/actor/outcome/replayable ordering", () => {
  test("positive: a well-formed episodic item is accepted", () => {
    expect(isEpisodicMemoryItem(episodicItem())).toBe(true);
  });

  test("negative: missing authority.eventRef is rejected", () => {
    const item = episodicItem({ authority: { writer: "src/lineage/event-appender.ts" } });
    expect(isEpisodicMemoryItem(item)).toBe(false);
  });

  test("negative: missing retention.sequenceOrdinal is rejected (no replayable ordering)", () => {
    const item = episodicItem({ retention: { policy: "retained" } });
    expect(isEpisodicMemoryItem(item)).toBe(false);
  });

  test("negative: missing content.outcome is rejected", () => {
    const item = episodicItem({ content: { summary: "no outcome recorded" } });
    expect(isEpisodicMemoryItem(item)).toBe(false);
  });

  test("negative: a negative sequenceOrdinal is rejected", () => {
    const item = episodicItem({ retention: { policy: "retained", sequenceOrdinal: -1 } });
    expect(isEpisodicMemoryItem(item)).toBe(false);
  });
});

describe("MEM-003: semantic memory — durable governed knowledge, independent of raw transcripts", () => {
  test("positive: a well-formed semantic item is accepted", () => {
    expect(isSemanticMemoryItem(semanticItem())).toBe(true);
  });

  test("negative: missing authority.governingDecisionRef is rejected (semantic promotion requires a governing decision)", () => {
    const item = semanticItem({ authority: { writer: "src/memory/memory-item.ts" } });
    expect(isSemanticMemoryItem(item)).toBe(false);
  });

  test("negative: retention.policy \"ephemeral\" is rejected (durable knowledge may not be ephemeral)", () => {
    const item = semanticItem({ retention: { policy: "ephemeral" } });
    expect(isSemanticMemoryItem(item)).toBe(false);
  });

  test("negative: a bare transcript string as content is rejected — content must be a structured concept, not raw text", () => {
    const item = semanticItem({ content: "raw transcript text pretending to be a concept" });
    expect(isSemanticMemoryItem(item)).toBe(false);
  });

  test("negative: missing content.concept is rejected", () => {
    const item = semanticItem({ content: { relations: [{ predicate: "governedBy", target: "adr:ADR-006" }] } });
    expect(isSemanticMemoryItem(item)).toBe(false);
  });
});

describe("MEM-004: procedural memory — reusable governed playbook, independent of semantic facts", () => {
  test("positive: a well-formed procedural item is accepted", () => {
    expect(isProceduralMemoryItem(proceduralItem())).toBe(true);
  });

  test("negative: missing authority.playbookRef is rejected", () => {
    const item = proceduralItem({ authority: { writer: "src/memory/procedural-writer.ts" } });
    expect(isProceduralMemoryItem(item)).toBe(false);
  });

  test("negative: content shaped like semantic content (concept/relations, no procedureId/steps) is rejected", () => {
    const item = proceduralItem({ content: { concept: "not a procedure" } });
    expect(isProceduralMemoryItem(item)).toBe(false);
  });

  test("negative: empty steps array is rejected", () => {
    const item = proceduralItem({ content: { procedureId: "playbook:x", steps: [] } });
    expect(isProceduralMemoryItem(item)).toBe(false);
  });
});

describe("MEM-007: item-level provenance is required and complete on every layer (fail-closed)", () => {
  test("positive: complete provenance is accepted on every layer", () => {
    expect(isWorkingMemoryItem(workingItem())).toBe(true);
    expect(isEpisodicMemoryItem(episodicItem())).toBe(true);
    expect(isSemanticMemoryItem(semanticItem())).toBe(true);
    expect(isProceduralMemoryItem(proceduralItem())).toBe(true);
  });

  test("negative: an item with provenance entirely absent cannot be persisted (classifyMemoryItem denies it)", () => {
    const { provenance: _drop, ...rest } = workingItem();
    const result = classifyMemoryItem(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-SCHEMA-VALIDATION-FAILED");
      expect(result.detail.length).toBeGreaterThan(0);
    }
  });

  test("negative: an item with provenance present but incomplete (each of the 6 fields, one at a time) cannot be persisted", () => {
    const fullProvenance = workingItem().provenance;
    for (const field of Object.keys(fullProvenance) as (keyof typeof fullProvenance)[]) {
      const { [field]: _drop, ...incomplete } = fullProvenance;
      const item = workingItem({ provenance: incomplete });
      const result = classifyMemoryItem(item);
      expect(result.ok).toBe(false);
    }
  });

  test("negative: an empty-string provenance field is rejected the same as an absent one", () => {
    const item = episodicItem({ provenance: { ...episodicItem().provenance, transformation: "" } });
    expect(isEpisodicMemoryItem(item)).toBe(false);
  });

  test("negative: a non-object provenance value is rejected", () => {
    const item = semanticItem({ provenance: "not-an-object" });
    expect(isSemanticMemoryItem(item)).toBe(false);
  });
});

describe("Validation-contract item 2: four distinct types, no catch-all — a form cannot borrow another form's authority", () => {
  test("a working item carrying semantic's governingDecisionRef is rejected by the working guard", () => {
    const bypass = workingItem({ authority: { writer: "x", sessionScope: "session-1", governingDecisionRef: "adr:ADR-006" } });
    expect(isWorkingMemoryItem(bypass)).toBe(false);
  });

  test("a working item carrying procedural's playbookRef is rejected by the working guard", () => {
    const bypass = workingItem({ authority: { writer: "x", sessionScope: "session-1", playbookRef: "playbook:x" } });
    expect(isWorkingMemoryItem(bypass)).toBe(false);
  });

  test("an episodic item carrying working's sessionScope is rejected by the episodic guard", () => {
    const bypass = episodicItem({ authority: { writer: "x", eventRef: "evt-1", sessionScope: "session-1" } });
    expect(isEpisodicMemoryItem(bypass)).toBe(false);
  });

  test("a semantic item carrying episodic's eventRef instead of its own governingDecisionRef is rejected", () => {
    const bypass = semanticItem({ authority: { writer: "x", eventRef: "evt-1" } });
    expect(isSemanticMemoryItem(bypass)).toBe(false);
  });

  test("a procedural item carrying semantic's governingDecisionRef in addition to its own playbookRef is rejected (no dual authority)", () => {
    const bypass = proceduralItem({ authority: { writer: "x", playbookRef: "playbook:x", governingDecisionRef: "adr:ADR-006" } });
    expect(isProceduralMemoryItem(bypass)).toBe(false);
  });

  test("a working item carrying episodic's sequenceOrdinal retention field is rejected (retention borrowing, not just authority)", () => {
    const bypass = workingItem({ retention: { policy: "ephemeral", maxAgeSeconds: 900, sequenceOrdinal: 1 } });
    expect(isWorkingMemoryItem(bypass)).toBe(false);
  });

  test("an episodic item carrying working's maxAgeSeconds retention field is rejected", () => {
    const bypass = episodicItem({ retention: { policy: "retained", sequenceOrdinal: 1, maxAgeSeconds: 900 } });
    expect(isEpisodicMemoryItem(bypass)).toBe(false);
  });

  test("each layer's own item is rejected by every OTHER layer's guard — the four types are structurally disjoint, not one shape with four labels", () => {
    const items: readonly [MemoryItem, string][] = [
      [workingItem(), "working"],
      [episodicItem(), "episodic"],
      [semanticItem(), "semantic"],
      [proceduralItem(), "procedural"],
    ];
    const guards: Record<string, (v: unknown) => boolean> = {
      working: isWorkingMemoryItem,
      episodic: isEpisodicMemoryItem,
      semantic: isSemanticMemoryItem,
      procedural: isProceduralMemoryItem,
    };
    for (const [item, ownLayer] of items) {
      for (const [guardLayer, guard] of Object.entries(guards)) {
        if (guardLayer === ownLayer) {
          expect(guard(item)).toBe(true);
        } else {
          expect(guard(item)).toBe(false);
        }
      }
    }
  });
});
