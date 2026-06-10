---
ruleId: 0
slug: rules-authoring
scope: global
version: 1.0.0
tier: T2
invariant: "On-demand authoring/versioning/enforcement detail for the rules/ system (split out of CONTEXT.md to cut per-turn tokens); fetch only when AUTHORING, AMENDING, or RETIRING a rule. Section numbers (§4-§13, §16, §18, §19) preserved from CONTEXT.md."
supersededBy: null
crossRefs: [0]
hookCitations: [rule-bottleneck-watch, rule-drift-detect, rule-citation-validate]
mandatoryLoad: false
audience: [protocol-designer, claude-lead]
bodyLocCeiling: 170
---

# Rules System — Authoring & Maintenance (on-demand)

> Split from `CONTEXT.md` (v3.6.0, 2026-06-10) to cut per-turn tokens. CONTEXT.md keeps the every-turn
> framing; THIS holds the rule-authoring procedure — fetch it only when writing/amending/retiring a rule.
> Section numbers preserved (CONTEXT.md cross-refs to §4-§13/§16/§18/§19 resolve here).

## §4 — Numbered-ID stability contract (load-bearing)

Rule numbers are a **stable API** (they appear in hook blocking messages, skills, agents, plans, CHANGELOGs, PRs, cross-refs). Active set + permanent gaps = `CORE.md`; live snapshot = `pm_rule_audit`.

1. **Never rename** a rule's ID (breaks hook messages).
2. **Never recycle** a deleted ID — permanent gap forever (preserves old-PR readability).
3. **New rules** get the next-available number (`pm_rule_audit`).
4. **Slugs** are softer — renameable with a MAJOR bump + deprecation window. Numbers are forever.
5. **Scope migrations are one-way**: global → plugin or → project, never the reverse.
6. **§12-license suspensions** are one-time, scoped, explicit; ID stability re-locks on cleanup; each event recorded in the originating `~/.claude/plans/` blueprint + CORE.md gap list.

## §5 — Frontmatter schema (Rule primitive)

Every T2 rule MUST carry frontmatter (hooks + `pm_rule_query` depend on it); CONTEXT/CORE are exempt but carry it for consistency.

```yaml
ruleId: <number>        # active set in CORE.md; next available via pm_rule_audit
slug: <kebab-case>
scope: global | plugin:<id> | project:<id>
version: <semver>       # MINOR add / MAJOR rename-supersede / PATCH doc
invariant: "<=1 sentence>"   # CORE.md inlines this
supersededBy: <ruleId> | null
supersedes: [<ruleId>, ...]
crossRefs: [<ruleId>, ...]
hookCitations: [<hook-name>, ...]
```

- `invariant`: the 1-sentence distillation CORE.md auto-generates from.
- `supersededBy`/`supersedes`: deprecation pointers (delete under §12 license; else stub-redirect).
- `crossRefs`: `pm_rule_query withContext:true` auto-fetches neighbors.
- `hookCitations`: `rule-drift-detect` verifies no hook cites a deleted/renamed rule.

## §6 — Authoring a new rule

Belongs in `rules/` ONLY IF all three: **Behavioral** + **Enforceable** (hook/audit/MCP) + **Cross-project OR pm-core**. Else: project-local → `<project>/.claude/rules/`; structural → `schemas/`; finding → `research/`.

