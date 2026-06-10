// palantir-mini — agent-ownership-validate hook tests (sprint-060 W1.8)
//
// 5 acceptance scenarios per task spec:
//   1. hook-builder editing hooks/ — ALLOW
//   2. hook-builder editing .codex-plugin/plugin.json — DENY
//   3. plugin-maintainer editing .codex-plugin/plugin.json — ALLOW
//   4. protocol-designer editing rules/ (out of plugin scope) — EXEMPT (not in plugin root)
//   5. bypass envvar — BYPASS (audit emitted)
//
// Additional coverage:
//   6. Lead-direct edits — EXEMPT
//   7. Unknown agent (researcher) editing hooks/ — ADVISORY pass-through
//   8. Shared path (lib/) — ADVISORY pass-through
//   9. plugin-maintainer editing hooks/ — DENY
//   10. globMatch helper edge cases (exact file, nested path)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import agentOwnershipValidate from "../../hooks/agent-ownership-validate";
import { KNOWN_AGENTS } from "../../lib/agent-ownership-table";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

// Root env vars honored by resolvePalantirMiniRoot (lib/config/root.ts).
// A session-exported value (e.g. a stale plugin cache) takes precedence and
// makes the hook resolve in-source paths as out-of-scope SKIP. Clear them so
// the hook resolves against the package-relative source root.
const ROOT_ENV_VARS = [
  "PALANTIR_MINI_ROOT",
  "PALANTIR_MINI_PLUGIN_ROOT",
  "PLUGIN_ROOT",
] as const;

function isolateRootEnv(): void {
  const savedEnv: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ROOT_ENV_VARS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ROOT_ENV_VARS) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

function makePayload(overrides: {
  filePath?: string;
  agentName?: string;
  identity?:  string;
  subagentType?: string;
  cwd?: string;
}): unknown {
  return {
    cwd:        overrides.cwd ?? "/home/palantirkc",
    session_id: "test-session-123",
    tool_name:  "Edit",
    tool_input: {
      file_path: overrides.filePath ?? `${PLUGIN_ROOT}/hooks/some-hook.ts`,
    },
    byWhom: {
      agentName: overrides.agentName,
      identity:  overrides.identity ?? "claude-code",
    },
    subagent_type: overrides.subagentType,
  };
}

// ─── Main scenarios ───────────────────────────────────────────────────────────

