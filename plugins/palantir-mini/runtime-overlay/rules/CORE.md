---
slug: core-invariants
tier: T1
version: 5.0.0
---
# Core Invariants — 9 active rules (slim 2026-06-10)

> **North star — Ontology-First THROUGH palantir-mini.** pm IS the runtime-agnostic harness; the LLM (Claude/Codex/Gemini) is a swappable **adapter**, not the harness. pm grounds all work in ONE governed Ontology — the codebase's **semantic** (object/property/link/interface) + **kinetic** (action/function) "digital twin", where a decision = **Data+Logic+Action+Security** — so every surface **BINDS** to that one meaning instead of re-deriving it. **Two altitudes:** Altitude-1 — *OntologyEngineering on demand* (the SACRED turn-by-turn 9-axis FDE-session → SemanticIntentContract → SIC→DTC → Claude/Codex build the Ontology; the 9-axis runs HERE only); Altitude-2 — everyday *Ontology-First operation* atop the built ontology. Full intent: memory `pm-intent-and-architecture`.

- **01 ontology-first-core** (v2.1.0): Meaning → ontology → contracts → runtime; forward/backward propagation is load-bearing; never patch runtime first when the issue is semantic.
- **02 research-retrieval** (v3.3.0): research/ is AI-agent read-only SSoT (BROWSE/INDEX-first); ~/docs/ is external long-term synthesis (read-only); internal synthesis writes to plans/; skill resolution plugin > user > repo; MEMORY.md is index-only with typed memory files.
- **07 plugins-and-mcp** (v1.4.0): Plugin manifest (plugin.json) is authoritative for MCP server registration; per-project managed-settings.d/*.json is RBAC fragment; no duplicate MCP registration; collision resolution = plugin > user > repo, fails loud on same-scope exact-name collision.
- **08 schema-versioning** (v2.1.0): ~/.claude/schemas/ is a semver-tracked interface; every edit needs a CHANGELOG entry + semver bump; pm-codegen is sole writer of src/generated/** with mandatory header; never hand-edit generated files; pm-verify gates schema-pin + generated-header.
- **10 events-jsonl** (v2.2.1): events.jsonl is append-only; every ontology edit emits a 5-dim event BEFORE writing files; optional 6th field propagationDepth tracks chain depth (auto-derived from emitter path); PreCompact gate blocks non-conformant compaction.
- **25 auto-merge-cleanup-default** (v1.1.0): Allowlisted PR auto-merges by default with branch/worktree cleanup + working-tree cleanliness check + Wave-split discipline; opt-out via --no-merge or PALANTIR_MINI_AUTOMERGE_BYPASS=1 (audited).
- **26 valuable-data-standard** (v2.0.0): Valuable data = an event that expresses a decision, pairs with an outcome, maps to >=1 agentic memory layer, and is provider-neutral; T0 (5-dim incomplete) rejected at emit; T1+ retained.
- **27 cross-runtime-substrate** (v1.0.0): events.jsonl is a shared substrate; cross-runtime appends use atomic write+rename; byWhom.identity self-attributes the writing runtime.
- **29 fable5-ultracode-workflow-archiving** (v1.1.0): Fable 5 + ultracode Dynamic Workflow runs are archived to harness-upstream reference/fable5-workflows/ (L0 verbatim + L1 card at run end; L2 pattern delta + FAILURES at campaign close); transcripts excluded; purpose = MetaOptimization. Full text: reference/fable5-workflows/RULE.md.

Full rule text: pm_rule_query({ byId: NN }) (plugin overlay). Archived originals: ~/.claude/rules-archive/2026-06-10/. Authoring procedure: pm_rule_query or the archive AUTHORING.md.
