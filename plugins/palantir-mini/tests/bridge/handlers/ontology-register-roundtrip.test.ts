// palantir-mini — O-2 register→commit→materialize→read loop-closure test.
//
// PROVES the operative closure: a typed primitive registered via the
// RegisterObjectType (etc.) ActionType → applyEditFunction(...) → OntologyEdit[]
// → commitEdits → edit_committed → READABLE in get_ontology's
// snapshot.registeredPrimitives. (Spec §2.5.)

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Side-effect import is wired into the live bridge path via
// apply-edit-function.ts; import the handlers (NOT the lib directly) so the test
// exercises the same modules the MCP runtime loads.
import applyEditFunctionHandler from "../../../bridge/handlers/apply-edit-function";
import commitEditsHandler from "../../../bridge/handlers/commit-edits";
import getOntology from "../../../bridge/handlers/get-ontology";
import { getEditFunction } from "../../../lib/actions/tier2-function";

const tmpRoots: string[] = [];

function setupRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pm-o2-${label}-`));
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  tmpRoots.push(root);
  return root;
}

afterEach(() => {
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

// The four self-model editFunctionName pointers (self/action-types.ts:69,121,166,211).
const REGISTER_VERBS = [
  "pm.actions.ontology.applyRegisterObjectType",
  "pm.actions.ontology.applyRegisterLinkType",
  "pm.actions.ontology.applyRegisterActionType",
  "pm.actions.ontology.applyRegisterFunction",
] as const;

describe("O-2 — register edit-functions are wired (§2.1 + §2.4)", () => {
  test("applyRegisterObjectType resolves (NOT 'not registered') and returns an OntologyEdit[]", async () => {
    const root = setupRoot("apply");
    const result = await applyEditFunctionHandler({
      project: root,
      functionName: "pm.actions.ontology.applyRegisterObjectType",
      params: { rid: "rid:pm:object/student", declaration: { apiName: "Student" } },
    });
    expect(result.edits.length).toBe(1);
    expect(result.edits[0]?.kind).toBe("object");
    expect(result.edits[0]?.rid).toBe("rid:pm:object/student");
    expect((result.edits[0] as any).properties.primitiveKind).toBe("ObjectType");
  });

  test("parity: all four editFunctionName pointers resolve via getEditFunction", () => {
    // Force the side-effect registration even if no handler ran first in this file.
    require("../../../lib/actions/ontology-register");
    for (const name of REGISTER_VERBS) {
      expect(getEditFunction(name)).not.toBeUndefined();
    }
  });
});

describe("O-2 — full loop closure (§2.5)", () => {
  test("register → commit → materialize → READABLE in get_ontology.snapshot.registeredPrimitives", async () => {
    const root = setupRoot("loop");
    const rid = "rid:pm:object/linear-function";

    // (a) apply: returns OntologyEdit[] without throwing "edit function not registered".
    const applied = await applyEditFunctionHandler({
      project: root,
      functionName: "pm.actions.ontology.applyRegisterObjectType",
      params: { rid, declaration: { apiName: "LinearFunction" } },
    });
    expect(applied.edits.length).toBe(1);

    // (b) commit: COMMITTED + an edit_committed row lands in events.jsonl.
    const committed = await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/register-object-type",
      edits: applied.edits,
    });
    expect(committed.result).toBe("COMMITTED");
    expect(committed.materializedPrimitives).toBe(1);

    // (c) THE loop-closure proof: get_ontology materializes the committed rid.
    const onto = await getOntology({ project: root });
    expect(onto.snapshot.edit_committed).toBeGreaterThanOrEqual(1);
    expect(onto.snapshot.registeredPrimitives?.objectTypes).toContain(rid);
  });

  test("each primitive kind bins into the right registeredPrimitives bucket", async () => {
    const root = setupRoot("kinds");

    const objEdit = (await applyEditFunctionHandler({
      project: root, functionName: "pm.actions.ontology.applyRegisterObjectType",
      params: { rid: "rid:obj/a" },
    })).edits;
    const linkEdit = (await applyEditFunctionHandler({
      project: root, functionName: "pm.actions.ontology.applyRegisterLinkType",
      params: { rid: "rid:link/a", srcRid: "rid:obj/a", dstRid: "rid:obj/b", linkName: "relatesTo" },
    })).edits;
    const actEdit = (await applyEditFunctionHandler({
      project: root, functionName: "pm.actions.ontology.applyRegisterActionType",
      params: { rid: "rid:action/a" },
    })).edits;
    const fnEdit = (await applyEditFunctionHandler({
      project: root, functionName: "pm.actions.ontology.applyRegisterFunction",
      params: { rid: "rid:fn/a" },
    })).edits;

    await commitEditsHandler({
      project: root,
      actionTypeRid: "pm.self.ontology/action-type/register-mixed",
      edits: [...objEdit, ...linkEdit, ...actEdit, ...fnEdit],
    });

    const reg = (await getOntology({ project: root })).snapshot.registeredPrimitives!;
    expect(reg.objectTypes).toContain("rid:obj/a");
    expect(reg.linkTypes).toContain("rid:link/a");
    expect(reg.actionTypes).toContain("rid:action/a");
    expect(reg.functions).toContain("rid:fn/a");
  });
});
