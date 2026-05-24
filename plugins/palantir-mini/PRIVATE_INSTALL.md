# Private GitHub Install

The private Claude/Codex install repository is a marketplace repository whose
plugin payload lives under `plugins/palantir-mini/`. The private Gemini install
repository is a Gemini extension repository whose root is generated from
`.gemini-extension/`.

## Repository layout

- Claude installs from `park-kyungchan/palantir-mini-marketplace` through the
  root `.claude-plugin/marketplace.json`, which points to
  `plugins/palantir-mini/`.
- Codex installs from the same marketplace URL, then loads
  `plugins/palantir-mini/.codex-plugin/plugin.json`.
- Gemini installs from a separate extension repository whose root is the
  generated `.gemini-extension/` directory:
  `park-kyungchan/palantir-mini-gemini-extension`.

## Install commands

Replace `park-kyungchan` if the private repo owner changes.

```bash
# Claude Code
claude plugin marketplace add park-kyungchan/palantir-mini-marketplace
claude plugin install palantir-mini@palantir-mini-marketplace

# Codex
codex plugin marketplace add park-kyungchan/palantir-mini-marketplace --ref main
codex plugin add palantir-mini@palantir-mini-marketplace

# Gemini CLI
gemini extensions install https://github.com/park-kyungchan/palantir-mini-gemini-extension --ref main --auto-update
```

## Fresh-machine prerequisites

- Install and authenticate `git`/GitHub access for private repositories.
- Install `bun` on `PATH`.
- Authenticate the target runtime CLI before installing private sources.

Do not delete an existing local `~/palantir-mini` until a fresh install from the
private URL validates and starts the MCP server on the target machine.
