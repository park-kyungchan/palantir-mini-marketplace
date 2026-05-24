---
ruleId: 23
slug: project-rule-formalization
scope: global
version: 1.0.0
invariant: "Project-scope rules under <project>/.claude/rules/ MUST carry standard frontmatter (ruleId, slug, scope, version, invariant); non-standard rules have 1 sprint to migrate before pm_rule_audit flags them."
supersededBy: null
supersedes: []
crossRefs: [7, 21]
hookCitations: []
bodyLocCeiling: 35
---

# Rule 23 — Project-Rule Formalization

Project-scope rules exist in `<project>/.claude/rules/` and are valid extensions of the global rules/ system. However, rules without standard frontmatter are invisible to `pm_rule_query`, `pm_rule_audit`, and `rule-drift-detect` — they silently escape all health checks.

## §Required frontmatter (project-scope)

```yaml
---
ruleId: <integer, project-local namespace, e.g. 1-99>
slug: <kebab-case>
scope: project:<project-id>
version: <semver>
invariant: "<≤1 sentence>"
supersededBy: null
crossRefs: []
hookCitations: []
---
```

## §Migration path for non-standard rules

- Cursor-style (`description`/`globs` only) → add standard fields alongside; Cursor fields may remain as extras.
- Rules with NO frontmatter → add frontmatter block; treat as v1.0.0 initial.
- `pm_rule_audit` reports `nonStandardProjectRules` in health output.
- 1-sprint migration window from first detection; after window, `session-start` advisory escalates to blocking on non-conformant project rules.

## §Scope isolation

- Project-scope rule IDs (integers) are local to that project. No global registry conflict.
- Global rule 07 file-ownership table does NOT govern project rules; project Lead owns them.
