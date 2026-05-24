/**
 * Tests for sic-approval-cache.ts — DTC extension (Sprint 97 W3, dtc-T3-lib-sic-cache)
 *
 * Coverage:
 *   - Backward-compat: existing SicApprovalEntry fields are unchanged.
 *   - readDTCApprovalFromCache returns null when no entry exists.
 *   - readDTCApprovalFromCache returns null when entry has no dtcApprovedAt.
 *   - readDTCApprovalFromCache returns null when DTC approval age > 60 min.
 *   - readDTCApprovalFromCache returns DtcApprovalEntry with correct shape when valid.
 *   - age_ms calculation correctness (mock nowMs).
 */

import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  SIC_CACHE_TTL_MS,
  checkSicApprovalCache,
  recordSicApproval,
  invalidateSicApprovalMemoryCache,
  readDTCApprovalFromCache,
} from "../../../lib/prompt-front-door/sic-approval-cache";
import type {
  SicApprovalEntry,
  DtcApprovalEntry,
} from "../../../lib/prompt-front-door/sic-approval-cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProjectRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "palantir-mini-sic-test-"));
}

function writeCache(
  projectRoot: string,
  entries: SicApprovalEntry[],
): void {
  const cacheDir = path.join(projectRoot, ".palantir-mini", "session");
  mkdirSync(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, "sic-approval-cache.json");
  writeFileSync(
    cacheFile,
    JSON.stringify({ entries, updatedAt: new Date().toISOString() }) + "\n",
    "utf8",
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("SicApprovalEntry — backward-compat", () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeProjectRoot(); });
  afterEach(() => {
    invalidateSicApprovalMemoryCache(tmpDir);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("recordSicApproval creates entry with existing SIC fields only", () => {
    recordSicApproval(tmpDir, "p-001", "ref-abc");
    const entry = checkSicApprovalCache(tmpDir, "p-001");
    expect(entry).toBeDefined();
    expect(entry!.promptId).toBe("p-001");
    expect(entry!.approvalRef).toBe("ref-abc");
    expect(entry!.approvedAt).toBeDefined();
    // DTC fields absent when not explicitly set
    expect(entry!.dtcApprovedAt).toBeUndefined();
    expect(entry!.dtcFillTurnsCompleted).toBeUndefined();
    expect(entry!.lastApprovedRubricScore).toBeUndefined();
  });

  test("checkSicApprovalCache still returns undefined for missing promptId", () => {
    recordSicApproval(tmpDir, "p-002");
    const result = checkSicApprovalCache(tmpDir, "p-no-match");
    expect(result).toBeUndefined();
  });
});

describe("readDTCApprovalFromCache", () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeProjectRoot(); });
  afterEach(() => {
    invalidateSicApprovalMemoryCache(tmpDir);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns null when no entry exists for the given promptId", () => {
    const nowMs = Date.now();
    const result = readDTCApprovalFromCache(tmpDir, "p-missing", nowMs);
    expect(result).toBeNull();
  });

  test("returns null when entry exists but has no dtcApprovedAt (SIC approved, DTC not)", () => {
    // Write a SIC-only entry (no DTC fields)
    const sicEntry: SicApprovalEntry = {
      promptId: "p-sic-only",
      approvedAt: new Date().toISOString(),
      projectRoot: tmpDir,
    };
    writeCache(tmpDir, [sicEntry]);

    const nowMs = Date.now();
    const result = readDTCApprovalFromCache(tmpDir, "p-sic-only", nowMs);
    expect(result).toBeNull();
  });

  test("returns null when DTC approval age exceeds 60-min TTL", () => {
    const dtcApprovedAt = new Date(Date.now() - SIC_CACHE_TTL_MS - 1000).toISOString();
    const entry: SicApprovalEntry = {
      promptId: "p-stale",
      approvedAt: new Date().toISOString(), // SIC still fresh
      dtcApprovedAt,
      dtcFillTurnsCompleted: 6,
      lastApprovedRubricScore: 0.82,
      projectRoot: tmpDir,
    };
    writeCache(tmpDir, [entry]);

    const nowMs = Date.now();
    const result = readDTCApprovalFromCache(tmpDir, "p-stale", nowMs);
    expect(result).toBeNull();
  });

  test("returns DtcApprovalEntry with correct shape when DTC approval is valid", () => {
    const dtcApprovedAt = new Date(Date.now() - 5000).toISOString(); // 5s ago
    const entry: SicApprovalEntry = {
      promptId: "p-valid",
      approvedAt: new Date().toISOString(),
      dtcApprovedAt,
      dtcFillTurnsCompleted: 7,
      lastApprovedRubricScore: 0.91,
      projectRoot: tmpDir,
    };
    writeCache(tmpDir, [entry]);

    const nowMs = Date.now();
    const result = readDTCApprovalFromCache(tmpDir, "p-valid", nowMs);

    expect(result).not.toBeNull();
    const dtc = result as DtcApprovalEntry;
    expect(dtc.projectRoot).toBe(tmpDir);
    expect(dtc.promptId).toBe("p-valid");
    expect(dtc.dtcApprovedAt).toBe(dtcApprovedAt);
    expect(dtc.dtcFillTurnsCompleted).toBe(7);
    expect(dtc.lastApprovedRubricScore).toBe(0.91);
    expect(dtc.age_ms).toBeGreaterThanOrEqual(0);
    expect(dtc.age_ms).toBeLessThan(SIC_CACHE_TTL_MS);
  });

  test("age_ms calculation is correct (mock nowMs)", () => {
    // Use wall-clock now as the reference so checkSicApprovalCache (which uses Date.now()
    // internally) treats the SIC entry as fresh. Control the DTC timestamp precisely.
    const nowMs = Date.now();
    const dtcOffsetMs = 30 * 60 * 1000; // 30 min
    const dtcApprovedAt = new Date(nowMs - dtcOffsetMs).toISOString();
    const entry: SicApprovalEntry = {
      promptId: "p-age-check",
      approvedAt: new Date(nowMs - 5 * 60 * 1000).toISOString(), // SIC 5 min ago (fresh)
      dtcApprovedAt,
      dtcFillTurnsCompleted: 3,
      lastApprovedRubricScore: 0.75,
      projectRoot: tmpDir,
    };
    writeCache(tmpDir, [entry]);

    const result = readDTCApprovalFromCache(tmpDir, "p-age-check", nowMs);

    expect(result).not.toBeNull();
    // age_ms should be exactly 30 min (controlled offset from same nowMs)
    expect(result!.age_ms).toBe(dtcOffsetMs);
  });

  test("defaults dtcFillTurnsCompleted to 0 when field is missing from entry", () => {
    const dtcApprovedAt = new Date(Date.now() - 1000).toISOString();
    const entry: SicApprovalEntry = {
      promptId: "p-defaults",
      approvedAt: new Date().toISOString(),
      dtcApprovedAt,
      // dtcFillTurnsCompleted intentionally absent
      lastApprovedRubricScore: 0.5,
      projectRoot: tmpDir,
    };
    writeCache(tmpDir, [entry]);

    const result = readDTCApprovalFromCache(tmpDir, "p-defaults", Date.now());
    expect(result).not.toBeNull();
    expect(result!.dtcFillTurnsCompleted).toBe(0);
    expect(result!.lastApprovedRubricScore).toBe(0.5);
  });

  test("defaults lastApprovedRubricScore to 0 when field is missing from entry", () => {
    const dtcApprovedAt = new Date(Date.now() - 1000).toISOString();
    const entry: SicApprovalEntry = {
      promptId: "p-defaults-score",
      approvedAt: new Date().toISOString(),
      dtcApprovedAt,
      dtcFillTurnsCompleted: 5,
      // lastApprovedRubricScore intentionally absent
      projectRoot: tmpDir,
    };
    writeCache(tmpDir, [entry]);

    const result = readDTCApprovalFromCache(tmpDir, "p-defaults-score", Date.now());
    expect(result).not.toBeNull();
    expect(result!.lastApprovedRubricScore).toBe(0);
    expect(result!.dtcFillTurnsCompleted).toBe(5);
  });
});
