# palantir-mini Gemini Extension

This directory is the Gemini-native install surface for palantir-mini.

Install the private extension directly on a machine with GitHub access:

```bash
gemini extensions install https://github.com/park-kyungchan/palantir-mini-gemini-extension --ref main --auto-update --consent
```

Validate a direct extension checkout from its repo root:

```bash
gemini extensions validate .
```

Validate this mirror while working inside the private marketplace checkout:

```bash
gemini extensions validate plugins/palantir-mini/.gemini-extension
```

The extension mounts Gemini-native MCP, context, hooks, policies, skills, and
agents without moving semantic authority into `~/.gemini`.

`skills/` is the Gemini-native skill mirror copied from the canonical plugin
source. Claude-style agent recipes are bundled as docs under `agent-docs/` and
as source payload under `plugin/agents/`; they are not exposed as Gemini-native
agents until their frontmatter is translated to Gemini's agent schema. `plugin/`
is the bundled runtime payload used by MCP and hook adapters. Refresh all
mirrors before publishing:

```bash
bun run plugins/palantir-mini/scripts/sync-gemini-extension.ts
```
