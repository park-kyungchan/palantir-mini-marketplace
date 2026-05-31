import { describe, expect, test } from "bun:test";
import {
  normalizeRuntimeIdentity,
  resolveHostRuntimeIdentity,
} from "../../../lib/runtime/identity";

describe("runtime identity", () => {
  test("normalizes provider aliases without promoting them to authority", () => {
    expect(normalizeRuntimeIdentity("claude")).toBe("claude-code");
    expect(normalizeRuntimeIdentity("codex-cli")).toBe("codex");
    expect(normalizeRuntimeIdentity("gemini-cli")).toBe("gemini");
    expect(normalizeRuntimeIdentity("unknown")).toBe("unknown");
  });

  test("does not default an absent host runtime to Claude", () => {
    expect(resolveHostRuntimeIdentity(undefined)).toBe("unknown");
    expect(resolveHostRuntimeIdentity(undefined, "codex")).toBe("codex");
  });
});
