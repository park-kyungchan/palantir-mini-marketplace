// P530 S3: MEM-008 archive-before-remove retention tests.
// `src/lineage/retention.ts#requireArchiveBeforeRemove` (generic primitive)
// + `src/memory/memory-item.ts#assertMemoryItemArchivedBeforeRemove`
// (MemoryItem-specific caller).

import { describe, expect, test } from "bun:test";
import { requireArchiveBeforeRemove } from "../../src/lineage/retention";
import {
  assertMemoryItemArchivedBeforeRemove,
  type EpisodicMemoryItem,
  type ProceduralMemoryItem,
  type SemanticMemoryItem,
  type WorkingMemoryItem,
} from "../../src/memory/memory-item";

const PROVENANCE = {
  source: "sic-0009",
  session: "session-2026-07-18-001",
  actor: "agent:claude-sonnet-5",
  transformation: "sic-approval-extract",
  governingContract: "adr:ADR-006",
  priorState: "genesis",
};

describe("MEM-008: requireArchiveBeforeRemove (generic primitive)", () => {
  test("positive: archived with a recorded archiveRef is allowed, returning the proven archiveRef", () => {
    const result = requireArchiveBeforeRemove("rec-1", { policy: "archived", archiveRef: "archive/2026-07/rec-1.json" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recordId).toBe("rec-1");
      expect(result.value.archiveRef).toBe("archive/2026-07/rec-1.json");
    }
  });

  test("negative: retention.policy other than \"archived\" is denied (e.g. \"retained\")", () => {
    const result = requireArchiveBeforeRemove("rec-2", { policy: "retained" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("RC-MEMORY-RETENTION-VIOLATION");
      expect(result.detail.length).toBeGreaterThan(0);
    }
  });

  test("negative: retention.policy \"archived\" but no archiveRef is denied (removal without a prior archive)", () => {
    const result = requireArchiveBeforeRemove("rec-3", { policy: "archived" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MEMORY-RETENTION-VIOLATION");
  });

  test("negative: retention.policy \"archived\" with an empty-string archiveRef is denied", () => {
    const result = requireArchiveBeforeRemove("rec-4", { policy: "archived", archiveRef: "" });
    expect(result.ok).toBe(false);
  });

  test("negative: retention.policy \"ephemeral\" (working memory's locked policy) is denied", () => {
    const result = requireArchiveBeforeRemove("rec-5", { policy: "ephemeral" });
    expect(result.ok).toBe(false);
  });
});

describe("MEM-008: assertMemoryItemArchivedBeforeRemove (MemoryItem-specific wrapper, all 4 layers)", () => {
  test("positive: an archived episodic item with archiveRef is allowed", () => {
    const item: EpisodicMemoryItem = {
      schemaVersion: "1.0.0",
      itemId: "mem-e-archived",
      layer: "episodic",
      authority: { writer: "src/lineage/event-appender.ts", eventRef: "evt-0044" },
      retention: { policy: "archived", archiveRef: "archive/2026-07/mem-e-archived.json", sequenceOrdinal: 1 },
      content: { outcome: "approved" },
      createdAt: "2026-07-18T09:25:00Z",
      byWhom: { identity: "agent:claude-sonnet-5" },
      provenance: PROVENANCE,
    };
    const result = assertMemoryItemArchivedBeforeRemove(item);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.archiveRef).toBe("archive/2026-07/mem-e-archived.json");
  });

  test("negative: a \"retained\" (not-yet-archived) semantic item cannot be removed", () => {
    const item: SemanticMemoryItem = {
      schemaVersion: "1.0.0",
      itemId: "mem-s-retained",
      layer: "semantic",
      authority: { writer: "src/memory/memory-item.ts", governingDecisionRef: "adr:ADR-006" },
      retention: { policy: "retained" },
      content: { concept: "not yet archived" },
      createdAt: "2026-07-18T09:27:00Z",
      byWhom: { identity: "user:palantirkc" },
      provenance: PROVENANCE,
    };
    const result = assertMemoryItemArchivedBeforeRemove(item);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MEMORY-RETENTION-VIOLATION");
  });

  test("negative: a working (\"ephemeral\", never archivable) item cannot be removed via this path", () => {
    const item: WorkingMemoryItem = {
      schemaVersion: "1.0.0",
      itemId: "mem-w-ephemeral",
      layer: "working",
      authority: { writer: "src/memory/memory-item.ts", sessionScope: "session-2026-07-18-001" },
      retention: { policy: "ephemeral", maxAgeSeconds: 900 },
      createdAt: "2026-07-18T09:24:00Z",
      byWhom: { identity: "agent:claude-sonnet-5" },
      provenance: PROVENANCE,
    };
    const result = assertMemoryItemArchivedBeforeRemove(item);
    expect(result.ok).toBe(false);
  });

  test("negative: a procedural item with retention.policy \"archived\" but no archiveRef cannot be removed", () => {
    const item: ProceduralMemoryItem = {
      schemaVersion: "1.0.0",
      itemId: "mem-p-unrecorded",
      layer: "procedural",
      authority: { writer: "src/memory/procedural-writer.ts", playbookRef: "playbook:x" },
      retention: { policy: "archived" },
      content: { procedureId: "playbook:x", steps: ["step-1"] },
      createdAt: "2026-07-18T09:26:00Z",
      byWhom: { identity: "user:palantirkc" },
      provenance: PROVENANCE,
    };
    const result = assertMemoryItemArchivedBeforeRemove(item);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("RC-MEMORY-RETENTION-VIOLATION");
  });
});
