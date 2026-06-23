// palantir-mini — OE-9 regression: composeSchemaPrimitives binds to the typed
// registered graph (snapshot.registeredPrimitives), not a filesystem scan.
//
// OE-9 makes the project's REGISTERED ontology primitives (folded from its
// events.jsonl into snapshot.registeredPrimitives) the PRIMARY source for the
// retrieval-context schemaPrimitives sub-field. The fs.readdirSync scan over the
// schema primitive source files is the FALLBACK, used only when nothing is
// registered for the project yet. This pins BOTH lanes.
//
// Fixtures live entirely under os.tmpdir() (rule 25 — no tracked mutation).

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { composeRetrievalContext } from "../../../lib/ontology-context/retrieval-context";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

/** Seed a project whose events.jsonl registers an ObjectType (named "Submission")
 *  and a LinkType ("belongsToRubric") via the register→commit loop. */
function seedRegistered(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-oe9-retrieval-"));
  tmpDirs.push(root);
  const sessionDir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });

  const objRid = "rid:pm:object/submission";
  const linkRid = "rid:pm:link/belongs-to-rubric";

  const row = JSON.stringify({
    eventId: "evt-1",
    sequence: 1,
    type: "edit_committed",
    when: new Date().toISOString(),
    payload: {
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      appliedEdits: [
        { kind: "object", rid: objRid, properties: { primitiveKind: "ObjectType", name: "Submission" } },
        { kind: "link", rid: linkRid, srcRid: objRid, dstRid: objRid, linkName: "belongsToRubric" },
      ],
      submissionCriteriaPassed: [],
    },
    timestamp: new Date().toISOString(),
    atopWhich: { commitSha: "abc" },
    throughWhich: { sessionId: "s", toolName: "t", cwd: "c" },
    byWhom: { agentName: "test", identity: "claude-code" },
    decision: {
      atopWhich: { commitSha: "abc" },
      throughWhich: { surface: "test", tool: "test" },
      byWhom: { agent: "test", identity: "claude-code" },
      withWhat: { reasoning: "seed registered primitives for retrieval-context OE-9" },
    },
  });
  fs.writeFileSync(path.join(sessionDir, "events.jsonl"), row + "\n");
  return root;
}

describe("retrieval-context — OE-9 schemaPrimitives binds to registered graph", () => {
  test("registered primitives project as PRIMARY (source: registered-graph)", async () => {
    const root = seedRegistered();
    const ctx = await composeRetrievalContext(root, {});

    expect(ctx.schemaPrimitives.available).toBe(true);
    expect(ctx.schemaPrimitives.source).toBe("registered-graph");
    // The committed declaration's name + linkName are projected (not file basenames).
    expect(ctx.schemaPrimitives.names).toContain("Submission");
    expect(ctx.schemaPrimitives.names).toContain("belongsToRubric");
  });

  test("unregistered project falls back to the fs scan (source: fs-scan)", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-oe9-empty-"));
    tmpDirs.push(root);
    const ctx = await composeRetrievalContext(root, {});

    expect(ctx.schemaPrimitives.available).toBe(true);
    expect(ctx.schemaPrimitives.source).toBe("fs-scan");
    // The fs-scan lane still returns the schema primitive source basenames.
    expect((ctx.schemaPrimitives.count ?? 0)).toBeGreaterThan(0);
  });
});
