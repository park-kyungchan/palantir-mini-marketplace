import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import promptFrontDoorCapture, {
  currentPointerPathFor,
  envelopePathFor,
} from "../../hooks/prompt-front-door-capture";
import { readEvents } from "../../lib/event-log/read";
import { readCurrentUniversalOntologyEntry } from "../../lib/ontology-entry/entry-store";
import type { PromptCurrentPointer, PromptEnvelope } from "../../lib/prompt-front-door";

const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeTmpProject(label: string): string {
  const root = mkdtempSync(path.join(tmpdir(), `pm-pfd-${label}-`));
  tmpRoots.push(root);
  return root;
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_HOST_RUNTIME = process.env.PALANTIR_MINI_HOST_RUNTIME;
});

afterEach(() => {
  for (const key of Object.keys(savedEnv)) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const root of tmpRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("prompt-front-door-capture", () => {
  test("captures payload.prompt into envelope/current pointer without retaining raw prompt", async () => {
    const root = makeTmpProject("capture");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(root);
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const result = await promptFrontDoorCapture({
      hook_event_name: "UserPromptSubmit",
      session_id: "session/alpha",
      turn_id: "turn-1",
      cwd: root,
      prompt: "Implement Wave 2 prompt front door capture.",
    });

    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("pm_semantic_intent_gate");
    expect(ctx).toContain("promptId:");
    expect(ctx).toContain("promptHash:");
    expect(ctx).toContain("UniversalOntologyEntryRef:");
    expect(ctx).toContain("Query ontology context first");

    const pointer = readJson<PromptCurrentPointer>(
      currentPointerPathFor(root, "codex", "session/alpha"),
    );
    const envelope = readJson<PromptEnvelope>(
      envelopePathFor(root, "session/alpha", pointer.promptId),
    );

    expect(pointer.promptHash).toBe(envelope.promptHash);
    expect(envelope.promptExcerpt).toContain("Implement Wave 2");
    expect(envelope.rawPrompt).toBeUndefined();
    expect(envelope.state).toBe("captured");
    expect(envelope.runtime).toBe("codex");
    const entry = readCurrentUniversalOntologyEntry(root);
    expect(entry?.prompt.promptId).toBe(envelope.promptId);
    expect(entry?.prompt.promptHash).toBe(envelope.promptHash);

    const events = readEvents(eventsPathFor(root));
    expect(events.some((event) => event.type === "user_prompt_submitted")).toBe(true);
  });

  test("injects the Altitude-1 multi-stage runbook pointer for an ontology-affecting prompt", async () => {
    const root = makeTmpProject("altitude1-pointer");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(root);
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const result = await promptFrontDoorCapture({
      hook_event_name: "UserPromptSubmit",
      session_id: "session-altitude1",
      turn_id: "turn-altitude1",
      cwd: root,
      prompt: "Start Ontology Engineering: mutate the linear-function ObjectType in the digital twin.",
    });

    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("pm Altitude-1 is a multi-stage flow");
    expect(ctx).toContain("9-axis SIC -> approve_sic -> DTC -> envelope-advance -> dispatch");
    expect(ctx).toContain("docs/altitude1-runtime-guide/BROWSE.md");
  });

  test("records previousPromptHash when the same runtime/session already has a current pointer", async () => {
    const root = makeTmpProject("previous");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(root);
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    await promptFrontDoorCapture({
      session_id: "session-beta",
      cwd: root,
      prompt: "First prompt",
    });
    const firstPointer = readJson<PromptCurrentPointer>(
      currentPointerPathFor(root, "codex", "session-beta"),
    );

    await promptFrontDoorCapture({
      session_id: "session-beta",
      cwd: root,
      prompt: "Second prompt",
    });
    const secondPointer = readJson<PromptCurrentPointer>(
      currentPointerPathFor(root, "codex", "session-beta"),
    );
    const secondEnvelope = readJson<PromptEnvelope>(
      envelopePathFor(root, "session-beta", secondPointer.promptId),
    );

    expect(secondPointer.promptId).not.toBe(firstPointer.promptId);
    expect(secondEnvelope.previousPromptHash).toBe(firstPointer.promptHash);
  });

  test("STATE-first (CTX-B): raw-capture turn (state=captured) does NOT auto-inject the footer", async () => {
    // CTX-B relaxation: the footer is keyed to LIVE governance STATE, not prompt
    // VOCABULARY. A freshly-captured envelope is `captured` (no governed contract
    // open yet), so a prompt that merely MENTIONS palantir-mini/ontology vocabulary
    // no longer trips the ~3.2k field-dump footer on the capture turn. The footer
    // becomes required once the envelope advances into a governed-active state
    // (covered by the STATE-predicate unit tests + the gate/stop hook tests).
    const root = makeTmpProject("ontology-template");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(root);
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const result = await promptFrontDoorCapture({
      hook_event_name: "UserPromptSubmit",
      session_id: "session-template",
      turn_id: "turn-ontology",
      cwd: root,
      prompt: "Use palantir-mini mandatory workflow instructions for any user request and then start Ontology Engineering with WorkflowContract and TurnCardDecisionSpec.",
    });

    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    // Base capture policy is always present.
    expect(ctx).toContain("palantir-mini prompt front door captured this prompt.");
    // The governed footer field dump is NOT appended on the captured-state turn.
    expect(ctx).not.toContain("palantir-mini user requirement prompt response requirements are mandatory");
    expect(ctx).not.toContain("현재 workflow phase");
  });

  test("skips Codex prompt-front-door writes for explicit palantir-mini plugin opt-out", async () => {
    const root = makeTmpProject("plugin-opt-out");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(root);
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const result = await promptFrontDoorCapture({
      hook_event_name: "UserPromptSubmit",
      session_id: "session-opt-out",
      turn_id: "turn-opt-out",
      cwd: root,
      prompt:
        "Do not use palantir-mini for this turn. Start Ontology Engineering with WorkflowContract.",
    });

    const ctx = result.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toBe("");
    expect(result.message).toContain("explicit plugin opt-out");
    expect(result.message).toContain("do not use palantir-mini");

    expect(() =>
      readFileSync(currentPointerPathFor(root, "codex", "session-opt-out"), "utf8"),
    ).toThrow();
    expect(readCurrentUniversalOntologyEntry(root)).toBeUndefined();
  });

  test("missing prompt is advisory-only and does not create a current pointer", async () => {
    const root = makeTmpProject("missing");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(root);
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const result = await promptFrontDoorCapture({
      hook_event_name: "UserPromptSubmit",
      session_id: "session-missing",
      cwd: root,
    });

    expect(result.continue).toBe(true);
    expect(result.message).toContain("missing payload.prompt");
    expect(result.hookSpecificOutput).toBeUndefined();

    const pointerPath = currentPointerPathFor(root, "codex", "session-missing");
    expect(() => readFileSync(pointerPath, "utf8")).toThrow();
    const events = readEvents(eventsPathFor(root));
    const advisory = events.find((event) => event.type === "validation_phase_completed");
    expect(advisory).toBeDefined();
    expect((advisory?.payload as { passed?: boolean }).passed).toBe(false);
    expect(advisory?.withWhat?.refinementTarget).toBeDefined();
  });
});
