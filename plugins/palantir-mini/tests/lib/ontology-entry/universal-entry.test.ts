import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  createUniversalOntologyEntry,
} from "../../../lib/ontology-entry/universal-entry";
import {
  readCurrentUniversalOntologyEntry,
  readUniversalOntologyEntry,
  writeUniversalOntologyEntry,
} from "../../../lib/ontology-entry/entry-store";

describe("UniversalOntologyEntry", () => {
  test("captures everyday read-only ontology requests without forcing DTC", () => {
    const entry = createUniversalOntologyEntry({
      rawUserRequest: "15번 문제와 hyperframes handoff 영향 범위를 알려줘.",
      projectRoot: "/tmp/palantir-mini",
      promptId: "prompt-1",
      promptHash: "hash-1",
      sessionId: "session-1",
      runtime: "codex",
      createdAt: "2026-05-12T00:00:00.000Z",
    });

    expect(entry.schemaVersion).toBe("palantir-mini/universal-ontology-entry/v1");
    expect(entry.status).toBe("captured");
    expect(entry.classification.requestKind).toBe("analysis");
    expect(entry.classification.requiresDtc).toBe(false);
    expect(entry.classification.canProceedReadOnly).toBe(true);
    expect(entry.project.candidateProjectIds).toContain("palantir-mini");
    expect(entry.ontologySeed.capabilityHints).toContain("hyperframes");
  });

  test("keeps weak Korean work terms read-only unless explicit mutation appears", () => {
    const readOnlyEntry = createUniversalOntologyEntry({
      rawUserRequest: "검토/분석/리뷰 진행하고 작업 정리 제안해줘.",
      projectRoot: "/tmp/palantir-mini",
      createdAt: "2026-05-12T00:00:00.000Z",
    });
    const mutationEntry = createUniversalOntologyEntry({
      rawUserRequest: "검토 후 필요한 수정 반영하고 패치 커밋까지 진행해줘.",
      projectRoot: "/tmp/palantir-mini",
      createdAt: "2026-05-12T00:00:00.000Z",
    });

    expect(readOnlyEntry.classification.mutationExpected).toBe(false);
    expect(readOnlyEntry.classification.requiresDtc).toBe(false);
    expect(readOnlyEntry.classification.canProceedReadOnly).toBe(true);
    expect(mutationEntry.classification.mutationExpected).toBe(true);
    expect(mutationEntry.classification.requiresDtc).toBe(true);
    expect(mutationEntry.classification.canProceedReadOnly).toBe(true);
  });

  test("persists current and addressable entry snapshots under project session state", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-entry-"));
    const entry = createUniversalOntologyEntry({
      rawUserRequest: "UniversalOntologyEntry를 구현해줘.",
      projectRoot,
      createdAt: "2026-05-12T00:00:00.000Z",
    });

    const written = writeUniversalOntologyEntry(entry);

    expect(fs.existsSync(written.entryPath)).toBe(true);
    expect(fs.existsSync(written.currentPath)).toBe(true);
    expect(readUniversalOntologyEntry(projectRoot, entry.entryId)?.entryId).toBe(entry.entryId);
    expect(readCurrentUniversalOntologyEntry(projectRoot)?.entryId).toBe(entry.entryId);
  });
});
