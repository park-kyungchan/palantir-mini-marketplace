import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { assessOntologyEngineeringWorkflowHook } from "../../hooks/gates/ontology-engineering-workflow-enforcement-gate.impl";
import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  type OntologyEngineeringWorkflowState,
  writeOntologyEngineeringWorkflowState,
} from "../../lib/ontology-engineering-workflow";

let projectRoot = "";

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-oe-workflow-hook-"));
  fs.mkdirSync(path.join(projectRoot, ".palantir-mini"), { recursive: true });
});

afterEach(() => {
  if (projectRoot.length > 0) {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

function legacyToolName(): string {
  return ["request", "user", "input"].join("_");
}

function legacyScanPattern(): string {
  return [
    ["Ask", "User", "Question"].join(""),
    ["request", "user", "input"].join("_"),
    ["manual", "review", "card"].join("-"),
    ["ask", "UserQuestionQueue"].join(""),
    ["ask", "UserQuestionPayload"].join(""),
    ["runtime", "QuestionUi"].join(""),
  ].join("|");
}

function writeWorkflowState(mutationAuthorized: boolean): void {
  const now = "2026-05-22T00:00:00.000Z";
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: "ontology-engineering-workflow:test",
    projectRoot,
    fdeSessionId: "fde-test",
    fdeSessionRef: "fde-ontology-engineering://session/fde-test",
    semanticIntentContractRef: mutationAuthorized
      ? "semantic-intent:approved:test"
      : "semantic-intent:draft:test",
    semanticIntentContractStatus: mutationAuthorized ? "approved" : "draft",
    digitalTwinChangeContractRef: mutationAuthorized
      ? "digital-twin-change:approved:test"
      : "digital-twin-change:draft:test",
    digitalTwinChangeContractStatus: mutationAuthorized ? "approved" : "draft",
    phase: mutationAuthorized ? "mutation-authorized" : "semantic-contract-drafted",
    allowedNextActions: ["status"],
    mutationAuthorized,
    sourceRefs: ["fde-ontology-engineering://session/fde-test"],
    turnDecisionSpecs: [],
    userDecisionRecords: [],
    decisionLedgerAuditFindings: [],
    createdAt: now,
    updatedAt: now,
  };
  writeOntologyEngineeringWorkflowState(state);
}

describe("ontology-engineering workflow enforcement hook", () => {
  test("advises (does not block) runtime-native question UI tools", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: legacyToolName(),
      tool_input: { prompt: "Choose a workflow decision." },
    });

    // Advisory (suggest-only): detection still fires but the verdict CONTINUES.
    expect(result.decision).toBe("continue");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(result.message).toContain("ADVISORY");
    expect(result.additionalContext).toContain("Advisory");
    expect(result.additionalContext).toContain("turn-card decision queue");
  });

  test("allows read-only validation scans that mention forbidden legacy tokens", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: {
        command: `rg -n "${legacyScanPattern()}" .`,
      },
    });

    expect(result.decision).toBe("continue");
  });

  test("blocks Ontology Engineering SIC authoring before FDE workflow provenance exists", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "mcp__palantir_mini__pm_semantic_intent_gate",
      tool_input: {
        project: projectRoot,
        rawIntent: "Start Ontology Engineering WorkflowContract SIC and DTC for object types.",
      },
    });

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("FDE workflow provenance");
  });

  test("allows workflow start before FDE workflow provenance exists", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "mcp__palantir_mini__pm_ontology_engineering_workflow",
      tool_input: {
        project: projectRoot,
        action: "start",
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toContain("palantir-mini user requirement prompt response requirements");
    expect(result.additionalContext).toContain("현재 workflow phase");
    expect(result.additionalContext).toContain("선택된 palantir-mini workflow 또는 workflow gap");
    expect(result.additionalContext).toContain("Claude hooks");
  });

  test("blocks protected workflow-surface mutation until workflow state is mutation-authorized", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(
          projectRoot,
          ".claude/plugins/palantir-mini/hooks/hooks.json",
        ),
      },
    });

    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("provenance deny injects the Altitude-1 runbook BROWSE pointer (Stage 01)", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "mcp__palantir_mini__pm_semantic_intent_gate",
      tool_input: {
        project: projectRoot,
        rawIntent: "Start Ontology Engineering WorkflowContract SIC and DTC for object types.",
      },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      "Runbook: docs/altitude1-runtime-guide/BROWSE.md",
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain("Stage 01 (fde-provenance)");
  });

  test("mutation-unauthorized deny injects the Altitude-1 runbook BROWSE pointer (Stage 05/06)", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(
          projectRoot,
          ".claude/plugins/palantir-mini/hooks/hooks.json",
        ),
      },
    });

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      "Runbook: docs/altitude1-runtime-guide/BROWSE.md",
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain("Stage 05 (dtc-fill)");
    expect(result.hookSpecificOutput?.additionalContext).toContain("Stage 06 (envelope-advance)");
  });

  test("allows protected workflow-surface mutation after workflow state is mutation-authorized", () => {
    writeWorkflowState(true);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(
          projectRoot,
          ".claude/plugins/palantir-mini/hooks/hooks.json",
        ),
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.additionalContext).toContain("mutationAuthorized=true");
    expect(result.additionalContext).toContain("palantir-mini user requirement prompt response requirements");
    expect(result.additionalContext).toContain("Codex");
  });

  // --- CTX-iii: write-target resolver (decide on RESOLVED target, not VOCABULARY) ---

  test("RELAXATION: a memory-note Write whose content describes an ontology re-bind PASSES", () => {
    // The 2026-06-21 recurrence payload: content body mentions protected surfaces +
    // /ontology/ segment + SIC/DTC, but the resolved write target is a plain .md.
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: "~/.claude/projects/x/memory/altitude2-rebind.md",
        content:
          "Describes a re-bind touching palantir-mini/lib/ontology-engineering-workflow/ and a " +
          "/ontology/object-type/foo.ts path; SemanticIntentContract DigitalTwinChangeContract palantir-mini/hooks/x.ts.",
      },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: an out-of-tree workspace doc Write PASSES", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, "_workspace/run/plan.md"),
        content: "ontology engineering plan mentioning palantir-mini/hooks/ and semanticintentcontract",
      },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: read-only Bash mentioning a protected path PASSES", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: "grep -rn 'palantir-mini/hooks' ." },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: OE-marker in content with a plain .md target does NOT block", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, "plain.md"),
        content: "ontology engineering semanticintentcontract digitaltwinchangecontract",
      },
    });
    expect(result.decision).toBe("continue");
  });

  test("UNDER-BLOCK: genuine protected pm-source Write still hits provenance deny (no FDE)", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/x.ts"),
        content: "anything",
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("FDE workflow provenance");
  });

  test("UNDER-BLOCK: relative protected-surface Edit resolves abs and still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: path.join(projectRoot, ".claude/plugins/palantir-mini"),
      tool_name: "Edit",
      tool_input: { file_path: "skills/z/SKILL.md" },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: MultiEdit targeting protected lib paths still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "MultiEdit",
      tool_input: {
        edits: [
          { file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/lib/lead-intent/a.ts") },
          { file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/lib/fde-ontology-engineering/b.ts") },
        ],
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: NotebookEdit on a protected lib path still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "NotebookEdit",
      tool_input: {
        notebook_path: path.join(projectRoot, ".claude/plugins/palantir-mini/lib/context-engineering/c.ipynb"),
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: project /object-type/ path-class write (no OE marker) still blocks", () => {
    writeWorkflowState(false);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(projectRoot, "projects/foo/ontology/object-type/bar.ts"),
        content: "no marker here at all",
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  // --- 7.22.3 follow-up: resolved Bash write-target (close the protected-surface
  // Bash write vector; keep the over-block relaxation). ---

  test("UNDER-BLOCK: Bash redirect write into protected hooks/ (no provenance) hits provenance deny", () => {
    const target = path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/foo.ts");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `echo x > ${target}` },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("FDE workflow provenance");
  });

  test("UNDER-BLOCK: Bash `sed -i` on a protected skill still blocks (mutation-unauthorized)", () => {
    writeWorkflowState(false);
    const target = path.join(projectRoot, ".claude/plugins/palantir-mini/skills/foo/SKILL.md");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `sed -i 's/a/b/g' ${target}` },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: Bash `tee` into protected lib/lead-intent still blocks", () => {
    writeWorkflowState(false);
    const target = path.join(projectRoot, ".claude/plugins/palantir-mini/lib/lead-intent/x.ts");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `echo x | tee ${target}` },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: Bash `mv` destination into protected hooks/ still blocks", () => {
    writeWorkflowState(false);
    const target = path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/x.ts");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `mv /tmp/tmpfile ${target}` },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: Bash `cp` destination into protected hooks/ still blocks", () => {
    writeWorkflowState(false);
    const target = path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/x.ts");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `cp /tmp/a ${target}` },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("UNDER-BLOCK: Bash `dd of=` into protected hooks/ still blocks", () => {
    writeWorkflowState(false);
    const target = path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/x.ts");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `dd if=/dev/zero of=${target}` },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("RELAXATION: read-only Bash `grep` mentioning a protected path PASSES (over-block stays gone)", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: "grep -rn palantir-mini/hooks ." },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: read-only Bash `cat` of a protected path PASSES", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: "cat palantir-mini/hooks/foo.ts" },
    });
    expect(result.decision).toBe("continue");
  });

  test("RELAXATION: Bash write whose target is NOT protected (mention in source) PASSES", () => {
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `echo "see palantir-mini/hooks" > /tmp/note.txt` },
    });
    expect(result.decision).toBe("continue");
  });

  test("UNDER-BLOCK: project /object-type/ path-class via Bash redirect (no marker) still blocks", () => {
    writeWorkflowState(false);
    const target = path.join(projectRoot, "projects/foo/ontology/object-type/bar.ts");
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Bash",
      tool_input: { command: `echo x > ${target}` },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  // --- bd-015 variant-(i): pm-self-engineering exemption (non-ontology pm-source
  // edit, with an EXPLICIT per-session structured opt-in). The exemption lives in
  // the protectedSurfaceMutation && !mutationAuthorized branch, so each test gives
  // FDE provenance (writeWorkflowState(false) sets fdeSessionId/Ref) to clear the
  // provenance deny first. The pm-plugin ROOT is content-anchored on a
  // .ssot-authority.json whose kind === "palantir-mini-workflow-authority". ---

  const PM_SELF_ENGINEERING_SESSION = "sess-pm-self-eng";

  /**
   * Build a pm-plugin-source ROOT: a dir carrying a `.ssot-authority.json` with
   * kind "palantir-mini-workflow-authority". When `withOptIn`, also drop the
   * per-session opt-in marker under <pmRoot>/.palantir-mini/session/
   * pm-self-engineering-optin/<sessionId>.json. Returns the absolute pmRoot.
   */
  function makePmRoot(
    opts: { withOptIn: boolean; sessionId?: string; authorityKind?: string; authorityRaw?: string } = { withOptIn: true },
  ): string {
    const pmRoot = path.join(projectRoot, "marketplace/plugins/palantir-mini");
    fs.mkdirSync(pmRoot, { recursive: true });
    const authorityPath = path.join(pmRoot, ".ssot-authority.json");
    if (opts.authorityRaw !== undefined) {
      fs.writeFileSync(authorityPath, opts.authorityRaw);
    } else {
      fs.writeFileSync(
        authorityPath,
        JSON.stringify({ kind: opts.authorityKind ?? "palantir-mini-workflow-authority", version: "1.7.0" }),
      );
    }
    if (opts.withOptIn) {
      const sid = opts.sessionId ?? PM_SELF_ENGINEERING_SESSION;
      const optinDir = path.join(pmRoot, ".palantir-mini/session/pm-self-engineering-optin");
      fs.mkdirSync(optinDir, { recursive: true });
      fs.writeFileSync(
        path.join(optinDir, `${sid}.json`),
        JSON.stringify({ kind: "pm-self-engineering-optin", sessionId: sid, enabledAt: "2026-06-23T00:00:00.000Z", enabledBy: "operator" }),
      );
    }
    return pmRoot;
  }

  function selfEngEdit(filePath: string, sessionId = PM_SELF_ENGINEERING_SESSION) {
    return assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: sessionId,
      tool_name: "Edit",
      tool_input: { file_path: filePath },
    });
  }

  test("EXEMPT T1: Edit hooks/second-brain-fold.ts (non-ontology pm-source, opt-in active) PASSES", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    const result = selfEngEdit(path.join(pmRoot, "hooks/second-brain-fold.ts"));
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("pm-self-engineering exemption");
  });

  test("EXEMPT T2: Edit lib/event-log/read/fold-snapshot.ts PASSES (non-protected pm-source — not blocked)", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    // lib/event-log/ is NOT in PROTECTED_SURFACE_MARKERS and is not an ontology
    // path-class, so the gate never enters the mutation branch — it CONTINUES at the
    // early skip. The exemption is a no-op here; what matters is the edit PASSES.
    const result = selfEngEdit(path.join(pmRoot, "lib/event-log/read/fold-snapshot.ts"));
    expect(result.decision).toBe("continue");
  });

  test("EXEMPT T3: MultiEdit bridge/handlers/emit-event.ts + scripts/log.ts PASSES (non-protected pm-source)", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    // Neither bridge/handlers/emit-event.ts nor scripts/log.ts is a protected
    // surface marker; the call CONTINUES at the early skip (not blocked).
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: PM_SELF_ENGINEERING_SESSION,
      tool_name: "MultiEdit",
      tool_input: {
        edits: [
          { file_path: path.join(pmRoot, "bridge/handlers/emit-event.ts") },
          { file_path: path.join(pmRoot, "scripts/log.ts") },
        ],
      },
    });
    expect(result.decision).toBe("continue");
  });

  test("EXEMPT T4: MultiEdit two non-ontology pm files PASSES", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: PM_SELF_ENGINEERING_SESSION,
      tool_name: "MultiEdit",
      tool_input: {
        edits: [
          { file_path: path.join(pmRoot, "lib/lead-intent/a.ts") },
          { file_path: path.join(pmRoot, "lib/context-engineering/b.ts") },
        ],
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("pm-self-engineering exemption");
  });

  test("EXEMPT T5: Write to hooks/hooks.json (config, not ontology) PASSES", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: PM_SELF_ENGINEERING_SESSION,
      tool_name: "Write",
      tool_input: { file_path: path.join(pmRoot, "hooks/hooks.json"), content: "{}" },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("pm-self-engineering exemption");
  });

  test("BLOCK B1: Edit runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts (/ontology/ class) still BLOCKS", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    const result = selfEngEdit(
      path.join(pmRoot, "runtime-overlay/schemas-snapshot/ontology/self/hook.objecttype.ts"),
    );
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("BLOCK B2: Write under .palantir-mini/<primitive> still BLOCKS", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: PM_SELF_ENGINEERING_SESSION,
      tool_name: "Write",
      tool_input: {
        file_path: path.join(pmRoot, ".palantir-mini/object-type/foo.ts"),
        content: "x",
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("BLOCK B3: other-project ontology path while cwd=marketplace still BLOCKS", () => {
    writeWorkflowState(false);
    makePmRoot({ withOptIn: true });
    // Target is an external project's ontology class, NOT under the pm root.
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: PM_SELF_ENGINEERING_SESSION,
      tool_name: "Edit",
      tool_input: { file_path: path.join(projectRoot, "projects/other/ontology/object-type/x.ts") },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("BLOCK B4: MultiEdit mixing a pm file + an external ontology file still BLOCKS", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true });
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: PM_SELF_ENGINEERING_SESSION,
      tool_name: "MultiEdit",
      tool_input: {
        edits: [
          { file_path: path.join(pmRoot, "hooks/second-brain-fold.ts") },
          { file_path: path.join(projectRoot, "projects/other/ontology/object-type/x.ts") },
        ],
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("BLOCK B5: path containing 'palantir-mini' with NO .ssot-authority.json ancestor still BLOCKS", () => {
    writeWorkflowState(false);
    // A bare 'palantir-mini' substring path with no authority file: the
    // content-anchored walk finds no pm root ⇒ no exemption. It also trips the
    // PROTECTED_SURFACE_MARKERS substring, so it stays in the mutation deny.
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      session_id: PM_SELF_ENGINEERING_SESSION,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/x.ts"),
      },
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("BLOCK B6 regression: an authorized (mutationAuthorized true) ontology edit still PASSES via the normal path", () => {
    writeWorkflowState(true);
    const result = assessOntologyEngineeringWorkflowHook({
      cwd: projectRoot,
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(projectRoot, ".claude/plugins/palantir-mini/hooks/hooks.json"),
      },
    });
    expect(result.decision).toBe("continue");
    // The normal mutationAuthorized path — NOT the self-engineering exemption.
    expect(result.additionalContext).toContain("mutationAuthorized=true");
    expect(result.message).not.toContain("pm-self-engineering exemption");
  });

  test("OPT-IN REQUIRED: opt-in ABSENT ⇒ Edit hooks/second-brain-fold.ts DENIES", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: false });
    const result = selfEngEdit(path.join(pmRoot, "hooks/second-brain-fold.ts"));
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });

  test("T-FC fail-closed: malformed .ssot-authority.json ⇒ DENY (no exemption)", () => {
    writeWorkflowState(false);
    const pmRoot = makePmRoot({ withOptIn: true, authorityRaw: "{ this is not valid json" });
    const result = selfEngEdit(path.join(pmRoot, "hooks/second-brain-fold.ts"));
    expect(result.decision).toBe("block");
    expect(result.reason).toContain("mutation requires approved SIC and DTC");
  });
});
