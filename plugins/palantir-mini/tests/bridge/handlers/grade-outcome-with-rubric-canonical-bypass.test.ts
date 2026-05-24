/**
 * palantir-mini v6.21.0 — grade_outcome_with_rubric canonical-rubric bypass guard tests.
 *
 * sprint-111 PR 5.1: canonical plan v2 §4 row 5.1
 *
 * Covers:
 * - When rubric has canonicalRubricRid set but RID isn't registered → advisory emitted.
 * - When PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1 → bypass envelope emitted, advisory skipped.
 * - When rubric.status === "canonical" → no advisory emitted.
 * - Normal rubric (no canonicalRubricRid, no status) → no advisory emitted.
 */

import { test, expect, describe, afterEach, beforeEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import gradeOutcomeWithRubric from "../../../bridge/handlers/grade-outcome-with-rubric";
import {
  GRADING_RUBRIC_REGISTRY,
  GradingRubricRegistry,
  gradingRubricRid,
  type GradingRubricDeclaration,
} from "#schemas/ontology/primitives/grading-rubric";
import {
  makeTmpDir,
  writeArtifact,
  cleanupTmpDirs,
  makeRule,
} from "./grade-outcome/fixtures";

// ─── Isolated events file ────────────────────────────────────────────────────
const eventsFile = path.join(os.tmpdir(), "test-events-canonical-bypass.jsonl");
const savedEnv: Record<string, string | undefined> = {};

afterEach(() => {
  cleanupTmpDirs();
  // Clean bypass env after each test
  delete process.env["PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS"];
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

beforeEach(() => {
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_EVENTS_FILE_FORCE = process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
  process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsFile;
  process.env["PALANTIR_MINI_EVENTS_FILE_FORCE"] = "1";
  // Reset events file
  try { fs.unlinkSync(eventsFile); } catch { /* ignore */ }
});

function readEmittedEvents(): unknown[] {
  try {
    const lines = fs.readFileSync(eventsFile, "utf8").trim().split("\n").filter(Boolean);
    return lines.map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

function findEventByErrorClass(events: unknown[], errorClass: string): unknown | undefined {
  return (events as Array<Record<string, unknown>>).find(
    e => (e as Record<string, unknown>).payload !== undefined &&
      ((e as Record<string, unknown>).payload as Record<string, unknown>)["errorClass"] === errorClass
  );
}

// ─── Shared rubric fixture ────────────────────────────────────────────────────
const makeSimpleRubric = (opts: { canonicalRubricRid?: string; status?: string } = {}) => ({
  rubricId: "test-rubric-canonical-bypass",
  criteria: [makeRule("c1", 1.0, "hello")],
  ...opts,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("grade_outcome_with_rubric — canonicalRubricRid bypass guard", () => {
  test("no canonicalRubricRid and no status → no advisory emitted, result normal", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: makeSimpleRubric(),
    });
    expect(result.passedCriteria).toBe(1);
    const events = readEmittedEvents();
    expect(findEventByErrorClass(events, "non_canonical_rubric_used")).toBeUndefined();
    expect(findEventByErrorClass(events, "canonical_rubric_bypass_invoked")).toBeUndefined();
  });

  test("rubric has canonicalRubricRid NOT in registry → advisory non_canonical_rubric_used emitted", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello");
    await gradeOutcomeWithRubric({
      artifactPath,
      rubric: makeSimpleRubric({ canonicalRubricRid: "rubric:unregistered-rid" }),
    });
    const events = readEmittedEvents();
    const advisory = findEventByErrorClass(events, "non_canonical_rubric_used");
    expect(advisory).toBeDefined();
    const payload = (advisory as Record<string, unknown>)["payload"] as Record<string, unknown>;
    expect(payload["rubricId"]).toBe("test-rubric-canonical-bypass");
    expect(payload["canonicalRubricRid"]).toBe("rubric:unregistered-rid");
  });

  test("PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS=1 → bypass envelope emitted, no non_canonical_rubric_used advisory", async () => {
    process.env["PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS"] = "1";
    const artifactPath = writeArtifact(makeTmpDir(), "hello");
    await gradeOutcomeWithRubric({
      artifactPath,
      rubric: makeSimpleRubric({ canonicalRubricRid: "rubric:unregistered-rid" }),
    });
    const events = readEmittedEvents();
    expect(findEventByErrorClass(events, "non_canonical_rubric_used")).toBeUndefined();
    const bypass = findEventByErrorClass(events, "canonical_rubric_bypass_invoked");
    expect(bypass).toBeDefined();
    const payload = (bypass as Record<string, unknown>)["payload"] as Record<string, unknown>;
    expect(payload["bypassEnvVar"]).toBe("PALANTIR_MINI_CANONICAL_RUBRIC_BYPASS");
  });

  test("rubric.status === 'canonical' + no canonicalRubricRid → no advisory emitted (canonical in-place)", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello");
    await gradeOutcomeWithRubric({
      artifactPath,
      rubric: makeSimpleRubric({ status: "canonical" }),
    });
    const events = readEmittedEvents();
    expect(findEventByErrorClass(events, "non_canonical_rubric_used")).toBeUndefined();
  });

  test("rubric.status === 'draft' + no canonicalRubricRid → advisory emitted", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello");
    await gradeOutcomeWithRubric({
      artifactPath,
      rubric: makeSimpleRubric({ status: "draft" }),
    });
    const events = readEmittedEvents();
    expect(findEventByErrorClass(events, "non_canonical_rubric_used")).toBeDefined();
  });

  test("rubric registered as canonical in GRADING_RUBRIC_REGISTRY → no advisory emitted", async () => {
    // Register as canonical so the guard sees it
    const rubricRid = gradingRubricRid("rubric:canonical-test-pr5.1");
    const decl: GradingRubricDeclaration = {
      rubricId: rubricRid,
      canonicalRubricRid: rubricRid,
      title: "Test Canonical Rubric",
      description: "Registered canonical for bypass guard test.",
      criterionRids: [],
      aggregator: { threshold: 0.5, scale: "0-1" },
      appliesToDomain: "any",
      status: "canonical",
      registeredAt: "2026-05-13T00:00:00Z",
    };
    GRADING_RUBRIC_REGISTRY.register(decl);

    const artifactPath = writeArtifact(makeTmpDir(), "hello");
    await gradeOutcomeWithRubric({
      artifactPath,
      rubric: makeSimpleRubric({ canonicalRubricRid: String(rubricRid) }),
    });
    const events = readEmittedEvents();
    expect(findEventByErrorClass(events, "non_canonical_rubric_used")).toBeUndefined();
  });
});

// ─── GradingRubricRegistry unit tests ────────────────────────────────────────

describe("GradingRubricRegistry — unit", () => {
  test("register + get round-trip works", () => {
    const reg = new GradingRubricRegistry();
    const rid = gradingRubricRid("rubric:unit-test-1");
    const decl: GradingRubricDeclaration = {
      rubricId: rid,
      title: "Unit Test Rubric",
      description: "For registry round-trip test.",
      criterionRids: [],
      aggregator: { threshold: 0.5, scale: "0-1" },
      appliesToDomain: "any",
      status: "draft",
    };
    reg.register(decl);
    expect(reg.get(rid)).toBe(decl);
  });

  test("isCanonical returns true for canonical, false for draft", () => {
    const reg = new GradingRubricRegistry();
    const canonRid = gradingRubricRid("rubric:iscanonical-test");
    const draftRid = gradingRubricRid("rubric:isdraft-test");
    reg.register({
      rubricId: canonRid,
      title: "Canon",
      description: "canonical rubric",
      criterionRids: [],
      aggregator: { threshold: 0.5, scale: "0-1" },
      appliesToDomain: "any",
      status: "canonical",
    });
    reg.register({
      rubricId: draftRid,
      title: "Draft",
      description: "draft rubric",
      criterionRids: [],
      aggregator: { threshold: 0.5, scale: "0-1" },
      appliesToDomain: "any",
      status: "draft",
    });
    expect(reg.isCanonical(canonRid)).toBe(true);
    expect(reg.isCanonical(draftRid)).toBe(false);
  });

  test("re-registering identical canonical rubric is no-op (idempotent)", () => {
    const reg = new GradingRubricRegistry();
    const rid = gradingRubricRid("rubric:idempotent-test");
    const decl: GradingRubricDeclaration = {
      rubricId: rid,
      title: "Idempotent",
      description: "idempotent test",
      criterionRids: [],
      aggregator: { threshold: 0.5, scale: "0-1" },
      appliesToDomain: "any",
      status: "canonical",
    };
    reg.register(decl);
    // Register identical — should NOT throw (deep-equal check)
    expect(() => reg.register({ ...decl })).not.toThrow();
  });

  test("mutating a canonical rubric throws", () => {
    const reg = new GradingRubricRegistry();
    const rid = gradingRubricRid("rubric:mutation-guard-test");
    reg.register({
      rubricId: rid,
      title: "Original",
      description: "will be mutated",
      criterionRids: [],
      aggregator: { threshold: 0.5, scale: "0-1" },
      appliesToDomain: "any",
      status: "canonical",
    });
    expect(() => reg.register({
      rubricId: rid,
      title: "Mutated title",  // different title → should throw
      description: "will be mutated",
      criterionRids: [],
      aggregator: { threshold: 0.5, scale: "0-1" },
      appliesToDomain: "any",
      status: "canonical",
    })).toThrow(/cannot mutate canonical rubric/);
  });
});
