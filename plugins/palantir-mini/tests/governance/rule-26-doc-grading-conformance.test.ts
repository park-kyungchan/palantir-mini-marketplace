// Test: rule-26 doc↔code grading-taxonomy conformance (Stage 0 drift guard).
//
// The rule-26 body once claimed "dropped T0–T4 detailed scoring / multi-vendor
// consensus (v2.0.0)" while autoGradeEnvelope (the LIVE grader) never dropped any
// of it — every envelope is still graded T0..T4 on field presence. This is the
// test that would have CAUGHT that drift: it pins the body's tier→axis mapping
// (T1=A+E, T2=+B, T3=+C, T4=+D2) to the actual autoGradeEnvelope branch order,
// and asserts the stale "dropped" claim never returns.
//
// Authority: rule 26 §Grading; autoGradeEnvelope() in bridge/handlers/emit-event.ts
// (code is authoritative); body served by pm_rule_query from OVERLAY_RULES_DIR.

import { test, expect, describe } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { autoGradeEnvelope } from "../../bridge/handlers/emit-event";
import { OVERLAY_RULES_DIR } from "../../lib/runtime-overlay/resolve-rule";
import type { EventEnvelope } from "../../lib/event-log/types";

// The plugin-resident overlay body is the SSoT that pm_rule_query({byId:26}) serves.
const RULE_26_BODY = fs.readFileSync(
  path.join(OVERLAY_RULES_DIR, "26-valuable-data-standard.md"),
  "utf8",
);

// ─── Minimal envelope builders that climb the grade ladder one axis at a time ──
// Each adds EXACTLY the axis the body claims gates the next tier, so the asserted
// grade pins the body's tier→axis mapping to autoGradeEnvelope's branch order.

function baseFiveDim(): Omit<EventEnvelope, "sequence"> {
  return {
    eventId: "evt-rule26-doc-conformance" as never,
    type: "validation_phase_completed",
    when: new Date().toISOString() as never,
    atopWhich: "abc123" as never,
    throughWhich: { sessionId: "sess-1" as never, toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "test-agent" },
    // The `validation_phase_completed` discriminant requires its `payload`; this
    // minimal payload carries NONE of the grader's signal fields (memoryLayers,
    // hypothesis/lineageRef, refinementTarget/failureCategory, kLlmConsensus), so
    // the climbed grade ladder below is unaffected.
    payload: { phase: "design", passed: true },
  } as Omit<EventEnvelope, "sequence">;
}

function withAxisE(e: Omit<EventEnvelope, "sequence">): Omit<EventEnvelope, "sequence"> {
  return { ...e, withWhat: { ...(e.withWhat ?? {}), memoryLayers: ["procedural"] } };
}
function withAxisB(e: Omit<EventEnvelope, "sequence">): Omit<EventEnvelope, "sequence"> {
  return { ...e, withWhat: { ...(e.withWhat ?? {}), hypothesis: "B-axis verifiability signal" } };
}
function withAxisC(e: Omit<EventEnvelope, "sequence">): Omit<EventEnvelope, "sequence"> {
  return {
    ...e,
    withWhat: {
      ...(e.withWhat ?? {}),
      refinementTarget: {
        kind: "other",
        filePathOrRid: "x",
        description: "C-axis refinement signal",
        confidenceLevel: "high",
      },
    },
  } as Omit<EventEnvelope, "sequence">;
}
function withAxisD2(e: Omit<EventEnvelope, "sequence">): Omit<EventEnvelope, "sequence"> {
  return { ...e, payload: { ...((e as { payload?: object }).payload ?? {}), kLlmConsensus: "dual-vendor-canonical" } } as Omit<EventEnvelope, "sequence">;
}

