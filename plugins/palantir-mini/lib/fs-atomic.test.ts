/**
 * Tests for lib/fs-atomic.ts — static governed-edit write-set (@Edits) + subset check.
 *
 * Covers:
 *  1. GOVERNED_EDIT_WRITE_SET declares the `.palantir-mini` segment.
 *  2. isWithinDeclaredWriteSet — pure subset check (in-set vs out-of-set).
 *  3. assertWriteWithinDeclaredSet — NON-BREAKING by default (warns, returns false);
 *     throws only under PALANTIR_MINI_WRITE_SET_STRICT=1.
 *  4. Actual governed writes (atomic JSON writers + the ActionType-gated event
 *     append) are a SUBSET of the declared set: they succeed under strict mode
 *     when targeting `.palantir-mini/`, and an out-of-set target is rejected.
 */

import { afterEach, describe, expect, it, mock } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  GOVERNED_EDIT_WRITE_SET,
  assertWriteWithinDeclaredSet,
  atomicWriteJsonSync,
  isWithinDeclaredWriteSet,
} from "./fs-atomic";
import { appendEventAtomic } from "./event-log/append";

const STRICT = "PALANTIR_MINI_WRITE_SET_STRICT";

afterEach(() => {
  delete process.env[STRICT];
});

function tmpProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pm-writeset-"));
}

describe("GOVERNED_EDIT_WRITE_SET declaration", () => {
  it("declares the .palantir-mini ontology-state subtree segment", () => {
    expect(GOVERNED_EDIT_WRITE_SET.segment).toBe(".palantir-mini");
  });
});

describe("isWithinDeclaredWriteSet (pure subset check)", () => {
  it("accepts a target inside a .palantir-mini subtree", () => {
    expect(isWithinDeclaredWriteSet("/proj/.palantir-mini/issues/known-issues.json")).toBe(true);
    expect(isWithinDeclaredWriteSet("/proj/.palantir-mini/session/events.jsonl")).toBe(true);
  });

  it("rejects a target outside any .palantir-mini subtree", () => {
    expect(isWithinDeclaredWriteSet("/proj/src/index.ts")).toBe(false);
    expect(isWithinDeclaredWriteSet("/tmp/scratch.json")).toBe(false);
  });

  it("does not match the segment as a mere substring of another name", () => {
    expect(isWithinDeclaredWriteSet("/proj/.palantir-mini-backup/x.json")).toBe(false);
  });
});

describe("assertWriteWithinDeclaredSet (NON-BREAKING default)", () => {
  it("returns true and stays silent for an in-set target", () => {
    const spy = mock(() => {});
    const orig = console.error;
    console.error = spy;
    try {
      expect(assertWriteWithinDeclaredSet("/proj/.palantir-mini/x.json")).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      console.error = orig;
    }
  });

  it("warns (does NOT throw) for an out-of-set target by default", () => {
    const spy = mock(() => {});
    const orig = console.error;
    console.error = spy;
    try {
      expect(assertWriteWithinDeclaredSet("/proj/src/out.json")).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      console.error = orig;
    }
  });

  it("throws for an out-of-set target only under strict mode", () => {
    process.env[STRICT] = "1";
    expect(() => assertWriteWithinDeclaredSet("/proj/src/out.json")).toThrow(
      /governed write-set violation/,
    );
  });
});

describe("actual governed writes are a subset of the declared set", () => {
  it("atomicWriteJsonSync writes inside .palantir-mini under strict mode", () => {
    process.env[STRICT] = "1";
    const root = tmpProject();
    const target = path.join(root, ".palantir-mini", "issues", "known-issues.json");
    expect(() => atomicWriteJsonSync(target, { ok: true })).not.toThrow();
    expect(JSON.parse(fs.readFileSync(target, "utf8"))).toEqual({ ok: true });
  });

  it("atomicWriteJsonSync rejects an out-of-set target under strict mode", () => {
    process.env[STRICT] = "1";
    const root = tmpProject();
    const target = path.join(root, "src", "leak.json");
    expect(() => atomicWriteJsonSync(target, { ok: true })).toThrow(
      /governed write-set violation/,
    );
    expect(fs.existsSync(target)).toBe(false);
  });

  it("appendEventAtomic (ActionType-gated write-back) writes inside .palantir-mini under strict mode", async () => {
    process.env[STRICT] = "1";
    const root = tmpProject();
    const eventsPath = path.join(root, ".palantir-mini", "session", "events.jsonl");
    const envelope = {
      eventId: "evt-test-1",
      type: "edit_committed",
      when: new Date().toISOString(),
      payload: {},
    } as unknown as Parameters<typeof appendEventAtomic>[1];
    await expect(appendEventAtomic(eventsPath, envelope)).resolves.toBe(1);
    expect(fs.existsSync(eventsPath)).toBe(true);
  });

  it("appendEventAtomic rejects an out-of-set events path under strict mode", async () => {
    process.env[STRICT] = "1";
    const root = tmpProject();
    const eventsPath = path.join(root, "logs", "events.jsonl");
    const envelope = {
      eventId: "evt-test-2",
      type: "edit_committed",
      when: new Date().toISOString(),
      payload: {},
    } as unknown as Parameters<typeof appendEventAtomic>[1];
    await expect(appendEventAtomic(eventsPath, envelope)).rejects.toThrow(
      /governed write-set violation/,
    );
  });
});
