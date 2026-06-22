/**
 * A2 — ActionType commit gate (fail-closed).
 *
 * The design invariant "an ActionType is the SOLE commit gate" requires the
 * `actionTypeRid` on a real commit to resolve to a registered ActionType — either a
 * built-in pm self-ontology verb (genesis must be satisfiable) or a project-registered
 * ActionType folded from prior edit_committed events. A free-text rid is REFUSED with
 * result:"INVALID", errorClass:"unregistered_action_type", and NO edit_committed append.
 * validateOnly and criteria-failure paths are unchanged.
 */
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { commitEdits } from "../../lib/actions/commit";
import { applyRegisterActionType } from "../../lib/actions/ontology-register";
import { COMMIT_EDITS_ACTION_TYPE_RID } from "#schemas/ontology/self/action-types";

let TMP = "";

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-a2-gate-"));
});

afterEach(() => {
  if (TMP) fs.rmSync(TMP, { recursive: true, force: true });
});

function eventLines(): Array<{ type: string; [k: string]: unknown }> {
  const p = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { type: string });
}

describe("A2 ActionType commit gate", () => {
  test("unregistered free-text rid is REFUSED (fail-closed, no append)", async () => {
    const result = await commitEdits({
      project: TMP,
      actionTypeRid: "totally-made-up-rid",
      edits: [{ kind: "object", rid: "obj-x", properties: { name: "x" } }],
      submissionCriteria: [],
    });

    expect(result.result).toBe("INVALID");
    expect(result.committed).toBe(false);
    expect(result.errorClass).toBe("unregistered_action_type");
    expect(result.eventType).toBe("none");

    // No edit_committed (or any) event persisted.
    const events = eventLines();
    expect(events.some((e) => e.type === "edit_committed")).toBe(false);
  });

  test("built-in self-ontology rid PASSES", async () => {
    const result = await commitEdits({
      project: TMP,
      actionTypeRid: COMMIT_EDITS_ACTION_TYPE_RID as unknown as string,
      edits: [{ kind: "object", rid: "obj-y", properties: { name: "y" } }],
      submissionCriteria: [],
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);

    const events = eventLines();
    expect(events.filter((e) => e.type === "edit_committed")).toHaveLength(1);
  });

  test("project-registered ActionType PASSES (resolved via fold)", async () => {
    const PROJECT_RID = "pm.project/action-type/my-verb";

    // Genesis: register the ActionType through a self-ontology verb (commit-edits).
    const registerResult = await commitEdits({
      project: TMP,
      actionTypeRid: COMMIT_EDITS_ACTION_TYPE_RID as unknown as string,
      edits: applyRegisterActionType({ rid: PROJECT_RID, declaration: { plainName: "MyVerb" } }),
      submissionCriteria: [],
    });
    expect(registerResult.result).toBe("COMMITTED");

    // Now commit an ordinary edit THROUGH the freshly-registered project ActionType.
    const result = await commitEdits({
      project: TMP,
      actionTypeRid: PROJECT_RID,
      edits: [{ kind: "object", rid: "obj-z", properties: { name: "z" } }],
      submissionCriteria: [],
    });

    expect(result.result).toBe("COMMITTED");
    expect(result.committed).toBe(true);
  });

  test("validateOnly is NOT gated (dry-run verdict regardless of rid registration)", async () => {
    const result = await commitEdits({
      project: TMP,
      actionTypeRid: "unregistered-x",
      edits: [{ kind: "object", rid: "obj-v", properties: { name: "v" } }],
      submissionCriteria: [],
      validateOnly: true,
    });

    expect(result.result).toBe("VALIDATE_ONLY");
    expect(result.committed).toBe(false);
  });

  test("failed criteria short-circuits BEFORE the gate (criteria first, gate second)", async () => {
    const result = await commitEdits({
      project: TMP,
      actionTypeRid: "unregistered-x",
      edits: [{ kind: "object", rid: "obj-f", properties: { name: "f" } }],
      submissionCriteria: [{ type: "Unevaluable", name: "force", reason: "x" }],
    });

    expect(result.result).toBe("INVALID");
    expect(result.eventType).toBe("submission_criteria_failed");
    expect(result.errorClass).toBeUndefined();
  });
});
