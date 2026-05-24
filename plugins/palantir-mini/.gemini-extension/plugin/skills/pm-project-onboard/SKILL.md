---
name: pm-project-onboard
category: core-workflow
description: "Scaffold the minimum palantir-mini ProjectOntologyIndex runtime for a project, then run ontology-runtime health and doc-drift checks."
allowed-tools: Bash Read Write Edit Grep Glob mcp__palantir-mini__pm_health_audit mcp__palantir-mini__emit_event
effort: medium
disable-model-invocation: false
---

# pm-project-onboard

## Purpose

Create the minimum checked-in palantir-mini scaffold for a project without changing application runtime code. Writes exactly 4 files (idempotent: skips any that already exist).

## Workflow

### Step 1 — Resolve project root

Ask the user (or infer from context) the absolute path to the project root. Call it `<project>`.

### Step 2 — Run the scaffold helper

Invoke `runOnboardScaffold` from `lib/project-scope/onboard-scaffold.ts`:

```typescript
import { runOnboardScaffold } from "../../lib/project-scope/onboard-scaffold";

const result = await runOnboardScaffold({
  projectRoot: "<project>",         // absolute path
  writableRoot: ".",                // override if the project uses a non-root writableRoot
  forbiddenPatterns: ["src/generated/**", "node_modules/**"],  // override per project
});
```

This writes the following 4 files (only if absent):

| # | Path | Content |
|---|------|---------|
| 1 | `<project>/.palantir-mini/project-scope.json` | Minimal `ProjectScopeDefinition` with generic defaults, empty axes/lanes/surfaces, `domainAgents: ["implementer", "project-implementer"]`. |
| 2 | `<project>/.palantir-mini/ontology-index/00-bootstrap.json` | `writableRoot`, `forbiddenPatterns`, 1 placeholder capability entry. |
| 3 | `<project>/.palantir-mini/known-issues.json` | `[]` (empty array). |
| 4 | `<project>/.palantir-mini/skill-ontology/skill-registry.json` | `{ "contracts": [] }` (empty contracts). |

**Idempotency rule**: If any file already exists, it is skipped (never overwritten). The result object reports `filesWritten` and `filesSkipped`.

### Step 3 — Run health audit

After writing scaffold files:

```
pm_health_audit({ mode: "ontology-runtime", project: "<project>" })
pm_health_audit({ mode: "doc-drift", project: "<project>" })
```

### Step 4 — Return onboarding report

Report to the user:

- Files written (absolute paths)
- Files skipped (already existed — no action needed)
- Health verdict from `pm_health_audit`
- Drift verdict from `pm_health_audit`
- Recovery notes for any failed health checks

## Edge cases

- **File already exists**: skip + add to `filesSkipped`. Do NOT overwrite. Emit an advisory message naming the skipped file.
- **Project root does not exist**: create it via `fs.mkdirSync(projectRoot, { recursive: true })` before calling the helper. Warn the user that a new project root was created.
- **Education-domain project** (mathcrew, palantir-math): do NOT use this skill to write their `.palantir-mini/project-scope.json`. Those projects have explicit domain-specific scopes. If the user requests onboarding for an education project, advise them to use their project's own scope file instead.
- **`writableRoot` override**: if the project's files live under a subdirectory (e.g. `packages/app`), pass that as `writableRoot`. The scaffold will record it in both `project-scope.json` and `ontology-index/00-bootstrap.json`.

## Boundaries

- Do not edit `src/**`, renderer files, generated files, or production runtime code.
- `UniversalOntologyEntry` and `OntologyContextSeed` are retrieval, scoring, and warning inputs only.
- Mutation authority for broader ontology changes still requires an approved `SemanticIntentContract`, `DigitalTwinChangeContract`, `ProjectScopeDefinition`, and SprintContract.
- Never call this skill for projects that already have a complete `.palantir-mini/project-scope.json` — the idempotency guard handles incremental gaps only.

## §Document corpus placeholder (PR-12)

On first onboarding, operators may place a document corpus at `<project>/.palantir-mini/document-corpus.json`. Use this placeholder:

```json
{
  "schemaVersion": "palantir-mini/document-corpus/v1",
  "documents": [],
  "retrievalMode": "chunk-mode",
  "topK": 5
}
```

Populate `documents` with project-relevant references (BROWSE.md, INDEX.md, ontology docs, design specs) for Chatbot Studio retrieval. Each entry requires `documentId` (stable slug) and `sourcePath` (absolute or workspace-relative path).

The public `ontology_context_query` MCP schema does not expose the older
document-context flag. For supported reference retrieval, use the public
reference-only curriculum fields:

```typescript
ontology_context_query({
  project: "<project>",
  includeCurriculumContext: true,
  curriculumQueryTerms: ["<topic or project term>"],
})
```

Project docs and `/home/palantirkc/docs/**` can be cited as reference evidence
only. Preserve `reference_only` / `not_promoted` semantics until an approved
contract explicitly promotes a source.

Two retrieval modes:
- `full-document` — each document returned as one chunk (truncated to 2000 chars).
- `chunk-mode` — splits on `##` headings, scores chunks by token overlap with prompt nouns/verbs, returns top-K.

## Verification

```bash
bun test tests/skills/pm-project-onboard.test.ts
bunx tsc --noEmit
```
