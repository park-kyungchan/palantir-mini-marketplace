# rules/ — Query Router v4.0.0

Claude-local overlay only. Full context: `~/.claude/rules/CONTEXT.md`. Invariants: `~/.claude/rules/CORE.md`. Per-rule detail: `pm_rule_query({ byId: NN })`.

| Question | Open |
|----------|------|
| ontology-first, propagation, FwdProp/BwdProp audit | pm_rule_query byId=1 |
| BROWSE/INDEX-first retrieval, skills, memory, ~/docs/ layer | pm_rule_query byId=2 |
| plugin manifest + multi-plugin precedence | pm_rule_query byId=7 or 19 |
| schema semver + codegen authority | pm_rule_query byId=8 |
| events.jsonl + 5-dim + propagationDepth | pm_rule_query byId=10 |
| Lead Protocol + lazy-spawn + task granularity + session | pm_rule_query byId=12 |
| sprint-harness species (one of 5) + B2 default-on | pm_rule_query byId=16 |
| swarm orchestration mode + lead dispatch router | pm_rule_query byId=20 or 24 |
| project-agent authority + project-rule formalization | pm_rule_query byId=21 or 23 |
| hook citation validation | pm_rule_query byId=22 |
| auto-merge default + working-tree cleanliness + post-merge cleanup | pm_rule_query byId=25 |
| valuable data standard + T0-T4 grading + 5-axes 14-criteria + agentic memory | pm_rule_query byId=26 |
| pedagogy contract (project-scope) | projects/mathcrew/.claude/rules/06 |
| Authoring + system internals + Brain-of-Swarms | `CONTEXT.md` |
