# Palantir Foundry Portable Index

This directory is a plugin-vendored fallback pack. It summarizes and routes to
small, high-signal Palantir AIP/Ontology/Evals/Security anchors without
mutating the authoritative external research layer.

| Path | Role | Provenance |
|---|---|---|
| `BROWSE.md` | Minimal query router for this portable pack | Plugin runtime overlay |
| `portable-reference-pack.md` | AIP, Ontology, Context, Function, Action, Security, and Evals summary for Lecture Delivery Kernel v0 | Derived synthesis from local research anchors |
| `aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` | AIP Evals concepts and Ontology edit simulation anchor | Official Palantir docs mirror, fetched 2026-05-06 |
| `aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md` | Agentic Runtime security and memory category anchor | Palantir blog summary mirror, fetched 2026-05-06 |

External authority remains `~/.claude/research/palantir-foundry/` and its
routers. This fallback is used only when the external layer cannot be selected.
