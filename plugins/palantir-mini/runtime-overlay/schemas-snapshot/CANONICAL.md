# In-plugin SSoT — CANONICAL (promoted 2026-06-07)

> **[STATUS 2026-07-19] palantir-mini is SUPERSEDED by palantir-ontology** (Decision #2: palantir-ontology is the load-bearing successor as the DESTINATION — source merged/validated, runtime DORMANT, activation deferred). This file stays the canonical **self-ontology SOURCE for palantir-mini's own harness schemas**, but pm itself is **OFF/superseded**; it is **NOT** the SSoT for the successor/fleet Ontology (that is `plugins/palantir-ontology/contracts/`). The word "canonical" below is scoped to pm's self-ontology, not the fleet Ontology.

This directory was formerly a synced snapshot of `~/.claude/schemas` (via `scripts/refresh-runtime-overlay.ts --target schemas`). As of the palantir-mini Ground-Up Harness Redesign (W1, 2026-06-07) it is the **canonical, plugin-owned, LLM-agnostic runtime SSoT** — the self-ontology of palantir-mini's harness control-surfaces. The `schemas` sync target has been removed; do NOT re-add it. Upstream `~/.claude/schemas` is retired (pending physical deletion after consumer-check).

**Retirement EXECUTED 2026-07-11** per g12 decision `de-2026-07-11-schemas-authority-ruling-plugin-self-containment-confirmed` (USER-approved): `~/.claude/schemas` was physically deleted (269 tracked files, git-recoverable) after consumer re-pointing; this package is now the SOLE canonical authority for pm self-ontology schemas (rule 08 v2.2.0). The directory name `schemas-snapshot` is historical — it is the SOURCE, not a snapshot of anything.

Taxonomy note: this is the IN-PLUGIN SNAPSHOT / self-ontology (the carried-with-plugin schemas), NOT the DESIGN-authority (`harness-upstream/ssot/palantir/` = the WHY) and NOT the SOURCE-authority (`.ssot-authority.json` = the plugin code).

Edit primitives here directly. `#schemas/*` and `@palantirKC/claude-schemas` resolve here.
