---
source-url: https://www.palantir.com/docs/foundry/palantir-mcp/overview/ (+ secondary: https://www.palantir.com/docs/foundry/developer-console/ontology-mcp/)
source-author: "Palantir Technologies (official Foundry docs)"
source-published: 2026-03-26
fetched-at: 2026-05-06T12:40:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Original docs copyright Palantir Technologies. Do not redistribute outside ~/.claude/research/."
topic: "Palantir MCP (builder) vs Ontology MCP (consumer) — split architecture; Application Scopes for permission boundary; Copilot Studio integration"
---

# Palantir MCP (and Ontology MCP) — Builder vs Consumer Split

> Source 1: https://www.palantir.com/docs/foundry/palantir-mcp/overview/
> Source 2 (secondary, referenced): https://www.palantir.com/docs/foundry/developer-console/ontology-mcp/
> Source 3 (anchor date): 2026-03-26 announcement "Microsoft Copilot Studio integration with Ontology MCP"
> Both fetched 2026-05-06 from official Palantir Foundry docs.
> Cited by: `~/.claude/research/palantir-foundry/dev-toolchain/BROWSE.md` §MCP routing; rule 07 v1.2.0 §Multi-plugin precedence (cross-runtime cousin: palantir-mini's MCP server is conceptually parallel to Palantir MCP within the Foundry runtime).

---

## Palantir MCP — Overview

Palantir MCP is an implementation of the Model Context Protocol
(modelcontextprotocol.io). Palantir MCP enables AI IDEs and AI agents to
autonomously design, build, edit, and review end-to-end applications within
the Palantir platform, covering everything from data integration to
ontology configuration and application development. In addition, you can
use Palantir MCP to allow external AI systems to query documentation,
metadata, and data, as well as perform high-level tasks on the platform.
Developers can use Palantir MCP to automate auxiliary tasks while they stay
focused on the system they are building.

### When should I use Palantir MCP?

The Palantir MCP provides two main benefits to developers:

1. **Context:** Palantir MCP provides LLM agents with context to navigate
   internal Palantir libraries and understand Foundry architecture.
2. **Tools:** Palantir MCP provides tools for LLM agents to explore your
   ontology and Foundry projects and to take actions.

### Builder MCP vs Consumer MCP — the split

> "Palantir MCP is designed for ontology builders and can modify ontology
> types, but cannot write ontology data. By contrast, **Ontology MCP
> (OMCP)** enables ontology consumers to safely read and write data to your
> ontology through external AI agents." *(Palantir Foundry docs, fetched
> 2026-05-06)*

This is the core architectural split:

| Capability | Palantir MCP (builder) | Ontology MCP / OMCP (consumer) |
|------------|------------------------|--------------------------------|
| Modify ontology **types** (object types, action types, link types) | YES | NO |
| Write ontology **data** (object instances, action invocations) | NO | YES |
| Search ontology metadata | YES | YES |
| Provide repository-tailored code context | YES | NO |
| External AI integration (Copilot Studio, Gemini Enterprise) | NO (developer-IDE focus) | YES |
| Application Scopes governance | (n/a — developer scope) | YES — restricts which actions the agent can take |

### Use cases (builder side, Palantir MCP)

- **Use Palantir libraries and APIs** — LLM agents are powerful for writing
  code to integrate with new systems and libraries given the appropriate
  code context. The MCP recognizes your current repository and injects
  tailored context for the repository type (for example, OSDK
  repositories, Python transforms, and TypeScript functions). Additionally,
  the MCP searches Palantir's code snippet index and provides context for
  libraries that do not fit a specific repository.
- **Build OSDK applications** — The Palantir MCP provides tools to take
  actions in Foundry. Specifically, the MCP can search your ontology,
  safely modify the ontology, and update your Developer Console
  application. Example invocations: "Find me the object/links/functions to
  {do something}", "Create this object-type/link-type and integrate it
  with my application", or "Apply this proposal to my Developer Console
  application".
- **Build and iterate on Python transforms** — The MCP provides tools to
  run Python transforms. The agent runs the tool `preview_transform` and,
  on failure, attempts to fix errors and re-run until `preview_transform`
  succeeds (closed-loop pattern, parallel to AI FDE's closed-loop model).

### Documented IDE integrations

- Claude Code Agent (provides context on integrating with AIP Chatbot
  Studio, formerly known as AIP Agent Studio)
- VS Code Continue agent (implements OSDK tutorial application using
  Palantir MCP-provided context; previews transform → fixes → re-runs)
- VS Code Workspaces' AI development tools (alternative install path to
  the manual installation guide)

