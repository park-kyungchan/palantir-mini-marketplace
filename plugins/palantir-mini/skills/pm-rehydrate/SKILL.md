---
name: pm-rehydrate
category: maintenance
surfaceStatus: public-core
description: "One-pass user-scope → plugin-scope migration helper per 06-plugin-only-architecture.m..."
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash(cp*), Bash(mkdir*), Bash(test*), Bash(diff*), Bash(jq*), Bash(claude*), mcp__plugin_palantir-mini_palantir-mini__emit_event
effort: medium
---

# /palantir-mini:pm-rehydrate

One-pass copy of user-scope `~/.claude/agents/` and `~/.claude/skills/` assets into `~/.claude/plugins/palantir-mini/agents/` + `~/.claude/plugins/palantir-mini/skills/`. Non-destructive: skips files already present at plugin path; never modifies user-scope.

## When to use

- Fresh-machine setup where user-scope `~/.claude/{agents,skills}/` exists but plugin copies are missing (e.g. older clone before v2.23.0 ship).
- Repair after accidental plugin-tree wipe.
- Pre-flight before Phase 3 user-scope deletion (v3.0.0): verify all migrations landed.

NOT a migration replacement — Phase 1 (v2.23.0) ships full plugin copies as part of the regular release. This skill exists for repair / sanity-check workflows.

## Behavior

For each entry in the migration matrix below, the skill:

1. Tests whether the plugin path already has the file.
2. If missing, copies the user-scope source verbatim into the plugin path.
3. Records action: `copied` / `skipped (already present)` / `error (with reason)`.
4. Emits `agent_migrated` or `skill_migrated` event (5-dim envelope) per copy action.
5. Writes a manifest at `~/.claude/plans/<YYYY-MM-DD>-rehydration-manifest.md`.

## Migration matrix

### Agents (9 COPIES per `06-plugin-only-architecture.md §4.1`)

| User-scope source | Plugin destination | Action |
|-------------------|-------------------|--------|
| `~/.claude/agents/researcher.md` | `~/.claude/plugins/palantir-mini/agents/researcher.md` | COPY |
| `~/.claude/agents/docs-researcher.md` | `~/.claude/plugins/palantir-mini/agents/docs-researcher.md` | COPY |
| `~/.claude/agents/implementer.md` | `~/.claude/plugins/palantir-mini/agents/implementer.md` | COPY (generic) |
| `~/.claude/agents/verifier-correctness.md` | `~/.claude/plugins/palantir-mini/agents/verifier-correctness.md` | COPY |
| `~/.claude/agents/verifier-adversarial.md` | `~/.claude/plugins/palantir-mini/agents/verifier-adversarial.md` | COPY |
| `~/.claude/agents/protocol-designer.md` | `~/.claude/plugins/palantir-mini/agents/protocol-designer.md` | COPY |
| `~/.claude/agents/hook-builder.md` | `~/.claude/plugins/palantir-mini/agents/hook-builder.md` | COPY |
| `~/.claude/agents/plugin-maintainer.md` | `~/.claude/plugins/palantir-mini/agents/plugin-maintainer.md` | COPY |
| `~/.claude/agents/ontology-steward.md` | `~/.claude/plugins/palantir-mini/agents/ontology-steward.md` | COPY |

NOT copied (intentional):
- `doc-writer.md` — merged into docs-researcher Phase 1
- `pm-implementer.md`, `mc-implementer.md`, `kosmos-implementer.md`, `home-implementer.md` — absorbed via task-brief scope injection at spawn time

### Skills (4 COPIES + 1 shared ref per `06-plugin-only-architecture.md §5`)

| User-scope source | Plugin destination | Action |
|-------------------|-------------------|--------|
| `~/.claude/skills/orchestrate/` | `~/.claude/plugins/palantir-mini/skills/pm-orchestrate/` | COPY + rename |
| `~/.claude/skills/lsp-audit/` | `~/.claude/plugins/palantir-mini/skills/pm-lsp-audit/` | COPY + rename |
| `~/.claude/skills/palantir-walk-build/` | `~/.claude/plugins/palantir-mini/skills/pm-walk-build/` | COPY + rename |
| `~/.claude/skills/palantir-walk-analyze/` | `~/.claude/plugins/palantir-mini/skills/pm-walk-analyze/` | COPY + rename |
| `~/.claude/skills/palantir-walk-shared/REFERENCE.md` | `~/.claude/plugins/palantir-mini/skills/_shared/walk-reference.md` | COPY (single file) |