describe("rule-26 grading: LIVE autoGradeEnvelope branch order (code is authoritative)", () => {
  test("T0 — 5-dim incomplete is rejected", () => {
    const { byWhom, ...incomplete } = baseFiveDim();
    expect(autoGradeEnvelope(incomplete as Omit<EventEnvelope, "sequence">)).toBe("T0");
  });

  test("T1 — A axis full + E axis (memoryLayers)", () => {
    expect(autoGradeEnvelope(baseFiveDim())).toBe("T1"); // 5-dim but no E → T1 ceiling
    expect(autoGradeEnvelope(withAxisE(baseFiveDim()))).toBe("T1");
  });

  test("T2 — T1 + B axis (hypothesis/lineageRef)", () => {
    expect(autoGradeEnvelope(withAxisB(withAxisE(baseFiveDim())))).toBe("T2");
  });

  test("T3 — T2 + C axis (refinementTarget/failureCategory)", () => {
    expect(autoGradeEnvelope(withAxisC(withAxisB(withAxisE(baseFiveDim()))))).toBe("T3");
  });

  test("T4 — T3 + D2 (kLlmConsensus multi-vendor consensus)", () => {
    expect(autoGradeEnvelope(withAxisD2(withAxisC(withAxisB(withAxisE(baseFiveDim())))))).toBe("T4");
  });
});

describe("rule-26 doc↔code conformance: body documents the LIVE taxonomy", () => {
  test("body is version 2.1.0 (drift reconciliation)", () => {
    expect(RULE_26_BODY).toMatch(/^version:\s*2\.1\.0\s*$/m);
  });

  test("body documents each tier with the gating axis matching autoGradeEnvelope", () => {
    // T0 reject; T1 = A+E; T2 = +B; T3 = +C; T4 = +D2 — the branch order in code.
    // Match within each table ROW (a `**Tn** | gate | routing` line) so the gating
    // axis named in the gate cell is bound to its tier. `[^\n]` (not `[^|]`) lets
    // the match cross the cell-divider pipe to reach the axis token.
    const body = RULE_26_BODY.replace(/[ \t]+/g, " ");
    expect(body).toMatch(/\*\*T0\*\*[^\n]*5-dim/i);
    expect(body).toMatch(/\*\*T1\*\*[^\n]*E\*?\*? axis/i);
    expect(body).toMatch(/\*\*T2\*\*[^\n]*B\*?\*? axis/i);
    expect(body).toMatch(/\*\*T3\*\*[^\n]*C\*?\*? axis/i);
    expect(body).toMatch(/\*\*T4\*\*[^\n]*D2/i);
    // Tier rows appear in ascending order in the body.
    const order = ["**T0**", "**T1**", "**T2**", "**T3**", "**T4**"].map((t) =>
      RULE_26_BODY.indexOf(t),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]!);
  });

  test("the stale v2.0.0 'dropped detailed scoring / multi-vendor consensus' claim is GONE from active doctrine", () => {
    // The exact drift this test exists to prevent: the ACTIVE body must NOT claim
    // the T0–T4 taxonomy or multi-vendor consensus was dropped (code never dropped
    // it). The §Version history legitimately QUOTES the old claim to refute it, so
    // the drift guard scopes to the doctrine above the version-history section.
    const versionHistoryIdx = RULE_26_BODY.search(/##\s*§Version history/i);
    expect(versionHistoryIdx).toBeGreaterThan(0);
    const activeDoctrine = RULE_26_BODY.slice(0, versionHistoryIdx);
    expect(activeDoctrine).not.toMatch(/dropped[^.]*T0[–-]T4[^.]*detailed scoring/i);
    expect(activeDoctrine).not.toMatch(/dropped[^.]*multi-vendor consensus/i);
    expect(activeDoctrine).not.toMatch(/Dropped for solo-dev/i);
  });

  test("T4 D2 multi-vendor ceiling is documented as structurally unreachable (single-vendor) but gated-but-correct", () => {
    expect(RULE_26_BODY).toMatch(/single-vendor/i);
    expect(RULE_26_BODY).toMatch(/structurally unreachable/i);
    expect(RULE_26_BODY).toMatch(/promoteT3ToT4/);
  });

  test("rules-bodies slim stub is version-locked to 2.1.0 (lockstep)", () => {
    // The external slim stub points at this overlay body; both must be 2.1.0.
    const stubPath = path.join(
      process.env.HOME ?? "/home/palantirkc",
      ".claude/rules-bodies/2026-06-14/26-valuable-data-standard.md",
    );
    if (fs.existsSync(stubPath)) {
      const stub = fs.readFileSync(stubPath, "utf8");
      expect(stub).toMatch(/^version:\s*2\.1\.0\s*$/m);
      expect(stub).not.toMatch(/Dropped for solo-dev/i);
    }
  });
});
