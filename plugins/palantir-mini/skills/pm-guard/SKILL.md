---
name: pm-guard
category: core-workflow
surfaceStatus: public-core
description: "Full safety mode — destructive command warnings + directory-scoped edits. Combines..."
allowed-tools: Read Write Edit Grep Glob Bash
effort: medium
disable-model-invocation: false
---

# /palantir-mini:pm-guard — Full Safety Mode

Activates both destructive command warnings and directory-scoped edit restrictions.
This is the combination of destructive-command guarding and edit-boundary freezing in a single command.

## Setup

Ask the user which directory to restrict edits to. Use:

- Question: "Guard mode: which directory should edits be restricted to? Destructive command warnings are always on. Files outside the chosen path will be blocked from editing."
- Text input (not multiple choice) — the user types a path.

Once the user provides a directory path:

1. Resolve it to an absolute path:
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. Ensure trailing slash and save to the freeze state file:
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.palantir-mini}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "Freeze boundary set: $FREEZE_DIR"
```

Tell the user:
- "**Guard mode active.** Two protections are now running:"
- "1. **Destructive command warnings** — rm -rf, DROP TABLE, force-push, etc. will warn before executing (you can override)"
- "2. **Edit boundary** — file edits restricted to `<path>/`. Edits outside this directory are blocked."
- "To remove the edit boundary, delete the freeze-dir state file (`$STATE_DIR/freeze-dir.txt`). To deactivate everything, end the session."

## What's protected

**Destructive command patterns** (warn before executing, override allowed): `rm -rf`, `git push --force`/`git push -f`, `git reset --hard`, `git clean -fd`, `DROP TABLE`/`DROP DATABASE`, `TRUNCATE`, and similar irreversible deletes. Safe exceptions: reads, dry-runs, and scoped operations inside temp/build directories pass without a warning.

**Edit boundary enforcement:** the boundary path is read from `$STATE_DIR/freeze-dir.txt` (written during Setup above). Any Edit/Write whose target resolves outside that directory is blocked; targets inside the boundary pass. Removing the state file lifts the restriction.