NOT copied:
- `tavily-cli/` — retired 2026-04-20 (Phase A-8); scrapling MCP family supersedes

## Procedure

1. **Pre-check**: confirm plugin tree exists. If `~/.claude/plugins/palantir-mini/` is missing, abort with instruction to install plugin first.

2. **Walk agents matrix**: for each row, run
   ```bash
   test -f <plugin-dest> || cp <user-scope-source> <plugin-dest>
   ```
   Record action per row.

3. **Walk skills matrix**: for each row, run
   ```bash
   test -d <plugin-dest> || cp -r <user-scope-source> <plugin-dest>
   ```
   For shared ref (single file), `mkdir -p` parent then `cp`.

4. **Verify precedence** (read-only): `claude agents --json | jq '.agents[] | {name, source}'` — show that user-scope wins for the 9 agent names (precedence inversion per Anthropic sub-agents docs). This confirms Phase 1 dormancy: copies present, user-scope still effective. Phase 3 (v3.0.0) deletes user-scope; only THEN do plugin copies become effective.

5. **Emit events**: for each copy action, invoke `mcp__plugin_palantir-mini_palantir-mini__emit_event` with:
   - `type: "agent_migrated"` or `type: "skill_migrated"`
   - `payload: { source: <user-scope-path>, destination: <plugin-path>, action: <copied|skipped|error> }`
   - 5-dim envelope: `byWhom: { agent: "pm-rehydrate" }`, `withWhat: { reasoning: "v2.23.0 Phase 1 rehydration helper", hypothesis: "user-scope assets needed plugin copies for portable bundle" }`.

6. **Write manifest**: produce `~/.claude/plans/<YYYY-MM-DD>-rehydration-manifest.md`:
   ```markdown
   # pm-rehydrate manifest — <YYYY-MM-DD>

   ## Agents
   - researcher: <copied|skipped|error>
   - docs-researcher: <...>
   - ... (all 9 rows)

   ## Skills
   - orchestrate → pm-orchestrate: <...>
   - lsp-audit → pm-lsp-audit: <...>
   - palantir-walk-build → pm-walk-build: <...>
   - palantir-walk-analyze → pm-walk-analyze: <...>
   - palantir-walk-shared/REFERENCE.md → _shared/walk-reference.md: <...>

   ## Counts
   - Agents copied: N
   - Agents skipped (already present): M
   - Agents error: K
   - Skills copied: N
   - Skills skipped: M
   - Skills error: K

   ## Precedence note
   Plugin agents are scope-priority 5 (lowest) per https://code.claude.com/docs/en/sub-agents.
   Phase 1 copies are dormant while user-scope exists. Phase 3 (v3.0.0) deletes
   user-scope to make plugin copies effective.
   ```

7. **Report**: print summary to user — total counts + manifest path + suggestion to run `/palantir-mini:pm-self-test` to verify substrate health.

## Error handling

- Missing user-scope source: record `error: source not found` and continue. Do NOT abort the whole run.
- Permission denied: report and continue.
- Existing destination differs from source (drift detected): record `skipped (drift detected — manual reconciliation needed)` with file paths. Do NOT overwrite without user direction.

## Constraints

- **Non-destructive**: never delete user-scope files. Phase 3 (v3.0.0) handles deletion as a separate operation.
- **Idempotent**: running twice produces same end state — second run skips all (all destinations exist).
- **No version bump**: this skill does not modify `plugin.json` / `marketplace.json` / `package.json` / `CHANGELOG.md` — that's `plugin-maintainer` scope per rule 07.
- **No frontmatter rewrite**: copies are verbatim. The Phase 1 v2.23.0 release ships pre-tuned plugin frontmatter; this skill is for repair / sanity-check only.