describe("agent-ownership-validate: 5 acceptance scenarios", () => {

  isolateRootEnv();

  // 1. hook-builder editing hooks/ — ALLOW
  test("scenario 1: hook-builder editing hooks/ — ALLOW", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/hooks/my-hook.ts`,
      agentName: "hook-builder",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ALLOW");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 2. hook-builder editing .codex-plugin/plugin.json — DENY
  test("scenario 2: hook-builder editing .codex-plugin/plugin.json — DENY", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/.codex-plugin/plugin.json`,
      agentName: "hook-builder",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
    };

    expect(result.message).toContain("DENY");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("hook-builder");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("rule 07");
  });

  // 3. plugin-maintainer editing .codex-plugin/plugin.json — ALLOW
  test("scenario 3: plugin-maintainer editing .codex-plugin/plugin.json — ALLOW", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/.codex-plugin/plugin.json`,
      agentName: "plugin-maintainer",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ALLOW");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 4. protocol-designer editing ~/.claude/rules/07-plugins-and-mcp.md
  //    (out of plugin scope) — EXEMPT (pass-through: not in plugin root)
  test("scenario 4: protocol-designer editing rules/ (out of plugin scope) — SKIP", async () => {
    const payload = makePayload({
      filePath:  "/home/palantirkc/.claude/rules/07-plugins-and-mcp.md",
      agentName: "protocol-designer",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("SKIP");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 5. bypass envvar — BYPASS + audit emitted
  test("scenario 5: PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS=1 — BYPASS", async () => {
    process.env.PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS = "1";
    try {
      const payload = makePayload({
        filePath:  `${PLUGIN_ROOT}/.codex-plugin/plugin.json`,
        agentName: "hook-builder",
      });
      const result = await agentOwnershipValidate(payload) as {
        message: string;
        hookSpecificOutput?: { permissionDecision?: string };
      };

      expect(result.message).toContain("BYPASS");
      expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    } finally {
      delete process.env.PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS;
    }
  });
});

describe("agent-ownership-validate: PR-G inventory coverage", () => {

  isolateRootEnv();

  test("ownership table covers all mutation-capable plugin agents", () => {
    expect(KNOWN_AGENTS.length).toBe(15);
    expect(KNOWN_AGENTS).toContain("implementer");
    expect(KNOWN_AGENTS).toContain("project-implementer");
    expect(KNOWN_AGENTS).toContain("protocol-designer");
  });

  test("known mutation-capable non-owner is denied instead of unknown advisory", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/hooks/some-hook.ts`,
      agentName: "implementer",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };
    expect(result.message).toContain("DENY");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("mutation-capable plugin agent missing output contract is denied before ownership", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-own-prg-"));
    const saved = process.env.PALANTIR_MINI_PLUGIN_ROOT;
    try {
      process.env.PALANTIR_MINI_PLUGIN_ROOT = tmp;
      fs.mkdirSync(path.join(tmp, "agents"), { recursive: true });
      fs.mkdirSync(path.join(tmp, "hooks"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "agents", "hook-builder.md"), `---
name: hook-builder
tools: Write, Edit
model: sonnet
---
`);
      const result = await agentOwnershipValidate(makePayload({
        filePath: path.join(tmp, "hooks", "x.ts"),
        agentName: "hook-builder",
      })) as { message: string; hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string } };
      expect(result.message).toContain("missing output contract");
      expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("output contract");
    } finally {
      if (saved === undefined) delete process.env.PALANTIR_MINI_PLUGIN_ROOT;
      else process.env.PALANTIR_MINI_PLUGIN_ROOT = saved;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("agent-ownership-validate: additional coverage", () => {

  isolateRootEnv();

  // 6. Lead-direct edits — EXEMPT
  test("Lead-direct (claude-code) editing plugin.json — EXEMPT", async () => {
    // No agentName = inferred Lead-direct when no subagent_type
    const payload = {
      cwd:        "/home/palantirkc",
      session_id: "test-session-lead",
      tool_name:  "Edit",
      tool_input: {
        file_path: `${PLUGIN_ROOT}/.codex-plugin/plugin.json`,
      },
      byWhom: {
        agentName: "claude-code",
        identity:  "claude-code",
      },
    };
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("EXEMPT");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 7. Unknown agent (researcher) editing hooks/ — ADVISORY pass-through
  test("researcher editing hooks/ — ADVISORY pass-through", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/hooks/some-hook.ts`,
      agentName: "researcher",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ADVISORY");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 8. Shared path (lib/) — ADVISORY pass-through
  test("hook-builder editing lib/shared-file.ts — ADVISORY (shared path)", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/lib/shared-file.ts`,
      agentName: "hook-builder",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ADVISORY");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 9. plugin-maintainer editing hooks/ — DENY
  test("plugin-maintainer editing hooks/ — DENY", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/hooks/some-hook.ts`,
      agentName: "plugin-maintainer",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
    };

    expect(result.message).toContain("DENY");
    expect(result.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain("plugin-maintainer");
  });

  // 10. No file_path in tool_input — SKIP
  test("no file_path — SKIP (cannot evaluate)", async () => {
    const payload = {
      cwd:        "/home/palantirkc",
      session_id: "test-session-nofp",
      tool_name:  "Write",
      tool_input: {},
      byWhom: { agentName: "hook-builder", identity: "claude-code" },
    };
    const result = await agentOwnershipValidate(payload) as {
      message: string;
    };

    expect(result.message).toContain("SKIP");
  });

  // 11. hook-builder editing tests/hooks/ — ALLOW (nested)
  test("hook-builder editing tests/hooks/foo.test.ts — ALLOW", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/tests/hooks/foo.test.ts`,
      agentName: "hook-builder",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ALLOW");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 12. plugin-maintainer editing CHANGELOG.md — ALLOW
  test("plugin-maintainer editing CHANGELOG.md — ALLOW", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/CHANGELOG.md`,
      agentName: "plugin-maintainer",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ALLOW");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 13. protocol-designer editing agents/ — ALLOW
  test("protocol-designer editing agents/my-agent.md — ALLOW", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/agents/my-agent.md`,
      agentName: "protocol-designer",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ALLOW");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 14. hook-builder editing bridge/handlers/ — ALLOW
  test("hook-builder editing bridge/handlers/my-handler.ts — ALLOW", async () => {
    const payload = makePayload({
      filePath:  `${PLUGIN_ROOT}/bridge/handlers/my-handler.ts`,
      agentName: "hook-builder",
    });
    const result = await agentOwnershipValidate(payload) as {
      message: string;
      hookSpecificOutput?: { permissionDecision?: string };
    };

    expect(result.message).toContain("ALLOW");
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // 15. Undefined payload — graceful no-crash
  test("undefined payload — graceful fallback", async () => {
    const result = await agentOwnershipValidate(undefined) as {
      message: string;
    };
    // Should either SKIP (no file_path) or not throw
    expect(typeof result.message).toBe("string");
  });
});
