// palantir-mini v7.13.0 — READ-ONLY ontology staleness detector tests
// (dynamic-ontology increment 1; DESIGN §7 NEW signal #1, CRITIQUE Axis 4 steps 1-3).
//
// Validates the detector's mechanism on a SYNTHETIC event log (harness-upstream's project
// ontology is not built yet — P2 pending — so there are no real event-sourced primitives
// to detect on today; see the increment-1 report). The synthetic fixture exercises exactly
// the fold path `detectOntologyStaleness` joins: an `edit_committed` event whose `atopWhich`
// anchors the primitives its `appliedEdits` registered.
//
// The decisive test is the 7.13.0 `runtimeIdentity` case: adding a field to the OUTPUT of
// `pm_plugin_self_check` registers NO new primitive (output shape is registered nowhere —
// it is identity-altitude), so the registered-primitive set + their atopWhich are byte-
// identical before/after the change → ZERO new staleness on any registered primitive.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { appendEventAtomic } from "../../lib/event-log/append";
import type { EventEnvelope, OntologyEdit } from "../../lib/event-log/types";
import { registerAcceptedCandidates } from "../../lib/ontology-engineering-workflow/register-accepted";
import type { FDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/types";
import { detectOntologyStaleness } from "../../lib/event-log/ontology-staleness";

const HEAD = "head000000000000000000000000000000000000";
const OLD_SHA = "old111111111111111111111111111111111111";

/**
 * Build a `changedSinceAtop` composite key — `atopWhich + NUL + backingRef` — mirroring the
 * detector's per-primitive keying (two primitives sharing a backingRef but elevated atop
 * different SHAs must not collide). Every per-file fixture below commits atop `OLD_SHA`.
 */
function ck(atopWhich: string, backingRef: string): string {
  return atopWhich + String.fromCharCode(0) + backingRef;
}

/** Create a temp project root with a `.palantir-mini/session/events.jsonl` path. */
function tmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-stale-${label}-`));
}
function eventsPathFor(project: string): string {
  return path.join(project, ".palantir-mini", "session", "events.jsonl");
}

/** A committing event registering `edits`, anchored atop a given SHA. */
function makeCommit(eventId: string, atopWhich: string, edits: OntologyEdit[]): Omit<EventEnvelope, "sequence"> {
  return {
    type: "edit_committed",
    eventId: eventId as never,
    when: new Date().toISOString(),
    atopWhich: atopWhich as never,
    throughWhich: { sessionId: "sess-stale" as never, toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "test-agent" },
    payload: {
      actionTypeRid: "pm.actions.ontology.commitEdits",
      appliedEdits: edits,
      submissionCriteriaPassed: ["ok"],
    },
  } as Omit<EventEnvelope, "sequence">;
}

/** An ObjectType register edit (the fold bins on properties.primitiveKind). */
function objectEdit(rid: string, props: Record<string, unknown>): OntologyEdit {
  return { kind: "object", rid, properties: { primitiveKind: "ObjectType", ...props } } as OntologyEdit;
}

describe("detectOntologyStaleness — read-only drift signal #1 (atopWhich vs HEAD)", () => {
  test("a primitive elevated AT HEAD is NOT stale", async () => {
    const project = tmpProject("at-head");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", HEAD, [
      objectEdit("rid.McpTool", { name: "McpTool", primaryKeyProperty: "toolName" }),
    ]));

    const report = detectOntologyStaleness({ project, headSha: HEAD });
    expect(report.inspectedCount).toBe(1);
    expect(report.stale).toHaveLength(0);
    expect(report.comparator).toBe("raw-sha");
    expect(report.noiseWarning).toBeUndefined();
  });

  test("a primitive elevated atop an OLD sha IS flagged (raw-sha) + carries the noise warning", async () => {
    const project = tmpProject("old-sha");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [
      objectEdit("rid.LegacyType", { name: "LegacyType", backingSourceRef: "lib/legacy.ts" }),
    ]));

    const report = detectOntologyStaleness({ project, headSha: HEAD });
    expect(report.inspectedCount).toBe(1);
    expect(report.stale).toHaveLength(1);
    expect(report.stale[0]!.rid).toBe("rid.LegacyType");
    expect(report.stale[0]!.atopWhich).toBe(OLD_SHA);
    expect(report.stale[0]!.comparedAgainst).toBe(HEAD);
    expect(report.stale[0]!.backingSourceRef).toBe("lib/legacy.ts");
    // OPEN #1 honesty: a stale hit MUST carry the noise caveat.
    expect(report.noiseWarning).toBeTruthy();
    expect(report.comparator).toBe("raw-sha");
  });

  test("the latest registration of a rid wins (re-elevation supersedes the old atopWhich)", async () => {
    const project = tmpProject("re-elevate");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [objectEdit("rid.T", { name: "T" })]));
    // Same rid re-committed atop HEAD (a governed re-elevation round-trips the rid).
    await appendEventAtomic(ep, makeCommit("c2", HEAD, [objectEdit("rid.T", { name: "T" })]));

    const report = detectOntologyStaleness({ project, headSha: HEAD });
    expect(report.inspectedCount).toBe(1);
    expect(report.stale).toHaveLength(0); // latest atopWhich (HEAD) wins → not stale
  });

  test("no headSha supplied → primitives are INDETERMINATE, never falsely stale (fail-safe)", async () => {
    const project = tmpProject("indeterminate");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [objectEdit("rid.T", { name: "T" })]));

    const report = detectOntologyStaleness({ project });
    expect(report.comparedAgainst).toBeNull();
    expect(report.stale).toHaveLength(0);
    expect(report.indeterminate).toHaveLength(1);
  });

  test("empty / unbuilt project ontology (no edit_committed) → zero inspected, zero stale", () => {
    // Mirrors harness-upstream TODAY: events.jsonl exists but carries no register-commits.
    const project = tmpProject("unbuilt");
    fs.mkdirSync(path.dirname(eventsPathFor(project)), { recursive: true });
    fs.writeFileSync(eventsPathFor(project), "", "utf8");

    const report = detectOntologyStaleness({ project, headSha: HEAD });
    expect(report.inspectedCount).toBe(0);
    expect(report.stale).toHaveLength(0);
    expect(report.indeterminate).toHaveLength(0);
  });

  // ─── The 7.13.0 runtimeIdentity validation (the decisive falsification test) ───
  test("7.13.0 case: adding runtimeIdentity to pm_plugin_self_check OUTPUT produces ZERO new staleness", async () => {
    // BEFORE 7.13.0: pm's MCP surface is registered as an McpTool ObjectType keyed by
    // toolName, with `pm_plugin_self_check` as an identity-only instance — its OUTPUT
    // SHAPE is registered NOWHERE (G3 §3). We model that registered set, committed AT HEAD.
    const project = tmpProject("v7130");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c-self", HEAD, [
      objectEdit("rid.self.McpTool", { name: "McpTool", primaryKeyProperty: "toolName" }),
    ]));

    const before = detectOntologyStaleness({ project, headSha: HEAD });
    expect(before.inspectedCount).toBe(1);
    expect(before.stale).toHaveLength(0);

    // 7.13.0 adds `runtimeIdentity { packageName, version, pluginRoot, gitSha }` to the
    // OUTPUT of pm_plugin_self_check. Because output shape is registered NOWHERE, this
    // change emits NO new edit_committed event — the registered-primitive set + their
    // atopWhich are UNCHANGED. (We append a NON-registration event to prove unrelated
    // activity does not perturb the detector either.)
    await appendEventAtomic(ep, {
      type: "session_started",
      eventId: "s-after" as never,
      when: new Date().toISOString(),
      atopWhich: HEAD as never,
      throughWhich: { sessionId: "sess-after" as never, toolName: "test", cwd: "/tmp" },
      byWhom: { identity: "test-agent" },
      payload: { model: "claude-opus", effort: "high" },
    } as Omit<EventEnvelope, "sequence">);

    const after = detectOntologyStaleness({ project, headSha: HEAD });
    // ZERO new staleness on ANY registered primitive — the Q-A verdict, mechanized.
    expect(after.inspectedCount).toBe(before.inspectedCount);
    expect(after.stale).toHaveLength(0);
    expect(after.noiseWarning).toBeUndefined();
  });
});

// ─── PER-FILE backing-file staleness calibration (READ-SIDE increment) ─────────
// The git signal is MOCKED by passing `changedSinceAtop` directly to the pure core —
// these tests NEVER touch the live repo / git (deterministic + isolated).

/** An ObjectType register edit carrying evidenceRefs (the derivation source). */
function objectEditEv(rid: string, name: string, evidenceRefs: string[]): OntologyEdit {
  return {
    kind: "object",
    rid,
    properties: { primitiveKind: "ObjectType", name, evidenceRefs },
  } as OntologyEdit;
}

describe("detectOntologyStaleness — backingSourceRef derivation (READ-SIDE)", () => {
  test("(a) no explicit backingSourceRef → derived from first real-path evidenceRefs entry", async () => {
    const project = tmpProject("derive-evref");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [
      objectEditEv("rid.ControlSurface", "ControlSurface", ["ssot/harness/BROWSE.md", "ssot/x.md"]),
    ]));
    // Per-file path keyed by the derived ref proves the derivation flowed through.
    const report = detectOntologyStaleness({
      project,
      changedSinceAtop: { [ck(OLD_SHA, "ssot/harness/BROWSE.md")]: true },
    });
    expect(report.inspectedCount).toBe(1);
    expect(report.stale).toHaveLength(1);
    expect(report.stale[0]!.backingSourceRef).toBe("ssot/harness/BROWSE.md");
  });

  test("(a) explicit backingSourceRef WINS over evidenceRefs[0]", async () => {
    const project = tmpProject("derive-explicit");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [
      { kind: "object", rid: "rid.T", properties: {
        primitiveKind: "ObjectType", name: "T",
        backingSourceRef: "lib/explicit.ts", evidenceRefs: ["ssot/other.md"],
      } } as OntologyEdit,
    ]));
    const report = detectOntologyStaleness({ project, changedSinceAtop: { [ck(OLD_SHA, "lib/explicit.ts")]: false } });
    expect(report.inspectedCount).toBe(1);
    expect(report.stale).toHaveLength(0);
    expect(report.indeterminate).toHaveLength(0); // keyed false → clean, not indeterminate
  });

  test("(a) data:-only evidenceRefs → NO derived backingRef → indeterminate under per-file", async () => {
    const project = tmpProject("derive-dataonly");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [
      objectEditEv("rid.Inline", "Inline", ["data:literal-value", "data:another"]),
    ]));
    const report = detectOntologyStaleness({ project, changedSinceAtop: { [ck(OLD_SHA, "lib/whatever.ts")]: true } });
    expect(report.inspectedCount).toBe(1);
    expect(report.stale).toHaveLength(0);
    expect(report.indeterminate).toHaveLength(1);
    expect(report.indeterminate[0]!.backingSourceRef).toBeUndefined();
    expect(report.comparator).toBe("per-file-sha");
  });
});

describe("detectOntologyStaleness — per-file comparator", () => {
  test("(b) two primitives, different backing files → only the changed one is stale", async () => {
    const project = tmpProject("perfile-two");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [
      objectEditEv("rid.A", "A", ["lib/a.ts"]),
      objectEditEv("rid.B", "B", ["lib/b.ts"]),
    ]));
    const report = detectOntologyStaleness({
      project,
      changedSinceAtop: { [ck(OLD_SHA, "lib/a.ts")]: true, [ck(OLD_SHA, "lib/b.ts")]: false },
    });
    expect(report.inspectedCount).toBe(2);
    expect(report.stale).toHaveLength(1);
    expect(report.stale[0]!.rid).toBe("rid.A");
    expect(report.stale[0]!.backingSourceRef).toBe("lib/a.ts");
    expect(report.indeterminate).toHaveLength(0);
    expect(report.comparator).toBe("per-file-sha");
    expect(report.noiseWarning).toBeTruthy();
    // Honesty: per-file-sha must NOT claim to close OPEN #1.
    expect(report.noiseWarning).toContain("OPEN #1");
  });

  test("(b') composite key disambiguates two primitives sharing a backingRef but elevated atop DIFFERENT SHAs", async () => {
    const project = tmpProject("perfile-composite");
    const ep = eventsPathFor(project);
    // Same backing file (lib/shared.ts), two rids elevated atop different SHAs. Under the OLD
    // backingRef-only keying these collide on ONE entry; the composite key keeps them distinct.
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [objectEditEv("rid.Old", "Old", ["lib/shared.ts"])]));
    await appendEventAtomic(ep, makeCommit("c2", HEAD, [objectEditEv("rid.New", "New", ["lib/shared.ts"])]));
    const report = detectOntologyStaleness({
      project,
      // shared.ts moved in (OLD_SHA, HEAD] but NOT in (HEAD, HEAD] → only rid.Old is stale.
      changedSinceAtop: { [ck(OLD_SHA, "lib/shared.ts")]: true, [ck(HEAD, "lib/shared.ts")]: false },
    });
    expect(report.inspectedCount).toBe(2);
    expect(report.stale).toHaveLength(1);
    expect(report.stale[0]!.rid).toBe("rid.Old");
    expect(report.indeterminate).toHaveLength(0); // both keys present → neither indeterminate
  });

  test("(c) back-compat: NO changedSinceAtop → byte-identical raw-sha behavior", async () => {
    const project = tmpProject("backcompat");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [
      objectEditEv("rid.A", "A", ["lib/a.ts"]),
    ]));
    const report = detectOntologyStaleness({ project, headSha: HEAD });
    expect(report.comparator).toBe("raw-sha");
    expect(report.stale).toHaveLength(1); // OLD_SHA != HEAD → raw-sha stale, unchanged
    expect(report.stale[0]!.rid).toBe("rid.A");
    expect(report.noiseWarning).toContain("raw-sha");
  });

  test("(d) fail-safe: backingRef absent from changedSinceAtop → indeterminate, never stale", async () => {
    const project = tmpProject("failsafe");
    const ep = eventsPathFor(project);
    await appendEventAtomic(ep, makeCommit("c1", OLD_SHA, [
      // Models an absolute / out-of-repo ref the git builder OMITTED from the record.
      objectEditEv("rid.Abs", "Abs", ["/etc/outside-repo.conf"]),
    ]));
    const report = detectOntologyStaleness({ project, changedSinceAtop: {} });
    expect(report.inspectedCount).toBe(1);
    expect(report.stale).toHaveLength(0);
    expect(report.indeterminate).toHaveLength(1);
    expect(report.indeterminate[0]!.rid).toBe("rid.Abs");
    expect(report.comparator).toBe("per-file-sha");
  });
});

describe("registerAcceptedCandidates — backingSourceRef threading (PRESENT-ONLY)", () => {
  // (e) Object/Action/Function/Role/Property declarations carry a backingSourceRef
  //     (explicit ?? evidenceRefs[0]); LinkType has NO declaration channel → none.
  // ENABLED: change #4 (register-accepted.ts) + #6 (types.ts) have landed.
  test("(e) object declaration carries backingSourceRef=evidenceRefs[0]; link does NOT", async () => {
    const session = {
      objectCandidates: [
        { candidateId: "o1", plainName: "Widget", whyItMayMatter: "x", evidenceRefs: ["lib/x.ts"] },
        { candidateId: "o2", plainName: "Gadget", whyItMayMatter: "y", evidenceRefs: ["lib/y.ts"] },
      ],
      linkCandidates: [
        { candidateId: "l1", plainName: "uses", sourceObject: "Widget", targetObject: "Gadget",
          businessMeaning: "z", evidenceRefs: ["lib/z.ts"] },
      ],
    } as unknown as FDEOntologyEngineeringSession;

    const { edits } = await registerAcceptedCandidates({ session, projectRoot: "/tmp/proj-e" });
    const objectEdits = edits.filter((e) => (e as { kind?: string }).kind === "object");
    const linkEdits = edits.filter((e) => (e as { kind?: string }).kind === "link");
    const widget = objectEdits.find(
      (e) => ((e as { properties?: { plainName?: string } }).properties?.plainName) === "Widget",
    ) as { properties?: Record<string, unknown> } | undefined;
    expect(widget?.properties?.backingSourceRef).toBe("lib/x.ts");
    for (const le of linkEdits) {
      expect((le as { properties?: Record<string, unknown> }).properties?.backingSourceRef).toBeUndefined();
    }
  });

  test("(e2) write-side skips a `data:` literal at evidenceRefs[0], picks the first REAL path", async () => {
    // No explicit backingSourceRef; evidenceRefs[0] is a `data:` inline literal the
    // detector's read-side deriveBackingRef would skip → write-side must mirror it and
    // persist evidenceRefs[1] (the first real path), not the `data:` literal.
    const session = {
      objectCandidates: [
        {
          candidateId: "o1",
          plainName: "Widget",
          whyItMayMatter: "x",
          evidenceRefs: ["data:application/json;base64,e30=", "lib/real.ts"],
        },
      ],
    } as unknown as FDEOntologyEngineeringSession;

    const { edits } = await registerAcceptedCandidates({ session, projectRoot: "/tmp/proj-e2" });
    const widget = edits
      .filter((e) => (e as { kind?: string }).kind === "object")
      .find(
        (e) => ((e as { properties?: { plainName?: string } }).properties?.plainName) === "Widget",
      ) as { properties?: Record<string, unknown> } | undefined;
    expect(widget?.properties?.backingSourceRef).toBe("lib/real.ts");
  });
});