### Installation + getting started chain

1. Follow the installation instructions to install the Palantir MCP into
   your IDE. Alternatively, use the AI development tools available in a
   VS Code workspace to access Palantir MCP.
2. Review the Palantir MCP getting started guide.
3. Review the security and data flow documentation.

---

## Ontology MCP (Consumer) — referenced architecture

Ontology MCP (OMCP) lives under Developer Console docs because it ships
with your Developer Console **application**. Its key concepts:

- **Application as security boundary**: The Developer Console application
  is the unit of permissioning. Ontology MCP exposes that application's
  object types, action types, and query functions as MCP tools.
- **Application Scopes**: scopes restrict which subset of the
  application's surface (which actions, which queries, which object
  types) the consumer agent can invoke. This is the consumer-side
  equivalent of Foundry's per-resource RBAC.
- **External AI consumers**: Copilot Studio (per the 2026-03-26
  announcement), Gemini Enterprise, and any MCP-compliant client.

### Copilot Studio configuration note (from 2026-03-26 announcement)

> "When setting up this integration, create your Developer Console
> application as a `Backend` service with `User's` permissions. Copilot
> Studio only supports authorization code grant in a Confidential Client,
> which requires a service user to issue tokens on behalf of your users."
> *(Foundry announcements, 2026-03-26)*

---

## Architectural significance for palantir-mini

This builder/consumer split is **the design pattern palantir-mini adopts in
its own MCP layer**:

- palantir-mini's MCP handlers (under
  `~/.claude/plugins/palantir-mini/bridge/handlers/`) are split into
  builder-side (mutate `~/.claude/schemas/`, `~/ontology/shared-core/`,
  `~/.claude/rules/`) and runtime-consumer-side (read events.jsonl,
  emit_event, replay_lineage).
- The Application Scopes pattern parallels palantir-mini's per-skill,
  per-handler ownership table (rule 07 v1.2.0 §file-ownership).
- Palantir's "Builder MCP cannot write ontology data; Consumer MCP can
  write data, governed by Application Scope" maps directly onto
  palantir-mini's "rule 08 codegen authority: only `pm-codegen` writes
  src/generated/**, runtime never modifies generated artifacts."

---

## Local indexing notes

- **Cited by**:
  - `~/.claude/research/palantir-foundry/dev-toolchain/BROWSE.md` §MCP routing.
  - `~/.claude/rules/07-plugins-and-mcp.md` v1.2.0 (architectural cousin: palantir-mini's MCP layer adopts the same builder/consumer split).
  - `~/.claude/rules/19-multi-plugin-precedence.md` v1.0.0 (`Application Scopes` is the upstream pattern for plugin > user > repo precedence resolution).
- **Companion mirrors**:
  - `aip/ai-fde-overview-and-modes-skills-2026-03-12.md` — closed-loop pattern parallel.
  - `ontology/global-branching-overview-2026-05-05.md` — branching governance for builder-side Ontology edits.
  - `security-deployments/announcements-2026-03-04-05-aipcon9-bundle.md` — 2026-03-26 Copilot Studio integration anchor.
- **Pre-existing fetch overlap**: this directory has many `code-repositories-*.md` and `code-examples-*.md` files (2026-04-20 batch) but no prior dedicated Palantir-MCP overview file. This is a **new file** filling that gap.
- **Refresh trigger**: refetch if (a) Palantir MCP gains data-write capabilities (collapsing the builder/consumer split), (b) a third MCP variant ships (e.g. "Lineage MCP"), or (c) Application Scopes gains a new dimension beyond actions/queries/object-types.
- **Cross-runtime note**: per `~/.claude/CLAUDE.md` §Runtime Boundary, Palantir MCP is a **separate runtime from Claude/Codex/Gemini**. Do not conflate `~/.claude/plugins/palantir-mini/bridge/mcp-server.ts` (palantir-mini MCP) with Palantir MCP (Foundry product). They share the protocol (MCP) but live in different runtimes.
