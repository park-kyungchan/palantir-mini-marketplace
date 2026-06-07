---
slug: core-invariants
tier: T1
version: 4.0.0
---
# Core Invariants
8 active rules (Wave-3 rationalization 2026-06-07). Detail: `pm_rule_query({ byId: NN })`. Map: `CONTEXT.md`.

- **Ontology first** (01 v2.1.0): meaning → ontology → contracts → runtime; FwdProp/BwdProp audit handlers.
- **Research/skills/memory** (02 v3.3.0): research/ AI-agent read-only SSoT; ~/docs/ external long-term layer; plugin > user > repo skill resolution.
- **Plugin authority** (07 v1.3.0): plugin.json authoritative; agent file-ownership table + runtime enforcement hook.
- **Schema + codegen** (08 v2.1.0): semver-tracked interface; pm-codegen sole writer of src/generated/**; hook citations must reference active rules.
- **Append-only events** (10 v2.2.0): 5-dim envelope + propagationDepth auto-derived; PreCompact gate blocks non-conformant.
- **Auto-merge + cleanup default** (25 v1.0.0): allowlisted PR auto-merge (sprint-/fix/chore/docs prefix + isDraft=false + mergeable) + branch/worktree cleanup; opt-out via PALANTIR_MINI_AUTOMERGE_BYPASS=1.
- **Valuable data standard** (26 v2.0.0): events.jsonl envelopes graded by 5-dim completeness + outcome-pairing; T0 rejected at emit; T1+ retained; decision+outcome pairs → outcomes.jsonl.
- **Cross-runtime substrate** (27 v1.0.0): events.jsonl shared across runtimes; atomic append via mkdir-mutex; byWhom.identity self-attributes writing runtime; direct file append forbidden.
