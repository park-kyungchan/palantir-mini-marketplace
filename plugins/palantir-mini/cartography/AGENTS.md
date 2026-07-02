<!-- GENERATED FILE — do not edit. Regenerate: bun run gen:cartography (source: agents/*.md) -->


# AGENTS — generated agent map

One row per `agents/<name>.md` (excluding `agents/.archived/`), parsed from frontmatter. See `CARTOGRAPHY.md` routing table ("Add/modify an agent") for the source-of-truth rule.

| Name | Model | maxTurns | Tools | Description |
|---|---|---|---|---|
| docs-researcher | sonnet | 40 | 16 — Read, Write, Edit, Glob, +12 more | Sonnet-powered research + synthesis + write specialist. Use for producing SSoT research documents where deep… |
| hook-builder | sonnet | 80 | 8 — Read, Write, Edit, Glob, +4 more | palantir-mini plugin hook + monitor + script specialist. Writes or modifies TypeScript under plugins/palantir… |
| implementer | sonnet | 80 | 9 — Read, Write, Edit, Glob, +5 more | Focused execution specialist for coding, refactoring, and file modifications. Use when the Lead assigns imple… |
| ontology-steward | sonnet | 40 | 8 — Read, Write, Edit, Glob, +4 more | Shared-schema + shared-core ontology steward. Owns primitive promotion and deprecation workflow across ~/.cla… |
| plugin-maintainer | sonnet | 80 | 7 — Read, Write, Edit, Glob, +3 more | palantir-mini plugin maintenance specialist. Owns version sync across plugins/palantir-mini/.codex-plugin/plu… |
| project-implementer | sonnet | 80 | 9 — Read, Write, Edit, Glob, +5 more | Project-scoped execution specialist for coding, refactoring, and file modifications INSIDE a registered consu… |
| protocol-designer | sonnet | 80 | 7 — Read, Write, Edit, Glob, +3 more | Claude-local rule authoring specialist. Writes ~/.claude/rules/* markdown with correct cross-references, ters… |
| researcher | sonnet | 30 | 14 — Read, Glob, Grep, WebFetch, +10 more | Deep research specialist for multi-angle information gathering. Use when the Lead needs parallel research on… |
| second-brain-fold | sonnet | 6 | 2 — Bash, Read | Fold ONE unfolded session transcript into the project second-brain knowledge graph, then governed-emit its li… |
| verifier | sonnet | 30 | 6 — Read, Glob, Grep, Bash, +2 more | Verification specialist spanning correctness AND adversarial review. Use after teammates produce outputs to v… |

Policy: all agents MUST be model: sonnet — enforced by pm_plugin_self_check mode=agent-model-policy.
