# palantir-mini Gemini Extension

This directory is the Gemini-native install surface for palantir-mini.

Use this path for local development:

```bash
gemini extensions validate ./palantir-mini/.gemini-extension
gemini extensions link ./palantir-mini/.gemini-extension
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
bun run ./palantir-mini/scripts/sync-gemini-extension.ts
```
