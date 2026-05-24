---
name: pm-restore
category: maintenance
description: "Re-hydrate canonical ~/palantir-mini from a tarball created by /palantir-mini:pm-portable-bundle. Verifies SHA-256 integrity before extraction."
disable-model-invocation: true
allowed-tools: Read Bash(tar*) Bash(sha256sum*) Bash(mkdir*) Bash(test*) Bash(ls*) Bash(ln*) Bash(rsync*) mcp__plugin_palantir-mini_palantir-mini__emit_event
effort: medium
---

# /palantir-mini:pm-restore — Plugin Rehydration from Tarball

Extracts a portable bundle tarball to `$HOME/palantir-mini/` and verifies integrity. Claude compatibility may be restored with a symlink from `~/.claude/plugins/palantir-mini` to `../../palantir-mini`; that symlink is never semantic authority.

## Argument

`$ARGUMENTS[0]` — path to the `.tar.gz` tarball created by `pm-portable-bundle`.

If no argument provided, list available bundles:

```bash
ls -lh ~/palantir-mini/portable/*.tar.gz 2>/dev/null || echo "No bundles found in ~/palantir-mini/portable/"
```

## Steps

### 1. Validate tarball path

```bash
test -f "$ARGUMENTS[0]" || { echo "Error: tarball not found at $ARGUMENTS[0]"; exit 1; }
```

### 2. Verify SHA-256 against bundle.json

Derive the `.sha256` sidecar path (same directory, same base name + `.sha256`):

```bash
SHA256_FILE="${TARBALL%.tar.gz}.sha256"
if test -f "$SHA256_FILE"; then
  sha256sum --check "$SHA256_FILE" && echo "SHA-256 OK" || { echo "SHA-256 MISMATCH — aborting"; exit 1; }
else
  echo "Warning: no .sha256 sidecar found; skipping integrity check"
fi
```

### 3. Detect bundle layout + extract

Auto-detect bundle layout by inspecting top-level entries. v6.79.0+ bundles
extract canonical `palantir-mini/` directly under `$HOME`; the plugin contains
its own runtime-overlay snapshots for research, schemas, and shared-core.

```bash
TOPLEVEL=$(tar -tzf "$ARGUMENTS[0]" | head -3 | awk -F/ '{print $1}' | sort -u)
if echo "$TOPLEVEL" | grep -q "^palantir-mini$"; then
  # Canonical source bundle — extract to $HOME.
  tar -xzf "$ARGUMENTS[0]" -C "$HOME/"
  mkdir -p ~/.claude/plugins/
  ln -sfn ../../palantir-mini ~/.claude/plugins/palantir-mini # compatibility install target only
  echo "Extracted: ~/palantir-mini/ with runtime-overlay snapshots"
  echo "Claude compatibility symlink: ~/.claude/plugins/palantir-mini -> ../../palantir-mini"
elif echo "$TOPLEVEL" | grep -q "^plugins$"; then
  # Legacy plugin-contained bundle — extract to ~/.claude/ and instruct migration.
  mkdir -p ~/.claude/
  tar -xzf "$ARGUMENTS[0]" -C ~/.claude/
  echo "Extracted legacy compatibility layout: ~/.claude/plugins/palantir-mini/"
  echo "WARNING: legacy layout. Migrate source authority to ~/palantir-mini/ before self-test."
else
  echo "Error: unrecognized bundle layout. Top-level entries: $TOPLEVEL"; exit 1
fi
```

Optional local hydration after extraction:

```bash
if test "$ARGUMENTS[1]" = "--hydrate-local"; then
  rsync -a ~/palantir-mini/runtime-overlay/schemas-snapshot/ ~/.claude/schemas/
  rsync -a ~/palantir-mini/runtime-overlay/research-library/ ~/.claude/research/
  mkdir -p ~/ontology/shared-core/
  rsync -a ~/palantir-mini/runtime-overlay/ontology-shared-core/ ~/ontology/shared-core/
fi
```

### 4. Suggest reload and self-test

```
Extraction complete.

Next steps:
  1. Reload plugins: /reload-plugins  (or restart Claude Code session)
  2. Verify substrate: /palantir-mini:pm-self-test

If /reload-plugins is unavailable, restart the Claude Code session to pick up
the newly installed plugin.
```

### 5. Emit event

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  project: "<cwd>",
  envelope: {
    type: "plugin_restored",
    eventId: "evt-restore-<timestamp>",
    when: "<ISO8601>",
    atopWhich: "<git HEAD or 'unknown'>",
    throughWhich: { sessionId: "pm-restore", toolName: "pm-restore", cwd: "<cwd>" },
    byWhom: { identity: "claude-code", agentName: "Lead" },
    withWhat: { reasoning: "Restored plugin from portable tarball." },
    payload: { tarball: "<path>", integrityCheck: "pass|skipped" }
  }
})
```

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — `plugin_restored` emitted after successful extraction.
- `~/.claude/rules/07-plugins-and-mcp.md` — canonical source lives at `~/palantir-mini`; `~/.claude/plugins/palantir-mini` is a compatibility/install target.
