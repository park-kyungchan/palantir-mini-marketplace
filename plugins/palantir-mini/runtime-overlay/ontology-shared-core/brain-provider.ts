/**
 * @stable — BrainProvider abstraction (home-brain-01, v1.0)
 *
 * Canonical Brain layer interface per Lance Martin "Scaling Managed Agents"
 * 2026-04-08 Brain/Hands/Session model. The Brain layer = model + harness
 * species (thinking). This module declares a provider-neutral interface
 * so palantir-mini can dispatch to Anthropic (via `claude -p` subprocess),
 * Ollama (local inference), or future providers without rule-08 authority-
 * chain violations or @anthropic-ai/sdk imports.
 *
 * Authority chain:
 *   ~/.claude/rules/CONTEXT.md §17 Brain-of-Swarms layer model
 *       → ~/ontology/shared-core/brain-provider.ts  (this file)
 *       → bridge/handlers/* (consumers)
 *
 * Hard constraints (sustained across all adapters):
 *   ❌ NO --bare flag (Max X20 has no API key — features.md:531).
 *   ❌ NO @anthropic-ai/sdk import.
 *   ✅ CLAUDE_CONFIG_DIR + HOME + MCP_CONNECTION_NONBLOCKING forwarded
 *      (B-26 2026-04-24: ETIMEDOUT root-cause fix; mirrors buildGraderModelEnv()
 *      in bridge/handlers/grade-outcome/model.ts:26 — NOT imported, re-implemented
 *      locally to keep shared-core dependency-free).
 *
 * D/L/A domain: LOGIC (provider interface is traversal/reasoning infrastructure —
 * it declares how thinking is dispatched; apply SH-01: "delete this file, do
 * objects still describe reality?" YES → LOGIC)
 */

import * as os from "os";
import * as path from "path";
import * as childProcess from "child_process";

// ---------------------------------------------------------------------------
// Public interface types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface BrainInvokeOptions {
  /** Anthropic-style effort hint (none|low|normal|high|xhigh) — maps to model + budget choice. */
  effort?: "none" | "low" | "normal" | "high" | "xhigh";
  /** Maximum total tokens for the response (provider-neutral hint). */
  maxTokens?: number;
  /** Per-call timeout in ms. */
  timeoutMs?: number;
}

export interface BrainResponse {
  content: string;
  /** Optional structured JSON parsed from the last fenced block, if any. */
  jsonBlock?: unknown;
  /** Provider-reported metadata. */
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface BrainProvider {
  readonly name: "anthropic" | "openai" | "ollama" | (string & {});
  readonly modelId: string;
  invoke(messages: ChatMessage[], options?: BrainInvokeOptions): Promise<BrainResponse>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build env for `claude -p` subprocess calls.
 *
 *  Re-implements buildGraderModelEnv() from bridge/handlers/grade-outcome/model.ts
 *  locally so shared-core remains dependency-free from the plugin. The B-26 fix
 *  (2026-04-24) — forward CLAUDE_CONFIG_DIR + HOME + MCP_CONNECTION_NONBLOCKING —
 *  is required here for the same reason: the subprocess cannot locate ~/.claude/
 *  config without explicit forwarding. */
function buildBrainEnv(): NodeJS.ProcessEnv {
  const claudeConfigDir =
    process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  return {
    ...process.env,
    CLAUDE_CONFIG_DIR: claudeConfigDir,
    HOME: process.env.HOME ?? os.homedir(),
    // Claude Code v2.1.89+: skip synchronous MCP server registration wait.
    // Brain subprocess may not use MCP, so the wait is pure overhead.
    // Max X20 constraint: --bare flag MUST NOT be used (requires ANTHROPIC_API_KEY).
    MCP_CONNECTION_NONBLOCKING: "true",
  };
}

/** Extract the last JSON block from LLM output.
 *  Tries last line first (common `claude -p` output contract), then scans
 *  backwards for the last fenced ```json block. */
function extractJsonBlock(raw: string): unknown | undefined {
  const trimmed = raw.trim();
  const lines = trimmed.split("\n");

  // Try the last line first — matches grader output contract.
  const lastLine = lines[lines.length - 1]?.trim() ?? "";
  if (lastLine.startsWith("{") || lastLine.startsWith("[")) {
    try {
      return JSON.parse(lastLine);
    } catch {
      // fall through to fenced-block scan
    }
  }

  // Scan backwards for ```json ... ``` fenced block.
  let inBlock = false;
  const blockLines: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const ln = lines[i].trim();
    if (!inBlock && (ln === "```" || ln === "```json")) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (ln === "```json" || ln === "```") {
        // found opening fence — blockLines are in reverse order
        try {
          return JSON.parse(blockLines.reverse().join("\n"));
        } catch {
          return undefined;
        }
      }
      blockLines.push(lines[i]);
    }
  }

