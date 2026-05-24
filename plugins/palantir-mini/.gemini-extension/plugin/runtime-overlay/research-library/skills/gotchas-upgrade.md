---
name: skills-gotchas-upgrade
description: Anthropic skill best practices applied — Gotchas sections + trigger-evals.json added to all 18 skills (2026-03-18)
type: project
---

## Skill Gotchas Upgrade (2026-03-18)

Anthropic "Lessons from Building Claude Code: How We Use Skills" blog post applied.

**Deliverables:**
- 18/18 skills now have `## Gotchas` sections (~105 total gotchas)
- 18/18 skills now have `trigger-evals.json` (20 queries each: 10T/10F)
- 3 verifier-identified fixes applied (Team 1)
- 1 pre-existing bug fixed (`addBlocks` → `addBlockedBy` in orchestrate/SKILL.md)

**Why:** Anthropic says "The highest-signal content in any skill is the Gotchas section." Prior compliance was 0/18.

**How to apply:** When modifying any skill, update its `## Gotchas` section with new failure patterns discovered during use. When creating new skills, always include `## Gotchas` and `trigger-evals.json` from the start.

**Empirical validation (subagent-based trigger eval, 2026-03-18):**
- frontend-qa: 100% accuracy (3/3)
- lsp-audit: 100% accuracy (3/3)
- ontology-begin: 100% pipeline-correct (prompt-builder catches new-project queries as designed)
- pdf, orchestrate: inconclusive (subagents don't inherit plugin skills — need API key for full eval)
- `eval-trigger.ts` updated to use `claude -p` (Max auth, no API key needed) but `claude -p` disables Skill tool
- Subagent spawn method works but has plugin skill inheritance limitation

**Remaining work:**
- Phase 3 (report): Add executable scripts to 5 skills (frontend-qa, lsp-audit, rebuild, ontology-healthcheck, orchestrate)
- Phase 4 (report): Add on-demand hooks to rebuild, orchestrate, ontology-begin
- Phase 5 (report): Create new skills for missing categories (convex-reference, debug-dashboard, adversarial-review, babysit-pr)
- Full 18-skill trigger eval requires ANTHROPIC_API_KEY for Agent SDK or a `claude -p` mode that enables Skill tool
