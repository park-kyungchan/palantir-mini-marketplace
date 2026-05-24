import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import promptDtcEnforcementGate, {
  __test__,
} from "../../hooks/prompt-dtc-enforcement-gate";
import {
  PromptFrontDoorStore,
  createPromptEnvelope,
} from "../../lib/prompt-front-door";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-dtc-scoped-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), "{\"name\":\"prompt-dtc-scoped-test\"}\n");
  return dir;
}

async function capturedPrompt(project: string) {
  const store = new PromptFrontDoorStore({ projectRoot: project });
  const envelope = createPromptEnvelope({
    rawPrompt: "Implement scoped Prompt-DTC blocking.",
    sessionId: "session-scoped-blocking",
    runtime: "codex",
    projectRoot: project,
    capturedAt: "2026-05-10T05:00:00.000Z",
    sequence: 1,
  });
  await store.saveEnvelope(envelope);
  return envelope;
}

function payload(project: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd: project,
    session_id: "session-scoped-blocking",
    tool_name: "Edit",
    tool_input: {
      file_path: "src/example.ts",
    },
    ...overrides,
  };
}

function readEvents(project: string): Array<{ type: string; payload?: Record<string, unknown> }> {
  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE =
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PROJECT;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE === undefined) {
    delete process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  } else {
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE =
      savedEnv.PALANTIR_MINI_PROMPT_DTC_GATE_MODE;
  }
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  } else {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  }
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) {
    delete process.env.PALANTIR_MINI_PROJECT;
  } else {
    process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("prompt-dtc scoped blocking", () => {
  test("default mode remains advisory for scoped surfaces", async () => {
    const project = makeTmpProject();
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: ".claude/plugins/palantir-mini/lib/lead-intent/contracts.ts",
        },
      }),
    );

    expect(result.message).toBe("palantir-mini: prompt-DTC gate advisory");
    expect(result.decision).toBeUndefined();
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  test("scoped-blocking denies protected lead-intent surfaces without DTC approval", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "scoped-blocking";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: ".claude/plugins/palantir-mini/lib/lead-intent/contracts.ts",
        },
      }),
    );

    expect(result.decision).toBe("block");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.reason).toContain("Scoped blocking surface");
    expect(result.reason).toContain("lead-intent contract surface");
  });

  test("scoped-blocking keeps ordinary tests advisory while DTC approval is pending", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "scoped-blocking";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: ".claude/plugins/palantir-mini/tests/hooks/example.test.ts",
        },
      }),
    );

    expect(result.message).toBe("palantir-mini: prompt-DTC gate advisory");
    expect(result.decision).toBeUndefined();
    expect(result.additionalContext).toContain("Scoped blocking surface: none");
  });

  test("scoped-blocking denies commit_edits and apply_edit_function surfaces", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "scoped-blocking";
    await capturedPrompt(project);

    const commitResult = await promptDtcEnforcementGate(
      payload(project, {
        tool_name: "mcp__palantir_mini__commit_edits",
        tool_input: { actionTypeRid: "action-type:test" },
      }),
    );
    const applyResult = await promptDtcEnforcementGate(
      payload(project, {
        tool_name: "mcp__palantir_mini__apply_edit_function",
        tool_input: { functionName: "test", params: {} },
      }),
    );

    expect(commitResult.decision).toBe("block");
    expect(commitResult.reason).toContain("commit_edits mutation surface");
    expect(applyResult.decision).toBe("block");
    expect(applyResult.reason).toContain("apply_edit_function mutation surface");
  });

  test("scoped-blocking leaves read-only tools allowed", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "scoped-blocking";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_name: "Bash",
        tool_input: { command: "git status --short" },
      }),
    );

    expect(result.message).toContain("skipped");
    expect(result.decision).toBeUndefined();
  });

  test("off mode remains available but emits an auditable bypass event", async () => {
    const project = makeTmpProject();
    process.env.PALANTIR_MINI_PROMPT_DTC_GATE_MODE = "off";
    await capturedPrompt(project);

    const result = await promptDtcEnforcementGate(
      payload(project, {
        tool_input: {
          file_path: ".claude/plugins/palantir-mini/bridge/mcp-server.ts",
        },
      }),
    );

    expect(result).toEqual({ message: "palantir-mini: prompt-DTC gate off" });
    const event = readEvents(project).find(
      (entry) => entry.payload?.errorClass === "prompt_dtc_gate_off_bypass",
    );
    expect(event?.payload).toMatchObject({
      mode: "off",
      mutating: true,
      projectRoot: project,
      runtime: "unknown",
    });
  });

  test("scoped surface classifier covers ontology, generated, MCP, and router surfaces", () => {
    const project = "/home/palantirkc";

    expect(__test__.scopedBlockingFileReason("schemas/ontology/foo.ts", project)).toContain(
      "ontology schema surface",
    );
    expect(
      __test__.scopedBlockingFileReason(
        ".claude/plugins/palantir-mini/bridge/mcp-server.ts",
        project,
      ),
    ).toContain("public MCP schema surface");
    expect(__test__.scopedBlockingFileReason("projects/x/ontology/foo.ts", project)).toContain(
      "project ontology surface",
    );
    expect(__test__.scopedBlockingFileReason("projects/x/src/generated/foo.ts", project)).toContain(
      "generated project surface",
    );
    expect(
      __test__.assessScopedBlockingSurface(
        {
          tool_name: "mcp__palantir_mini__pm_intent_router",
          tool_input: {
            intent: "Change ontology contract routing",
            complexityHint: "cross-cutting",
          },
        },
        project,
      ).scoped,
    ).toBe(true);
  });
});