  return undefined;
}

/** Build `claude -p` argv array for the given messages + options.
 *
 *  Argv contract (no shell injection — execFileSync used):
 *    claude -p <instruction> [--model <id>] [--effort <level>]
 *
 *  The `instruction` argument is the last user-role message content.
 *  System messages are prepended as a context preamble inside the instruction
 *  string (claude -p has no --system-prompt flag in CLI). */
function buildClaudeArgv(
  messages: ChatMessage[],
  modelId: string,
  options?: BrainInvokeOptions,
): string[] {
  // Compose instruction: system messages as preamble + user message content.
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content);
  const userParts = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`);

  const instruction = [...systemParts, ...userParts].join("\n\n");

  const argv: string[] = ["-p", instruction, "--model", modelId];

  // Effort mapping: xhigh and high forward the flag; low/normal/none use CLI default.
  if (options?.effort === "xhigh" || options?.effort === "high") {
    argv.push("--effort", options.effort);
  }

  // NOTE: --bare MUST NOT be used (Max X20 constraint documented above).

  return argv;
}

// ---------------------------------------------------------------------------
// Anthropic adapter (claude -p subprocess — Max X20 path)
// ---------------------------------------------------------------------------

/** Anthropic adapter — wraps `claude -p` subprocess (Max X20 path).
 *
 *  Forwards CLAUDE_CONFIG_DIR + HOME + MCP_CONNECTION_NONBLOCKING per B-26 fix.
 *  Uses execFileSync (NOT execSync) to avoid shell injection risk when passing
 *  arbitrary instruction content as argv. MUST NOT use --bare flag. */
export function createAnthropicBrain(cfg: {
  modelId?: string; // default "claude-sonnet-4-6"
} = {}): BrainProvider {
  const modelId = cfg.modelId ?? "claude-sonnet-4-6";

  return {
    name: "anthropic",
    modelId,

    async invoke(messages: ChatMessage[], options?: BrainInvokeOptions): Promise<BrainResponse> {
      const argv = buildClaudeArgv(messages, modelId, options);
      const timeoutMs = options?.timeoutMs ?? 120_000;
      const env = buildBrainEnv();

      const raw = childProcess.execFileSync("claude", argv, {
        timeout: timeoutMs,
        encoding: "utf8",
        env,
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const content = raw.trim();
      const jsonBlock = extractJsonBlock(content);

      return { content, jsonBlock };
    },
  };
}

// ---------------------------------------------------------------------------
// Ollama adapter (local inference — STUB for D3 K-LLM consensus prep)
// ---------------------------------------------------------------------------

/** Ollama local adapter — STUB.
 *
 *  Returns BrainResponse via a fetch-shaped call to Ollama's /api/chat endpoint.
 *  Default modelId "llama3.2".
 *
 *  This is a wiring stub for D3 K-LLM consensus prep (rule 26 v1.0.0 §Axis D3);
 *  full implementation is deferred. If the Ollama server is unreachable, throws
 *  with a descriptive error message. */
export function createOllamaBrain(cfg: {
  baseUrl?: string; // default "http://localhost:11434"
  modelId?: string; // default "llama3.2"
} = {}): BrainProvider {
  const baseUrl = cfg.baseUrl ?? "http://localhost:11434";
  const modelId = cfg.modelId ?? "llama3.2";

  return {
    name: "ollama",
    modelId,

    async invoke(messages: ChatMessage[], options?: BrainInvokeOptions): Promise<BrainResponse> {
      const url = `${baseUrl}/api/chat`;
      const body = {
        model: modelId,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        ...(options?.maxTokens != null ? { options: { num_predict: options.maxTokens } } : {}),
      };

      let response: Response;
      try {
        const controller = new AbortController();
        const timeoutId = options?.timeoutMs
          ? setTimeout(() => controller.abort(), options.timeoutMs)
          : undefined;

        try {
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } finally {
          if (timeoutId != null) clearTimeout(timeoutId);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Ollama unreachable at ${baseUrl}: ${msg}`);
      }

      if (!response.ok) {
        throw new Error(`Ollama unreachable at ${baseUrl}: HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };

      const content = data.message?.content ?? "";
      const jsonBlock = extractJsonBlock(content);
      const usage = {
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
      };

      return { content, jsonBlock, usage };
    },
  };
}
