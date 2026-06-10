// palantir-mini — Agent file-ownership table (sprint-060 W1.8 / PR-G Phase 8)
//
// Static control-plane surface consumed by hooks/agent-ownership-validate.ts.
// PR-G expands the table from only owning agents to every mutation-capable
// plugin agent so non-owner mutation attempts fail loud instead of being
// treated as unknown-agent advisory traffic.

export type AgentName =
  | "docs-researcher"
  | "harness-analyzer"
  | "harness-evaluator"
  | "harness-generator"
  | "harness-planner"
  | "home-implementer"
  | "hook-builder"
  | "implementer"
  | "kosmos-implementer"
  | "mc-implementer"
  | "ontology-steward"
  | "plugin-maintainer"
  | "pm-implementer"
  | "project-implementer"
  | "protocol-designer";

/**
 * Map of mutation-capable plugin agent name -> permitted plugin-root patterns.
 * Empty arrays are intentional: the agent is mutation-capable, but owns no
 * writable path inside the palantir-mini plugin source tree.
 */
export const AGENT_OWNERSHIP_TABLE: Record<AgentName, readonly string[]> = {
  "docs-researcher": [],
  "harness-analyzer": [],
  "harness-evaluator": [],
  "harness-generator": [],
  "harness-planner": [],
  "home-implementer": [],
  "hook-builder": [
    "hooks/**",
    "scripts/**",
    "bridge/handlers/**",
    "tests/hooks/**",
    "tests/bridge/**",
  ],
  "implementer": [],
  "kosmos-implementer": [],
  "mc-implementer": [],
  "ontology-steward": [],
  "plugin-maintainer": [
    ".codex-plugin/plugin.json",
    "package.json",
    "README.md",
    "CHANGELOG.md",
    "docs/**",
    "managed-settings.d/**",
  ],
  "pm-implementer": [],
  "project-implementer": [],
  "protocol-designer": [
    "agents/**",
  ],
};

/**
 * Paths that require cross-agent coordination (shared ownership).
 * Advisory behavior is preserved for PR-G to avoid widening runtime blocking
 * beyond the approved output-contract slice.
 */
export const SHARED_ADVISORY_PATTERNS: readonly string[] = [
  "lib/**",
];

export const KNOWN_AGENTS: readonly AgentName[] = Object.keys(AGENT_OWNERSHIP_TABLE) as AgentName[];

export function isKnownAgent(name: string): name is AgentName {
  return (KNOWN_AGENTS as readonly string[]).includes(name);
}

export function ownershipPatternsForAgent(name: AgentName): readonly string[] {
  return AGENT_OWNERSHIP_TABLE[name];
}
