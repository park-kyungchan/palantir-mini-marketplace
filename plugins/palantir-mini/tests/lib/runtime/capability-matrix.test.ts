import { describe, expect, test } from "bun:test";
import {
  CODEX_SCHEMA_ONLY_EVENTS,
  CODEX_NATIVE_GAPS,
  GEMINI_NATIVE_GAPS,
  codexFallbackFactForEvent,
  geminiFallbackFactForEvent,
  runtimeCanObserveEvent,
  runtimeHasSchemaOnlyEvent,
} from "../../../lib/runtime/capability-matrix";

describe("runtime capability matrix", () => {
  test("Codex missing native events map to fallback facts", () => {
    expect(CODEX_NATIVE_GAPS).toContain("TaskCreated");
    expect(runtimeCanObserveEvent("codex", "TaskCreated")).toBe(false);
    expect(runtimeCanObserveEvent("claude", "TaskCreated")).toBe(true);
    expect(codexFallbackFactForEvent("TaskCreated")?.fallback).toContain("do not claim parity");
    expect(codexFallbackFactForEvent("SubagentStop")?.fact).toContain("does not natively observe");
  });

  test("Codex compact lifecycle events remain schema-only until smoke-proven", () => {
    expect(CODEX_SCHEMA_ONLY_EVENTS).toContain("PreCompact");
    expect(CODEX_SCHEMA_ONLY_EVENTS).toContain("PostCompact");
    expect(runtimeCanObserveEvent("codex", "PreCompact")).toBe(false);
    expect(runtimeCanObserveEvent("codex", "PostCompact")).toBe(false);
    expect(runtimeHasSchemaOnlyEvent("codex", "PreCompact")).toBe(true);
    expect(codexFallbackFactForEvent("PreCompact")?.fallback).toContain("schema-only evidence");
  });

  test("Gemini exposes native Gemini lifecycle names through an adapter map", () => {
    expect(runtimeCanObserveEvent("gemini", "BeforeTool")).toBe(true);
    expect(runtimeCanObserveEvent("gemini", "PreToolUse")).toBe(false);
    expect(runtimeHasSchemaOnlyEvent("gemini", "PreCompact")).toBe(false);
    expect(GEMINI_NATIVE_GAPS).toContain("SubagentStop");
    expect(geminiFallbackFactForEvent("PreToolUse")?.fallback).toContain("Gemini extension adapter");
  });
});
