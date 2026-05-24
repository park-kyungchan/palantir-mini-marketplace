# Claude Code Research — Structure & Provenance

Structural reference for `~/.claude/research/claude-code/`.

`BROWSE.md` is the primary query interface. `INDEX.md` explains coverage, provenance, and authority boundaries.

## Role Contract
- This library documents Claude-native capabilities, not project semantics.
- It informs Claude-native memory, rules, hooks, settings, and agent design.
- Project-local `BROWSE.md`, `INDEX.md`, ontology docs, tests, and code still outrank it for project behavior.

## Authority Flow

```text
Anthropic official docs
  -> ~/.claude/research/claude-code/
  -> Claude-native settings / hooks / rules / agents
  -> project-local runtime behavior
```

## File Map (post 2026-04-29 legacy purge)

| File | Class | Role | Harness species documented |
|------|-------|------|----------------------------|
| `features.md` | cc-mixed | Claude Code feature and syntax reference (v2.1.113 baseline) | Claude Code CLI harness + Agent Teams extension; cross-ref Managed Agents §26 |
| `agent-system-design.md` | cc-mixed | hook, agent, memory, automation, orchestration design patterns (v2.1.101) | Claude Code CLI harness with Agent Teams (Layer 3 of 4-layer agent taxonomy) |
| `hook-events-v2.md` | cc-mixed | v2.1.110+ hook event catalog (27 events) + blocking/advisory classification | Claude Code CLI harness (hooks are CLI-harness substrate) |
| `plugin-system.md` | cc-mixed | v2.1.110+ `.claude-plugin/` manifest + install lifecycle | Claude Code CLI harness (plugin = CLI-harness extension surface) |
| `mcp-server-registration.md` | cc-mixed | v2.1.110+ MCP server registration three paths comparison | Claude Code CLI harness + Claude Agent SDK harness (both consume MCP) |
| `context-engineering.md` | cc-mixed | Palantir-grade ontology impact graph — ImpactEdge + AST walker + SQLite | palantir-mini-sprint-harness substrate (impact graph is Brain-of-Swarms input) |
| `monitors-manifest-schema.md` | cc-mixed | `monitors.json` schema (v2.1.105) + CHANGELOG evidence | Claude Code CLI harness (monitors are CLI-harness side-cars) |
| `managed-agents.md` | cc-evidence | Managed Agents product/API reference (2026-04-08 public beta) | Managed Agents (meta-harness) + internal pre-built harness species |
| `edison-kosmos-analysis.md` | external-comparative | External Edison/Kosmos biomedical agent comparative | External (non-Anthropic harness species) — comparative only |

**Harness vocabulary** — see `~/.claude/rules/CONTEXT.md §15 Glossary` for the canonical taxonomy. Lance Martin "Scaling Managed Agents" (2026-04-08) is the 1차 자료 defining "harness" as a generic concept distinct from any product.

11 `legacy-internal` files (palantir-mini-blueprint / lead-system-v2 / agent-design-opinion / harness-h3-retrospective / harness-h4-canary-run / gap-analysis-palantir-math / monitors-retirement-2026-04-20 / managed-agents-api-free-closeout / opus-4.7-integration / cost-sessions-a-through-a8 / mathcrew-agent-blueprint) deleted 2026-04-29 per user directive ("legacy 문서들도 모두 제거"). History preserved in git.

## Boundary Rules

- Use this library to answer "what can Claude Code do?" and "how should Claude-native overlays be shaped?".
- Do not use it to override project ownership, ontology, or runtime semantics.
- When a Claude-native pattern becomes durable project policy, move it into project docs, rules, tests, or code.
- **New internal palantir-mini synthesis writes to `~/.claude/plans/`** (retrospective / blueprint / gap-analysis / decision-record / cost-log / canary-run / review-prompt / direction-doc). Never write new files into this `claude-code/` directory except for `cc-evidence` or `cc-mixed` CC-runtime evidence updates.
- `class=cc-mixed` files may still receive Claude Code official-evidence updates (new hook events, new manifest keys, new MCP features). Internal application / palantir-mini interpretation additions to these files → `plans/`.
