import { describe, expect, test } from "bun:test";
import {
  MIN_NATIVE_SUBAGENT_VERSION,
  parseClaudeVersion,
  detectNativeSubagentCapability,
} from "../../../lib/runtime/claude-version-capability";

describe("claude --version capability gate (P2-9/F9)", () => {
  test("parses the semver triple out of `claude --version` output", () => {
    expect(parseClaudeVersion("2.1.186 (Claude Code)")).toEqual({ major: 2, minor: 1, patch: 186 });
    expect(parseClaudeVersion("2.1.110")).toEqual({ major: 2, minor: 1, patch: 110 });
  });

  test("returns null for unparseable / empty output", () => {
    expect(parseClaudeVersion(null)).toBeNull();
    expect(parseClaudeVersion("")).toBeNull();
    expect(parseClaudeVersion("command not found")).toBeNull();
  });

  test("current CLI version → native dispatch supported", () => {
    const cap = detectNativeSubagentCapability(() => "2.1.186 (Claude Code)");
    expect(cap.supported).toBe(true);
    expect(cap.reason).toBe("ok");
    expect(cap.version).toBe("2.1.186");
  });

  test("exactly the minimum version → supported (>= boundary)", () => {
    const cap = detectNativeSubagentCapability(() => `${MIN_NATIVE_SUBAGENT_VERSION} (Claude Code)`);
    expect(cap.supported).toBe(true);
    expect(cap.reason).toBe("ok");
  });

  test("too-old CLI → unsupported → caller routes to CLI fallback", () => {
    const cap = detectNativeSubagentCapability(() => "2.1.109 (Claude Code)");
    expect(cap.supported).toBe(false);
    expect(cap.reason).toBe("too-old");
    expect(cap.version).toBe("2.1.109");
  });

  test("CLI unavailable (probe returns null) → unsupported → CLI fallback", () => {
    const cap = detectNativeSubagentCapability(() => null);
    expect(cap.supported).toBe(false);
    expect(cap.reason).toBe("cli-unavailable");
    expect(cap.version).toBeNull();
  });

  test("older major outranked / newer major supported", () => {
    expect(detectNativeSubagentCapability(() => "1.9.999").supported).toBe(false);
    expect(detectNativeSubagentCapability(() => "3.0.0").supported).toBe(true);
  });
});
