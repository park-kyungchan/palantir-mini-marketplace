import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { decideCodexPalantirMiniActivation } from "../../../lib/codex/palantir-mini-activation-policy";

const tmpDirs: string[] = [];

function makePluginRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-activation-plugin-"));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, ".codex-plugin"), { recursive: true });
  fs.mkdirSync(path.join(root, "hooks"), { recursive: true });
  fs.writeFileSync(path.join(root, ".codex-plugin", "plugin.json"), "{}\n");
  fs.writeFileSync(path.join(root, "hooks", "codex-hooks.json"), "{}\n");
  return root;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("Codex palantir-mini activation policy", () => {
  test("explicit English opt-out is silent and writes no prompt-front-door state", () => {
    const pluginRoot = makePluginRoot();
    const decision = decideCodexPalantirMiniActivation({
      eventName: "UserPromptSubmit",
      policyEventName: "UserPromptSubmit",
      cwd: "/home/palantirkc/palantir-mini-marketplace",
      pluginRoot,
      prompt: "Do not use palantir-mini for this turn. Just do the simple task.",
    });

    expect(decision.mode).toBe("silent-bypass");
    expect(decision.reasonCode).toBe("explicit-plugin-opt-out");
    expect(decision.shouldRunSharedHooks).toBe(false);
    expect(decision.shouldWritePromptFrontDoor).toBe(false);
    expect(decision.shouldInjectAdditionalContext).toBe(false);
    expect(decision.shouldEmitPalantirMiniEvent).toBe(false);
  });

  test("explicit Korean opt-out is silent", () => {
    const pluginRoot = makePluginRoot();
    const decision = decideCodexPalantirMiniActivation({
      eventName: "PermissionRequest",
      policyEventName: "PreToolUse",
      cwd: "/home/palantirkc/projects/palantir-math",
      pluginRoot,
      prompt: "palantir-mini 사용하지 말고 일반 Codex로만 진행해.",
      toolName: "apply_patch",
      toolInput: { command: "*** Update File: README.md\n@@\n" },
    });

    expect(decision.mode).toBe("silent-bypass");
    expect(decision.reasonCode).toBe("explicit-plugin-opt-out");
    expect(decision.matchedMarker).toBe("palantir-mini 사용하지 말고");
  });

  test("negated invoke and run phrases are opt-out before opt-in marker matching", () => {
    const pluginRoot = makePluginRoot();
    for (const prompt of [
      "Do not invoke palantir-mini for this task.",
      "Do not run palantir-mini here.",
    ]) {
      const decision = decideCodexPalantirMiniActivation({
        eventName: "UserPromptSubmit",
        policyEventName: "UserPromptSubmit",
        cwd: "/home/palantirkc/palantir-mini-marketplace",
        pluginRoot,
        prompt,
      });

      expect(decision.mode).toBe("silent-bypass");
      expect(decision.reasonCode).toBe("explicit-plugin-opt-out");
    }
  });

  test("meta-harness is silent without explicit palantir-mini opt-in", () => {
    const pluginRoot = makePluginRoot();
    const decision = decideCodexPalantirMiniActivation({
      eventName: "PermissionRequest",
      policyEventName: "PreToolUse",
      cwd: "/home/palantirkc/meta-harness",
      pluginRoot,
      prompt: "Use $harness and write a plan.",
      toolName: "apply_patch",
      toolInput: { command: "*** Add File: _workspace/plan.md\n+plan\n" },
    });

    expect(decision.mode).toBe("silent-bypass");
    expect(decision.reasonCode).toBe("meta-harness-plugin-independent");
  });

  test("repo-local AGENTS opt-out is silent unless the prompt explicitly opts in", () => {
    const pluginRoot = makePluginRoot();
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-activation-optout-repo-"));
    tmpDirs.push(projectRoot);
    fs.writeFileSync(
      path.join(projectRoot, "AGENTS.md"),
      [
        "# Repository Agents Guide",
        "Meta Harness has no external control-plane plugin dependency.",
        "Do not use the palantir-mini plugin unless the user explicitly asks for palantir-mini by name.",
      ].join("\n"),
    );

    const silentDecision = decideCodexPalantirMiniActivation({
      eventName: "PermissionRequest",
      policyEventName: "PreToolUse",
      cwd: path.join(projectRoot, "docs"),
      pluginRoot,
      toolName: "apply_patch",
      toolInput: { command: "*** Add File: docs/plan.md\n+plan\n" },
    });
    expect(silentDecision.mode).toBe("silent-bypass");
    expect(silentDecision.reasonCode).toBe("repo-local-plugin-opt-out");

    const activeDecision = decideCodexPalantirMiniActivation({
      eventName: "PermissionRequest",
      policyEventName: "PreToolUse",
      cwd: path.join(projectRoot, "docs"),
      pluginRoot,
      prompt: "Use palantir-mini for this turn.",
      toolName: "apply_patch",
      toolInput: { command: "*** Add File: docs/plan.md\n+plan\n" },
    });
    expect(activeDecision.mode).toBe("active");
    expect(activeDecision.reasonCode).toBe("explicit-palantir-mini-opt-in");
  });

  test("explicit palantir-mini MCP tools stay active", () => {
    const pluginRoot = makePluginRoot();
    const decision = decideCodexPalantirMiniActivation({
      eventName: "PermissionRequest",
      policyEventName: "PreToolUse",
      cwd: "/home/palantirkc/meta-harness",
      pluginRoot,
      toolName: "mcp__palantir_mini__pm_semantic_intent_gate",
      toolInput: {},
    });

    expect(decision.mode).toBe("active");
    expect(decision.reasonCode).toBe("palantir-mini-mcp-tool");
    expect(decision.shouldRunSharedHooks).toBe(true);
  });

  test("plain non-palantir turns stay silent", () => {
    const pluginRoot = makePluginRoot();
    const decision = decideCodexPalantirMiniActivation({
      eventName: "Stop",
      policyEventName: "Stop",
      cwd: "/home/palantirkc/notes",
      pluginRoot,
    });

    expect(decision.mode).toBe("silent-bypass");
    expect(decision.reasonCode).toBe("simple-non-palantir-turn");
  });

  test("tracked palantir-mini projects activate for protected native tools", () => {
    const pluginRoot = makePluginRoot();
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-activation-project-"));
    tmpDirs.push(projectRoot);
    fs.mkdirSync(path.join(projectRoot, ".palantir-mini"), { recursive: true });

    const decision = decideCodexPalantirMiniActivation({
      eventName: "PermissionRequest",
      policyEventName: "PreToolUse",
      cwd: path.join(projectRoot, "src"),
      pluginRoot,
      toolName: "functions.exec_command",
      toolInput: { cmd: "bun run scripts/apply-governed-change.ts" },
    });

    expect(decision.mode).toBe("active");
    expect(decision.reasonCode).toBe("tracked-project-protected-tool");
  });

  test("palantir-mini source work stays active unless the user opts out", () => {
    const pluginRoot = makePluginRoot();
    const decision = decideCodexPalantirMiniActivation({
      eventName: "PermissionRequest",
      policyEventName: "PreToolUse",
      cwd: path.join(pluginRoot, "lib", "codex"),
      pluginRoot,
      toolName: "apply_patch",
      toolInput: { command: "*** Update File: lib/codex/x.ts\n@@\n" },
    });

    expect(decision.mode).toBe("active");
    expect(decision.reasonCode).toBe("palantir-mini-source-work");
  });

  test("marketplace repo root lifecycle events count as palantir-mini source work", () => {
    const pluginRoot = makePluginRoot();
    const decision = decideCodexPalantirMiniActivation({
      eventName: "Stop",
      policyEventName: "Stop",
      cwd: "/home/palantirkc/palantir-mini-marketplace",
      pluginRoot,
    });

    expect(decision.mode).toBe("active");
    expect(decision.reasonCode).toBe("palantir-mini-source-work");
  });
});