1. Draft a 1-sentence invariant (can't compress → split).
2. Body ≤30 LOC: frontmatter + invariant + rationale (2-3 lines) + mechanics (3-5 lines) + crossRefs.
3. Filename `NN-slug.md` (next via `pm_rule_audit`; kebab slug, no version suffix).
4. Update dependents: CORE.md invariant line, BROWSE.md row, MEMORY.md counter, hookCitations.
5. PR branch `docs/rules-NN-<slug>-<date>`; reviewer `protocol-designer`; merge needs `rule-bottleneck-watch` green.

## §7 — Amending

- **PATCH** (body tweak): bump PATCH, no CHANGELOG.
- **MINOR** (additive invariant): bump MINOR + update CORE.md if distillation changes.
- **MAJOR** (invariant change): bump MAJOR; if it fundamentally changes → NEW rule, mark old `supersededBy`; hook citations migrate over 1 MINOR window.
- **Retire (default)**: stub body + `supersededBy`; don't delete (preserves PR history).
- **Retire (§12-license)**: full deletion only under explicit blueprint license; number → permanent gap.

## §8 — palantir-mini integration (the bottleneck killer)

Every-turn load stays small because pm provides on-demand lookup.

**§8.1 MCP handlers**

| Handler | Use |
|---------|-----|
| `pm_rule_query({ byId? \| bySlug? \| byQuery?, compact?, scope?, withContext? })` | get / list / search rules |
| `pm_rule_audit()` → `{ driftLines, bottleneckFlags, staleCrossRefs, unclaimedHookCitations }` | health check |

Handlers emit 5-dim lineage events (BackwardProp visibility into which rules get used; 0-fetch-30d → retirement candidate).

**§8.2 Hook inlining**: a blocking hook fetches + inlines the cited rule's invariant (`=== RULE NN INVARIANT === …` + `pm_rule_query({ byId: NN })` for full text), so user + agent recover without a tool call.

**§8.3 Enforcement hooks**:
- `rule-bottleneck-watch` (PreCompact): scans file sizes; fires on T1 >300 LOC, T2 >30 LOC/file (unless `bodyLocCeiling`), T2 total >600.
- `rule-drift-detect` (SessionStart): registered-vs-file count, MEMORY.md counter, every `hookCitations` entry resolves to a live hook.
- `rule-citation-validate` (PostToolUse:Edit on hooks/*.ts): every `rule NN` in hook source is a live rule.

**§8.4 Skills**: `/palantir-mini:pm-rule <id-or-slug>` (wraps `pm_rule_query`); `/palantir-mini:pm-rule-audit`.

## §9 — Scope + precedence

Highest wins: project-local → plugin-scope → global → CLAUDE.md (project) → schema primitive. Narrower scope wins. Don't duplicate bodies across scopes — supersede or scope-migrate.

## §10 — Anti-patterns (do NOT)

1. Duplicate invariant across rules — merge.
2. Embed code in a rule — rules describe, hooks/MCP implement.
3. Cite rule by number without slug — `"rule 10 (events-jsonl)"` survives renames.
4. Author without frontmatter — breaks `pm_rule_query` + hooks.
5. Rule as workaround doc — workarounds → code comments / PR.
6. Exceed hard ceilings — split (or blueprint exception).
7. Silent deletion — retire via stub + `supersededBy` (except §12 license).
8. Project-specific rule at global scope — move to `<project>/.claude/rules/`.
9. Cite a retired/nonexistent rule — `rule-drift-detect` catches.
10. Conflate rule version with schemas version — independent semver lanes.

## §11 — "Where does this knowledge go?" flowchart

```
Durable behavior agents follow across sessions?
├─ No  → code comment / PR / session-local memory.
└─ Yes → Enforceable via hook/audit/MCP?
   ├─ No  → Structural → schemas/ ; else finding → research/.
   └─ Yes → Cross-project? Yes → ~/.claude/rules/ ; No → <project>/.claude/rules/.
```

## §12 — Ceiling invariants

| Limit | Hard | Soft | Enforcer |
|-------|------|------|----------|
| `CORE.md` | 25 | 20 | rule-bottleneck-watch |
| `CONTEXT.md` | 400 | 350 | rule-bottleneck-watch |
| `BROWSE.md` | 20 | 15 | rule-bottleneck-watch |
| T1 total | 445 | 385 | rule-bottleneck-watch |
| T2 per body | 30 (or `bodyLocCeiling`) | 20 | rule-bottleneck-watch |
| T2 catalog | 600 | 400 | pm_rule_audit |
| Every-turn tok (T1 + CLAUDE.md + MEMORY top-200) | 8,000 | 5,000 | session-start |

Bust options (priority): trim existing → split → move detail to research/ → scope-migrate → LAST: ceiling raise via blueprint + user approval.

## §13 — Maintenance

`CONTEXT.md`/`AUTHORING.md` = `ruleId 0`, versioned per §5. Amend on new MCP/hook, authoring/ceiling/scope change, or a new anti-pattern. Author = `protocol-designer`/Lead; user approves MINOR+. (Cross-runtime coexistence = CONTEXT.md §13.5, kept there as every-turn operational context.)

## §16 — References

- Rule primitive: `~/.claude/schemas/ontology/primitives/rule.ts`.
- MCP handlers / enforcement hooks: pm plugin source `bridge/handlers/pm-rule-*.ts`, `hooks/rule-audit.ts`.
- Authority: `~/.claude/CLAUDE.md` §Authority Chain.
- Design history (3-tier redesign PR #123, §12 consolidations, Wave-3 rationalization, the 2026-06-10 CONTEXT/AUTHORING split): pm-marketplace + harness-upstream git history (blueprints in `~/.claude/plans/` rotate — query, don't pin).

## §18 — ForwardProp/BackwardProp audit substrate

W6 MCP handlers (schemas primitives `Propagation{Audit,Replay,Health}Payload`):

| Handler | Direction | Purpose |
|---------|-----------|---------|
| `propagation_audit_forward` | research → runtime | each layer transition intact |
| `propagation_audit_backward` | runtime → ontology | drift between outcomes and ontology |
| `propagation_chain_health` | both | composite per-step health |
| `pm_research_citation_validate` | research | citations resolve to live files |

Run forward before cross-layer schema promotions/refactors; backward when runtime diverges from ontology. `propagationDepth` (rule 10) feeds chain reconstruction. Cross-refs: rule 01 §FwdProp/BwdProp, rule 10 §propagationDepth.

## §19 — Appendix: retirements + permanent gaps

Retired 2026-04-29 (§12 license): 06+13+14+15→12; 11→08; 09→02. Retired 2026-06-07 (Wave-3 solo-dev rationalization, 17→8 active): 12+16+19+20+21+23+24+28 dropped; 22 folded into 08. **Permanent gaps**: 03/04/05/12/16/17/18/19/20/21/22/23/24/28. Conflict precedence: higher-numbered wins; CLAUDE.md outranks rules; schemas outrank on structure.
