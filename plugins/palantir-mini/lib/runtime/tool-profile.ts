// palantir-mini — neutral host-tool capability profile (W3c-2)
//
// The runtime-neutral classifier (lib/hooks/tool-classifier.ts) must not hardcode
// one runtime's tool names. A ToolCapabilityProfile carries the host runtime's
// concrete read-only / protected-mutation tool-name vocabulary; the Claude adapter
// supplies CLAUDE_TOOL_PROFILE, future Codex/Gemini adapters supply their own.
// classifyHookTool consults an injected (or host-resolved) profile instead of
// module-level Claude constants, so the neutral core gates on the host's vocabulary
// without a baked-in Claude binding.
//
// Authority: W3 redesign survey — hooks-event-bus family neutral_gap (adapter-supplied
// runtime tool vocabulary); rule 27 (each runtime self-attributes / supplies its surface).

import { resolveHostRuntimeIdentity, type RuntimeIdentity } from "./identity";

export interface ToolCapabilityProfile {
  /** Normalized (lowercased) tool names the host treats as read-only. */
  readonly readOnlyTools: ReadonlySet<string>;
  /** Normalized (lowercased) tool names the host treats as protected mutations (DTC-gated). */
  readonly protectedMutationTools: ReadonlySet<string>;
}

/**
 * Claude Code host tool vocabulary: Edit/Write/MultiEdit/NotebookEdit/Agent mutate;
 * Read/Grep/Glob/Ls/NotebookRead are read-only. Names are normalized to lowercase to
 * match `normalizeToolName` in tool-classifier.
 */
export const CLAUDE_TOOL_PROFILE: ToolCapabilityProfile = {
  readOnlyTools: new Set(["read", "grep", "glob", "ls", "notebookread"]),
  protectedMutationTools: new Set(["edit", "write", "multiedit", "notebookedit", "agent"]),
};

/**
 * Resolve the tool-capability profile for the host runtime. Defaults to the Claude
 * profile (the only adapter wired today); Codex/Gemini cases are added when those
 * adapters supply their tool vocabularies (W4+). Never throws.
 */
export function resolveToolProfile(
  identity: RuntimeIdentity = resolveHostRuntimeIdentity(undefined, "claude-code"),
): ToolCapabilityProfile {
  switch (identity) {
    case "claude-code":
      return CLAUDE_TOOL_PROFILE;
    // codex / gemini profiles land with their adapters (W4+); until then the host
    // tool vocabulary is Claude's (the sole runtime whose tool names flow through
    // classifyHookTool today).
    default:
      return CLAUDE_TOOL_PROFILE;
  }
}
