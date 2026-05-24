# palantir-mini Gemini Runtime Loader

This extension is a Gemini-native loader for the bundled palantir-mini source
payload under this extension's `plugin/` directory.

The extension directory is runtime packaging only. Do not copy palantir-mini
workflow semantics into `~/.gemini`; use the plugin MCP server, skills, agents,
hooks, policies, and source docs from the canonical root.

For ontology, schema, routing, hook, runtime-adapter, audit, harness, replay,
review, or release work:

1. Load the smallest relevant palantir-mini source context first.
2. Call `pm_semantic_intent_gate` before ontology-affecting routing or mutation.
3. Route with `pm_intent_router` only after approved SIC/DTC/work-contract refs
   exist, or record the Gemini runtime gap when Gemini cannot present or
   dereference the approval surface.
4. Treat Gemini hook events as adapter-native projections of palantir-mini hook
   intent, not as Claude/Codex hook parity.
5. Keep generated mirrors and runtime-local config as consumers. The source of
   truth remains the installed `plugin/` payload for this extension.

Gemini-native skills are exposed from `skills/`. Claude-style agent recipes are
available as reference docs under `agent-docs/` and `plugin/agents/`, but are not
mounted as Gemini-native agents until their frontmatter is schema-compatible.
