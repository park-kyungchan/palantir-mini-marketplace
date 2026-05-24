---
name: palantir-skill
description: /palantir skill — Code-to-NL translator for learning Palantir AIP/Foundry/Ontology through research→schemas authority chain
type: project
---

/palantir skill created (2026-03-18):
- Code ↔ NL translator for Palantir domain + TS/Bun pattern learning
- 4 input modes: concept-based, file-based, domain-based, free question
- English-primary with Korean annotations (병기)
- Deep Dive by default — exhaustive, no summarizing
- Authority chain: research/ (`palantir-developers/` + `palantir-foundry/` + `palantir-vision/`) → schemas/ontology/ (560K .ts)
- E2E tested: 26 agents, 21 schema files, 22,277 lines output total
- SKILL.md improved post-E2E: Summary Statistics block, large file chunking guide, test assertions in free-question mode, domain test file inclusion in Mode 3
- Trigger evals: 20 queries (10 should-trigger + 10 should-not-trigger) at palantir/evals/trigger-evals.json
- Workspace: palantir-workspace/iteration-1/ (26 output.md files)

**Why:** User wants to learn Palantir ontology concepts AND TypeScript patterns simultaneously through the codebase they built. Self-study tool.

**How to apply:** When user says /palantir, 팔란티어 학습, schema 학습, or asks about research/schemas authority chain concepts. Explicit invocation only — no auto-trigger.
