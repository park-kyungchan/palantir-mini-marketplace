---
ruleId: 29
slug: fable5-ultracode-workflow-archiving
scope: global
version: 1.1.0
invariant: "Every Dynamic Workflow run by a Fable 5 Lead in ultracode mode is archived to ~/harness-upstream/reference/fable5-workflows/ — L0 verbatim artifacts + L1 workflow/campaign card at run end, L2 pattern-catalog delta + FAILURES.md update at campaign close; transcripts and implementation-result JSONs excluded (pointers only); purpose = MetaOptimization."
supersededBy: null
supersedes: []
crossRefs: [2, 26]
hookCitations: []
---

# Rule 29 — Fable 5 ultracode workflow archiving (full body, v1.1.0)

> Overlay body for `pm_rule_query`. Canonical source of truth: `~/harness-upstream/reference/fable5-workflows/RULE.md` (this overlay is vendored from it). Stub: `~/.claude/rules/29-fable5-ultracode-workflow-archiving.md` (frontmatter carries the invariant).
> Status: active. Supersedes: the temporary 2026-06-10 rule, archived byte-identical at `reference/fable5-workflows/archive/2026-06-10-v1-temp-rule.md`.

## §Trigger (deliberately narrow — user decision 2026-06-10)
Lead model = Fable 5 (`claude-fable-5*`) AND effort mode = ultracode AND at least one Dynamic Workflow (Workflow tool) executed. Applies in ANY repo/session where this holds. Other models, other runtimes, plain Agent-tool fan-outs: OUT of scope. When the lead-model generation changes, open a sibling archive lane and bump this rule MINOR.

## §Cadence + layers
- **At each workflow run end (L0+L1):** copy the executed workflow script verbatim (+ design-phase structured outputs and Lead-side design extracts where they exist) into `runs/<date>-<campaign>/`, byte-identical — provenance (session id, runId, source repo, PR, model, sha256) lives ONLY in `INDEX.md`, never injected into artifacts. L0 design-outputs are preferably written by the workflow's own final agent directly into `runs/<...>/design-outputs/` (file-output contract, see `patterns/bounded-structured-output-contract.md` v2); Lead-side copy remains the fallback. Write or extend the campaign card under `runs/<...>/cards/` per `templates/`.
- **At campaign close (PR merged) (L2):** pattern-catalog delta — a NEW pattern gets a new entry under `patterns/`; a recurrence of a known pattern gets ONE evidence line appended to the existing entry. Update `FAILURES.md` with any newly observed failure mode + its structural fix.
- Multi-run campaigns get ONE campaign card; a per-run card is added only when a single run carries novel engineering.

## §What a card captures (the HOW/WHY the raw artifacts cannot)
Topology + rationale (phase shape, barrier vs pipeline, wave split) · delegation contracts (COMMON preamble, APPLY vs DECIDE) · output contracts (schema vs write-to-file) · verification harvest (what adversarial verify caught vs implementer claims) · user-confirm record (userQuestions → decisions → propagation into prompts) · failures + structural fixes · resume lineage · cost shape · pm-design implications. Field definitions: `templates/campaign-card.md`.

## §Exclusions (unchanged from v1)
Full subagent transcripts, implementation-result JSONs, fix/ship outputs, anything reconstructable from git/PRs — pointer only. Rationale: rule 02 (research-retrieval) pointer-not-copy; rule 26 (valuable-data-standard) T1 form.

## §Purpose + sunset
MetaOptimization: continuously distill Fable 5's live Harness Engineering into durable design input — primary consumer = palantir-mini Harness (Agent/Skill/MCP) improvement; secondary = agent-driven analysis of the codebase or any part of it (`BROWSE.md` of this tree is the analysis entry point). When pm-native capture (events / Decision Ledger / registered Skills with their own output contracts) subsumes L1/L2, shrink this body to a stub (retire-by-stub, never delete — AUTHORING §7).

## §Version history
- v1.0.0 (2026-06-10): formalized from the temporary harness-upstream `rules/fable5-workflow-artifact-archiving.md`. ID 29 because 28 is a permanent gap (AUTHORING §19). Home moved from `_workspace/` (effort-scoped, rule 02) to this stable tree.
- v1.1.0 (2026-06-10): file-output contract evolution — final agents write large outputs directly into the archive; pattern entry updated.
