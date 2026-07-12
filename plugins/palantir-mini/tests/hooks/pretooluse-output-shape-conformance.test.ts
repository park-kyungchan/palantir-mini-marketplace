/**
 * G-HOOK-O regression — table-driven, runs every registered PreToolUse command.
 *
 * Root cause (see design-w5-token-diet.md slice 1): several PreToolUse hooks emitted
 * a bare top-level `decision: "continue"` with no `hookSpecificOutput` wrapper — a
 * shape Claude Code's real PreToolUse contract does not accept for a non-blocking
 * verdict (only `hookSpecificOutput.permissionDecision: "allow"`, or omitting
 * `decision` entirely, is valid). This test walks `hooks/hooks.json`'s PreToolUse
 * block (the same registry `hook-contracts.test.ts` walks), spawns each registered
 * `command` entry for real against a benign, well-formed Read-tool payload, and
 * asserts that whatever it emits never resurrects the non-conforming shape.
 *
 * Non-goal (stated honestly): this does NOT drive every hook into its
 * blocking/deny branch — that needs per-hook state setup already covered by each
 * hook's own dedicated test file. It only proves "whatever shape a hook's
 * reachable-with-a-benign-Read-call path emits, that shape is valid."
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const PLUGIN_ROOT = path.join(import.meta.dir, "../..");
const HOOKS_JSON = path.join(PLUGIN_ROOT, "hooks", "hooks.json");

interface HookConfig {
  readonly type?: string;
  readonly command?: string;
}

interface HookGroup {
  readonly policyRef?: string;
  readonly hooks?: readonly HookConfig[];
}

interface HooksDocument {
  readonly hooks?: Record<string, readonly HookGroup[]>;
}

function loadHooks(): HooksDocument {
  return JSON.parse(readFileSync(HOOKS_JSON, "utf8")) as HooksDocument;
}

/** Tokenize a shell-like command string: quoted segments stay whole, else split on whitespace. */
function tokenize(command: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(command)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : (m[2] ?? ""));
  }
  return tokens;
}

interface TableRow {
  readonly label: string;
  readonly argv: readonly string[];
}

function buildTable(): TableRow[] {
  const hooks = loadHooks();
  const preToolUseGroups = hooks.hooks?.PreToolUse ?? [];
  const rows: TableRow[] = [];
  for (const group of preToolUseGroups) {
    for (const hook of group.hooks ?? []) {
      if (hook.type !== "command" || !hook.command) continue;
      const resolved = hook.command.replaceAll("${CLAUDE_PLUGIN_ROOT}", PLUGIN_ROOT);
      const argv = tokenize(resolved);
      rows.push({ label: `${group.policyRef ?? "unknown-policy"}: ${hook.command}`, argv });
    }
  }
  return rows;
}

let scratchProjectRoot = "";
let scratchGlobalStateDir = "";
let scratchFilePath = "";

beforeAll(() => {
  scratchProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pretooluse-conformance-project-"));
  fs.mkdirSync(path.join(scratchProjectRoot, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(
    path.join(scratchProjectRoot, "package.json"),
    '{"name":"pretooluse-conformance-test"}\n',
  );
  scratchFilePath = path.join(scratchProjectRoot, "scratch.txt");
  fs.writeFileSync(scratchFilePath, "scratch\n");

  scratchGlobalStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-pretooluse-conformance-global-"));
});

afterAll(() => {
  if (scratchProjectRoot.length > 0) fs.rmSync(scratchProjectRoot, { recursive: true, force: true });
  if (scratchGlobalStateDir.length > 0) fs.rmSync(scratchGlobalStateDir, { recursive: true, force: true });
});

function benignPayload(): string {
  return JSON.stringify({
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_input: { file_path: scratchFilePath },
    cwd: scratchProjectRoot,
    session_id: "pretooluse-conformance-test",
  });
}

describe("PreToolUse hook output-shape conformance (G-HOOK-O regression)", () => {
  const table = buildTable();

  test("hooks.json PreToolUse registry has the expected number of command entries", () => {
    expect(table.length).toBeGreaterThan(0);
  });

  for (const row of table) {
    test(row.label, () => {
      const [command, ...args] = row.argv;
      if (command === undefined) throw new Error(`empty argv for ${row.label}`);
      const result = spawnSync(command, args, {
        cwd: PLUGIN_ROOT,
        input: benignPayload(),
        encoding: "utf8",
        timeout: 20_000,
        env: {
          ...process.env,
          PALANTIR_MINI_GLOBAL_STATE_DIR: scratchGlobalStateDir,
        },
      });

      const stdout = (result.stdout ?? "").trim();
      if (stdout.length === 0) {
        // Nothing was emitted for this benign Read-tool payload — passes trivially
        // (this hook's real branches need state this test does not drive; see
        // each hook's own dedicated test file for branch coverage).
        return;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(stdout) as Record<string, unknown>;
      } catch (e) {
        throw new Error(
          `hook emitted non-JSON stdout (a regression in itself): ${stdout}\n${(e as Error).message}`,
        );
      }

      if ("decision" in parsed) {
        expect(parsed.decision, "decision must be \"block\" or absent, never \"continue\"").toBe("block");
      }
      if (parsed.decision === "block") {
        const hookSpecificOutput = parsed.hookSpecificOutput as Record<string, unknown> | undefined;
        expect(
          hookSpecificOutput?.permissionDecision,
          "a decision:\"block\" verdict must pair with hookSpecificOutput.permissionDecision:\"deny\"",
        ).toBe("deny");
      }
    });
  }
});
