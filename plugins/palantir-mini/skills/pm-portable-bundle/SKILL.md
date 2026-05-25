---
name: pm-portable-bundle
category: maintenance
description: "Export the canonical palantir-mini source payload to a tarball at plugins/palantir-mini/portable/."
disable-model-invocation: true
allowed-tools: Read Bash(tar*) Bash(gzip*) Bash(sha256sum*) Bash(jq*) Bash(mkdir*) Bash(du*) mcp__plugin_palantir-mini_palantir-mini__emit_event
effort: medium
---

# /palantir-mini:pm-portable-bundle — Plugin Tarball Export

Creates a portable tarball of canonical `plugins/palantir-mini/` for fresh-machine rehydration.

## Steps

### 1. Read plugin version

```bash
jq -r .version plugins/palantir-mini/.claude-plugin/plugin.json
# → e.g. "2.23.0"
jq -r '.compatibleSchemaVersions' plugins/palantir-mini/.claude-plugin/plugin.json
# → e.g. ">=1.15.0 <2.0.0"
```

Set `BUNDLE_DATE=$(date +%Y-%m-%d)` and derive tarball name:
`palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz`

### 2. Create output directory

```bash
mkdir -p plugins/palantir-mini/portable/
```

### 3. Tar + gzip plugin tree

v6.79.0+ default: bundle includes only the canonical `palantir-mini/` source tree.
The tree itself contains the portable substrate under:

- `runtime-overlay/research-library/`
- `runtime-overlay/schemas-snapshot/`
- `runtime-overlay/ontology-shared-core/`

Fresh-machine rehydration must not require external `~/.claude/research/`,
`~/.claude/schemas/`, or `~/ontology/shared-core/`. Those directories are
authoring/update mirrors; runtime defaults resolve through plugin-owned
snapshots.

```bash
tar -czf plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz \
  -C /home/palantirkc palantir-mini/
```

### 4. Write bundle.json manifest

For each file in the tarball, compute SHA-256 and write:

```bash
# Generate SHA-256 for the tarball itself
sha256sum plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz > \
  plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.sha256

# Write bundle.json
jq -n \
  --arg version "<X.Y.Z>" \
  --arg date "<YYYY-MM-DD>" \
  --arg tarball "palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz" \
  --arg sha256 "$(sha256sum plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz | awk '{print $1}')" \
  --arg size "$(du -sh plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz | awk '{print $1}')" \
  '{version: $version, date: $date, tarball: $tarball, sha256: $sha256, size: $size}' \
  > plugins/palantir-mini/portable/bundle.json
```

### 5. Emit event (5-dim envelope)

```
mcp__plugin_palantir-mini_palantir-mini__emit_event({
  project: "<cwd>",
  envelope: {
    type: "portable_bundle_created",
    eventId: "evt-bundle-<timestamp>",
    when: "<ISO8601>",
    atopWhich: "<git HEAD>",
    throughWhich: { sessionId: "portable-bundle", toolName: "pm-portable-bundle", cwd: "<cwd>" },
    byWhom: { identity: "claude-code", agentName: "Lead" },
    withWhat: { reasoning: "Created portable bundle for plugin-only portable rehydration." },
    payload: { version: "<X.Y.Z>", tarball: "<path>", sha256: "<hash>", includesRuntimeOverlaySnapshots: true }
  }
})
```

### 6. Print restore command

```
Bundle created: plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz
Size: <SIZE>
SHA-256: <HASH>

To restore on a fresh machine:
  /palantir-mini:pm-restore plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz

Or manually:
  mkdir -p ~/.claude/
  tar -xzf plugins/palantir-mini/portable/palantir-mini-v<X.Y.Z>-<YYYY-MM-DD>.tar.gz -C /home/palantirkc/
  # Then reload plugins and run /palantir-mini:pm-self-test
```

## Rule citations

- `~/.claude/rules/10-events-jsonl.md` — `portable_bundle_created` emitted before returning.
- `~/.claude/rules/07-plugins-and-mcp.md` — plugin tree is the authoritative asset.
