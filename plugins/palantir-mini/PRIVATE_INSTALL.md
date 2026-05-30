# Private GitHub Install

The private install repository is a Codex marketplace repository whose plugin
payload lives under `plugins/palantir-mini/`.

## Repository layout

- Codex installs from `park-kyungchan/palantir-mini-marketplace`, then loads
  `plugins/palantir-mini/.codex-plugin/plugin.json`.

## Install commands

Replace `park-kyungchan` if the private repo owner changes.

```bash
# Codex
codex plugin marketplace add park-kyungchan/palantir-mini-marketplace --ref main
codex plugin add palantir-mini@palantir-mini-marketplace
```

## Fresh-machine prerequisites

- Install and authenticate `git`/GitHub access for private repositories.
- Install `bun` on `PATH`.
- Authenticate Codex before installing private sources.

Do not delete an existing local `plugins/palantir-mini` until a fresh install from the
private URL validates and starts the MCP server on the target machine.
