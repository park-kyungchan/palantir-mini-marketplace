---
ruleId: 26
slug: valuable-data-standard
scope: global
version: 2.0.0
invariant: "Valuable data = an event that expresses a decision, pairs with an outcome, maps to >=1 agentic memory layer, and is provider-neutral; T0 (5-dim incomplete) rejected at emit; T1+ retained in events.jsonl."
supersededBy: null
supersedes: []
crossRefs: [10, 27]
hookCitations: [value-grade-assigner]
bodyLocCeiling: 30
---

# Rule 26 — Valuable Data Standard (solo-dev)

## §Definition

Valuable data = an event that ① expresses a decision, ② pairs with an outcome, ③ maps to ≥1 agentic memory layer (working / episodic / semantic / procedural), ④ is provider-neutral.

## §Value-grade-lite

`value-grade-assigner` hook (PreToolUse on emit_event) grades each envelope by 5-dim completeness + outcome-pairing. T0 (5-dim incomplete) → rejected; T1+ retained. Dropped for solo-dev: K≥2 multi-vendor consensus, heavy 5-axes/14-criteria taxonomy, T0–T4 detailed scoring.

## §Substrate routing

T0 → reject; T1+ → events.jsonl; decision+outcome pairs → outcomes.jsonl.

## §Version history

- v2.0.0 (2026-06-07): leaned for solo-dev — dropped multi-vendor consensus + heavy taxonomy; simplified to 5-dim completeness + outcome-pairing gate.
