import { describe, expect, test } from "bun:test";
import {
  CODEX_MOUNTED_HOOK_EVENTS,
  CODEX_SCHEMA_ONLY_EVENTS,
  CODEX_UNMOUNTED_HOOK_EVENTS,
  CODEX_NATIVE_GAPS,
  GEMINI_NATIVE_GAPS,
  codexFallbackFactForEvent,
  geminiFallbackFactForEvent,
  runtimeCanObserveEvent,
  runtimeHasMountedHookEvent,
  runtimeHasSchemaOnlyEvent,
  runtimeHasUnmountedHookEvent,
} from "../../../lib/runtime/capability-matrix";

describe("runtime capability matrix", () => {
  test("Codex missing native events map to fallback facts", () => {
    expect(CODEX_NATIVE_GAPS).toContain("TaskCreated");
    expect(runtimeCanObserveEvent("codex", "TaskCreated")).toBe(false);
    expect(runtimeCanObserveEvent("claude", "TaskCreated")).toBe(true);
    expect(codexFallbackFactForEvent("TaskCreated")?.fallback).toContain("do not claim parity");
    expect(CODEX_NATIVE_GAPS).not.toContain("SubagentStop");
    expect(runtimeCanObserveEvent("codex", "SubagentStop")).toBe(true);
    expect(codexFallbackFactForEvent("SubagentStop")).toBeNull();
  });

  test("Codex compact lifecycle events are adapter-native", () => {
    expect(CODEX_SCHEMA_ONLY_EVENTS).toEqual([]);
    expect(runtimeCanObserveEvent("codex", "PreCompact")).toBe(true);
    expect(runtimeCanObserveEvent("codex", "PostCompact")).toBe(true);
    expect(runtimeHasSchemaOnlyEvent("codex", "PreCompact")).toBe(false);
    expect(codexFallbackFactForEvent("PreCompact")).toBeNull();
  });

  test("Codex mounted hook events stay separated from native vocabulary", () => {
    expect(CODEX_MOUNTED_HOOK_EVENTS).toEqual([
      "SessionStart",
      "PermissionRequest",
      "PreToolUse",
      "PostToolUse",
      "PreCompact",
      "PostCompact",
      "UserPromptSubmit",
      "SubagentStart",
      "SubagentStop",
      "Stop",
    ]);
    expect(CODEX_UNMOUNTED_HOOK_EVENTS).toEqual([]);
    expect(runtimeCanObserveEvent("codex", "PreToolUse")).toBe(true);
    expect(runtimeHasMountedHookEvent("codex", "PreToolUse")).toBe(true);
    expect(runtimeHasUnmountedHookEvent("codex", "PreToolUse")).toBe(false);
    expect(runtimeHasMountedHookEvent("codex", "UserPromptSubmit")).toBe(true);
    expect(runtimeHasUnmountedHookEvent("codex", "UserPromptSubmit")).toBe(false);
  });

  test("Gemini exposes native Gemini lifecycle names through an adapter map", () => {
    expect(runtimeCanObserveEvent("gemini", "BeforeTool")).toBe(true);
    expect(runtimeCanObserveEvent("gemini", "PreToolUse")).toBe(false);
    expect(runtimeHasSchemaOnlyEvent("gemini", "PreCompact")).toBe(false);
    expect(GEMINI_NATIVE_GAPS).toContain("SubagentStop");
    expect(geminiFallbackFactForEvent("PreToolUse")?.fallback).toContain("Gemini extension adapter");
  });
});
