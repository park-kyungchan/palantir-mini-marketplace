<!-- GENERATED FILE — do not edit. Regenerate: bun run gen:cartography (source: skills/*/SKILL.md) -->


# SKILLS — generated skill map

One row per `skills/<name>/SKILL.md`, parsed from frontmatter. See `CARTOGRAPHY.md` routing table ("Add/modify a skill") for the source-of-truth rule.

| Name | Model | Effort | Category / Status | Description |
|---|---|---|---|---|
| pm-ai-fde-route | — | medium | core-workflow / public-core | Route a user prompt to the appropriate AI FDE mode (8 canonical modes) + suggest... |
| pm-aip-agent-author | — | high | core-workflow / public-core | Author an AIPAgentDeclaration (Palantir AIP Chatbot Studio / AI FDE-style governed... |
| pm-blueprint | — | medium | research / public-core | Generate a TechBlueprint for a new architecture question using a 7-agent research... |
| pm-codegen | — | low | maintenance / public-core | Run palantir-mini codegen to regenerate <project>/src/generated/ from... |
| pm-cold-start-orchestrate | — | high | core-workflow / public-core | Manually invoked (or Lead-invoked) — deep-injects canonical research BROWSE+INDEX... |
| pm-dirty-classify | — | small | maintenance / public-core | Manual triage of working-tree dirt via 4-axis classifier (auto-regen /... |
| pm-dtc-fill | — | low | core-workflow / public-core | Turn-by-turn DTC (DigitalTwinChangeContract) fill conversation. Use after SIC... |
| pm-eval-suite | — | high | maintenance / public-core | AIP-Evals lifecycle — author \| run \| compare modes over an EvaluationSuite (test... |
| pm-fde-session-preview | — | medium | core-workflow / public-core | Show a read-only FDE Ontology Build Session preview — mission/object/link/action/func... |
| pm-guard | — | medium | core-workflow / public-core | Full safety mode — destructive command warnings + directory-scoped edits. Combines... |
| pm-hitl-feedback-workbench | — | low | core-workflow / public-core | Use the generic HITL Lead Feedback Workbench to create user-review artifacts for any... |
| pm-impact-quick | — | low | maintenance / public-core | 1-call wrapper for impact_query + pm_substrate_query (mode workflow) targeting a... |
| pm-init | — | medium | core-workflow / public-core | Bootstrap palantir-mini for a project. Creates <project>/.palantir-mini/session/... |
| pm-intent-to-ontology | — | — | core-workflow / public-core | 1-call wrapper for the 6-step Intent-to-Ontology Protocol (sprint-063 W2.C... |
| pm-investigate | — | — | core-workflow / public-core | Systematic root-cause debugging. Four phases — investigate, analyze, hypothesize,... |
| pm-learn | — | — | research / public-core | Manage cross-session project learnings. Review, search, prune, export, and log... |
| pm-lineage | — | low | maintenance / public-core | Cross-project workflow lineage query — joins events.jsonl across registered +... |
| pm-lsp-audit | — | high | maintenance / public-core | Comprehensive codebase audit using LSP-powered TypeScript code analysis. Finds dead... |
| pm-mcp-reload | — | medium | maintenance / public-core | Guide the user through MCP server module reload after a bridge handler edit —... |
| pm-memory-map | — | low | research / public-core | 4-layer agentic memory balance audit (working / episodic / semantic / procedural). |
| pm-ontology-branch-create | — | medium | core-workflow / public-core | Create an OntologyBranchDeclaration (Foundry Global Branching / AI FDE working... |
| pm-ontology-drift-propose | — | medium | core-workflow / public-core | MANUAL drift propose-step — compose re-elevation GlobalBranchingProposals from a... |
| pm-ontology-engineering-lead | — | medium | core-workflow / public-core | Docs-only Lead workflow for session-first ontology engineering. |
| pm-ontology-proposal-create | — | medium | core-workflow / public-core | Create an OntologyProposalDeclaration (or GlobalBranchingProposal v1.40+) from a... |
| pm-ontology-proposal-review | — | medium | core-workflow / public-core | Append review verdict to an existing OntologyProposal/GlobalBranchingProposal —... |
| pm-orchestrate | opus | high | core-workflow / public-core | Ontology-Driven work orchestration for complex multi-step tasks. Enforces a 6-phase... |
| pm-pr-impact | — | low | maintenance / public-core | PR-scoped impact analysis — diffs current branch vs base, computes downstream blast... |
| pm-project-onboard | — | medium | core-workflow / public-core | Scaffold the minimum palantir-mini ProjectOntologyIndex runtime for a project, then... |
| pm-recap | — | low | maintenance / public-core | Produce a /recap-compatible summary (Claude Code v2.1.114+ Native Runtime, plugin... |
| pm-replay | — | low | maintenance / public-core | Deterministic BackwardProp replay of events.jsonl filtered by 5-dim Decision Lineage... |
| pm-research | — | medium | research / public-core | Research-library lifecycle: diff \| refresh \| audit modes (drift, re-fetch, staleness). |
| pm-retro | — | — | research / public-core | Engineering retrospective. Aggregates session metrics from the palantir-mini... |
| pm-review | — | — | core-workflow / public-core | Pre-landing PR review. Analyzes diff against the base branch for SQL safety, LLM... |
| pm-rule-audit | — | low | maintenance / public-core | Comprehensive rules/ health check via palantir-mini MCP. Detects T1/T2 bottleneck... |
| pm-rule-memory-prune | — | medium | maintenance / public-core | Unified prune-candidate list combining pm_rule_audit (unused_rule_30d findings) +... |
| pm-self-test | — | high | maintenance / public-core | End-to-end smoke test of the plugin-only substrate. Runs schema pin check, codegen... |
| pm-semantic-intent-gate | — | medium | core-workflow / public-core | Maintain the FDE-to-contract front door: FDE meaning discovery, SIC boundary, DTC... |
| pm-ship | — | — | core-workflow / public-core | Ship workflow — detect + merge base branch, run tests, audit coverage, review diff,... |
| pm-t4-promotion-review | — | high | research / public-core | Audit T4-graded events (rule 26 §Substrate routing top tier — T3 + D2 K-LLM... |
| pm-understand | — | medium | core-workflow / public-core | Run the 9-axis understand-phase (the harness heart): surface a request's explicit... |
| pm-value-audit | — | high | maintenance / public-core | Substrate health dashboard (rule 26 valuable-data) + AIP no-slop Three Questions... |
| pm-verify | — | high | core-workflow / public-core | Run the palantir-mini validation pipeline against a project — executes Design +... |
| pm-walk-analyze | — | medium | research / public-core | Mode B (Project Analysis): Walk real production ontology code for any registered... |
| pm-walk-build | — | medium | research / public-core | Mode A (Small Block): Build ontology entities step by step using scene-based... |
