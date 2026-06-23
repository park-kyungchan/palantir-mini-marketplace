// palantir-mini v3.7.0 — get_ontology handler tests (C.D.4)
// Coverage: validation, missing events.jsonl returns empty snapshot,
// folded snapshot, atSequence filter, domain default = "all".

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import getOntology from "../../../bridge/handlers/get-ontology";

const tmpDirs: string[] = [];

function makeTmpProject(eventLines: string[] = []): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "pm-get-ontology-"));
  tmpDirs.push(project);
  const sessionDir = path.join(project, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  if (eventLines.length > 0) {
    fs.writeFileSync(path.join(sessionDir, "events.jsonl"), eventLines.join("\n") + "\n");
  }
  return project;
}

function makeEvent(seq: number, type: string, payload: Record<string, unknown> = {}): string {
  return JSON.stringify({
    eventId: `evt-${seq}`,
    sequence: seq,
    type,
    when: new Date(Date.now() - (1000 - seq) * 1000).toISOString(),
    payload,
    timestamp: new Date(Date.now() - (1000 - seq) * 1000).toISOString(),
    atopWhich: { commitSha: "abc" },
    throughWhich: { sessionId: "test-session", toolName: "test", cwd: "test" },
    byWhom: { agentName: "test", identity: "claude-code" },
    decision: {
      atopWhich: { commitSha: "abc" },
      throughWhich: { surface: "test", tool: "test" },
      byWhom: { agent: "test", identity: "claude-code" },
      withWhat: { reasoning: "test event" },
    },
  });
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("getOntology", () => {
  test("validation — missing project throws", async () => {
    await expect(getOntology({})).rejects.toThrow(/project.*required/);
  });

  test("validation — non-string project throws", async () => {
    await expect(getOntology({ project: 42 })).rejects.toThrow(/project.*required/);
  });

  test("project with no events.jsonl returns empty snapshot", async () => {
    const project = makeTmpProject();
    const result = await getOntology({ project });
    expect(result.project).toBe(project);
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot.lastSequence).toBe(0);
    expect(typeof result.generatedAt).toBe("string");
  });

  test("project with events folds to snapshot", async () => {
    const project = makeTmpProject([
      makeEvent(1, "session_started"),
      makeEvent(2, "edit_committed", { file: "x.ts" }),
      makeEvent(3, "edit_committed", { file: "y.ts" }),
    ]);
    const result = await getOntology({ project });
    expect(result.snapshot.lastSequence).toBe(3);
  });

  test("atSequence filter limits fold to events <= N", async () => {
    const project = makeTmpProject([
      makeEvent(1, "session_started"),
      makeEvent(2, "edit_committed", { file: "x.ts" }),
      makeEvent(3, "edit_committed", { file: "y.ts" }),
    ]);
    const result = await getOntology({ project, atSequence: 2 });
    expect(result.atSequence).toBe(2);
    expect(result.snapshot.lastSequence).toBe(2);
  });

  test("domain defaults to 'all'", async () => {
    const project = makeTmpProject();
    const result = await getOntology({ project });
    expect(result.domain).toBe("all");
  });

  test("domain override is preserved on result", async () => {
    const project = makeTmpProject();
    const result = await getOntology({ project, domain: "data" });
    expect(result.domain).toBe("data");
  });

  // ── OUT-2 — domain scope is REAL (narrows buckets) + flat counts ──────────
  describe("OUT-2 — domain scope + flat counts", () => {
    // One edit_committed row registering one of each kind, mirroring the
    // applyRegister* edit shapes (object rows tagged primitiveKind; link row).
    function seedAllKinds(): string {
      return makeTmpProject([
        makeEvent(1, "edit_committed", {
          actionTypeRid: "pm.self.ontology/action-type/commit-edits",
          appliedEdits: [
            { kind: "object", rid: "rid:obj/a", properties: { primitiveKind: "ObjectType", plainName: "A" } },
            { kind: "object", rid: "rid:prop/p", properties: { primitiveKind: "Property", plainName: "P" } },
            { kind: "object", rid: "rid:act/x", properties: { primitiveKind: "ActionType", plainName: "X" } },
            { kind: "object", rid: "rid:fn/f", properties: { primitiveKind: "Function", plainName: "F" } },
            { kind: "object", rid: "rid:role/r", properties: { primitiveKind: "Role", plainName: "R" } },
            { kind: "link", rid: "rid:link/l", srcRid: "rid:obj/a", dstRid: "rid:obj/a", linkName: "selfRef" },
          ],
          submissionCriteriaPassed: [],
        }),
      ]);
    }

    test("domain='all' retains every bucket", async () => {
      const project = seedAllKinds();
      const reg = (await getOntology({ project, domain: "all" })).snapshot.registeredPrimitives!;
      expect(reg.objectTypes.length).toBe(1);
      expect(reg.properties.length).toBe(1);
      expect(reg.actionTypes.length).toBe(1);
      expect(reg.functions.length).toBe(1);
      expect(reg.roles.length).toBe(1);
      expect(reg.linkTypes.length).toBe(1);
    });

    test("domain='data' keeps objectTypes/linkTypes/properties and empties the rest", async () => {
      const project = seedAllKinds();
      const reg = (await getOntology({ project, domain: "data" })).snapshot.registeredPrimitives!;
      expect(reg.objectTypes.length).toBe(1);
      expect(reg.linkTypes.length).toBe(1);
      expect(reg.properties.length).toBe(1);
      // out-of-DATA-axis buckets are scoped out
      expect(reg.actionTypes.length).toBe(0);
      expect(reg.functions.length).toBe(0);
      expect(reg.roles.length).toBe(0);
    });

    test("domain='logic' keeps only functions; 'action' only actionTypes; 'security' only roles", async () => {
      const project = seedAllKinds();
      const logic = (await getOntology({ project, domain: "logic" })).snapshot.registeredPrimitives!;
      expect(logic.functions.length).toBe(1);
      expect(logic.objectTypes.length).toBe(0);

      const action = (await getOntology({ project, domain: "action" })).snapshot.registeredPrimitives!;
      expect(action.actionTypes.length).toBe(1);
      expect(action.functions.length).toBe(0);

      const security = (await getOntology({ project, domain: "security" })).snapshot.registeredPrimitives!;
      expect(security.roles.length).toBe(1);
      expect(security.objectTypes.length).toBe(0);
    });

    test("kind param narrows to a single bucket within the domain scope", async () => {
      const project = seedAllKinds();
      const reg = (await getOntology({ project, domain: "all", kind: "functions" })).snapshot.registeredPrimitives!;
      expect(reg.functions.length).toBe(1);
      expect(reg.objectTypes.length).toBe(0);
      expect(reg.actionTypes.length).toBe(0);
    });

    test("flat counts object reflects the scoped buckets + totals (scalars, not nested)", async () => {
      const project = seedAllKinds();
      const all = await getOntology({ project, domain: "all" });
      expect(all.counts.objectTypes).toBe(1);
      expect(all.counts.functions).toBe(1);
      expect(all.counts.roles).toBe(1);
      expect(all.counts.totalEvents).toBe(1);
      expect(all.counts.lastSequence).toBe(1);
      // every count is a scalar number (surfaces inline on a shallow summary)
      for (const v of Object.values(all.counts)) expect(typeof v).toBe("number");

      const data = await getOntology({ project, domain: "data" });
      expect(data.counts.functions).toBe(0);
      expect(data.counts.objectTypes).toBe(1);
      expect(data.counts.linkTypes).toBe(1);
      expect(data.counts.properties).toBe(1);
    });
  });
});
