---
source-url: https://developers.openai.com/api/docs/guides/agents/sandboxes
source-author: OpenAI Developer Documentation
source-published: "2026-04-15 (live docs companion to Agents SDK launch; fetched 2026-05-06)"
fetched-at: 2026-05-06T13:42:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Do not redistribute outside ~/.claude/research/."
topic: "Sandbox Agents developer documentation — Manifest schema (LocalDir/GitRepo/storage mounts) + RunState/Session/Snapshot 3-surface state model + 9 sandbox providers + capability system + sandbox memory primitive"
---

# Sandbox Agents Documentation

> OpenAI Developer Documentation, fetched 2026-05-06.
> Source: https://developers.openai.com/api/docs/guides/agents/sandboxes
> Cited by: Wave 2 sprint-046 research wave (Angle C — concrete Manifest schema + state model API surface; sandbox-client interface for harness portability).

## Overview

Sandbox agents provide isolated, Unix-like execution environments with filesystems, shell access, installed packages, mounted data, exposed ports, snapshots, and resumable state for agent workflows.

## Core Concept

A sandbox gives agents an isolated workspace where they can inspect and modify files, run commands, and maintain stateful execution. This separation divides responsibility between the harness (control plane) and compute (execution plane).

> **Key distinction**: "The harness is the control plane around the model: it owns the agent loop, model calls, tool routing, handoffs, approvals, tracing, recovery, and run state. Compute is the sandbox execution plane where model-directed work reads and writes files."

## When to Use Sandboxes

Employ sandboxes when agent work depends on workspace activities rather than reasoning over prompt context alone. Common scenarios include:

- Tasks requiring document directories instead of single prompts
- Agents writing files for later inspection
- Workflows needing commands, packages, or scripts
- Artifact production (Markdown, CSV, JSONL, screenshots, websites)
- Services or previews running on exposed ports
- Work requiring pause for human review before resuming

Skip sandboxes if workflows only need brief model responses without persistent workspaces.

## Workspace Creation with Manifest

`Manifest` describes desired starting contents and layout for fresh sandbox workspaces. It specifies files, repositories, input artifacts, helper files, mounts, output directories, and environment setup.

### Manifest Entry Types

| Entry Type | Purpose |
|---|---|
| File, Dir | Small inputs, helper files, output directories |
| Local file/directory | Host files or directories materialized into sandbox |
| Git repo | Repositories fetched into workspace |
| Storage mounts | External storage (S3, GCS, R2, Azure, Box) accessible inside sandbox |
| environment | Environment variables at sandbox startup |
| users, groups | OS accounts for supporting providers |

### Storage Mounting

Instead of pasting large documents into context, mount them into the sandbox. Examples include mounting due-diligence data rooms for cited summaries or support exports for issue clustering into reports.

### Credential Handling

> "Treat sandbox credentials as runtime configuration, not prompt content."

Apply these principles:

- Prefer provider-native secret systems for hosted sandbox providers
- Scope cloud storage credentials to specific mounts or provider options
- Use `Manifest.environment` for values needed at startup
- Mark sensitive entries as ephemeral when rebuilding instead of persisting
- Review artifacts before moving them outside the sandbox

## Agent Capabilities

Capabilities attach sandbox-native behavior to `SandboxAgent`. Default capabilities include filesystem, shell, and compaction. Add capabilities for specific needs:

| Capability | Purpose |
|---|---|
| Shell | Enable command execution |
| Filesystem | Edit files or inspect local images |
| Skills | Enable skill discovery and materialization |
| Memory | Persist learning across runs |
| Compaction | Handle context trimming for long workflows |

## Running Sandbox Agents

Basic execution workflow:

1. Build a `Manifest` describing workspace contents
2. Create a `SandboxAgent` with required capabilities
3. Choose a sandbox client for the execution environment
4. Run the agent with per-run sandbox configuration
5. Inspect, copy, resume, or snapshot resulting artifacts

### Provider Selection

Start with Unix-local for local macOS/Linux development. Switch providers at runtime without changing agent definitions or manifests. Examples include Docker for local container isolation and hosted providers for managed execution.

## State Management

Three separate state concepts:

- **RunState**: Harness-side state including model items, tool state, approvals, agent position
- **Session state**: Serialized sandbox session for provider reconnection
- **Snapshot**: Saved workspace contents seeding fresh sandbox sessions

### Resolution order for sandbox sessions

1. Use live sandbox session if provided
2. Resume from `RunState` if resuming
3. Resume from explicit serialized state
4. Create fresh session using per-run or default manifest

## Sandbox Memory

Sandbox memory lets future runs learn from prior workspace executions without replaying every previous turn. Distinct from SDK conversational memory, it distills useful lessons into files for agent access.

Enable with the `Memory` capability. Memory reads require shell access; live updates also require filesystem access for repairs and updates.

**Memory layout** includes:

- Session rollout files (`.jsonl`)
- Summary and consolidated memory markdown
- Raw memory artifacts
- Rollout summaries
- Skill materials

## Agent Composition

Sandbox agents integrate with the broader SDK:

- **Handoffs**: Non-sandbox intake agents delegate workspace-heavy work to sandbox agents
- **Tools**: Outer orchestrators call sandbox agents as nested tools, each with own configuration and provider options

## Available Sandbox Providers

| Provider | Client Class | Use Case |
|---|---|---|
| Unix-local | `UnixLocalSandboxClient` | Local development |
| Docker | `DockerSandboxClient` | Local container isolation |
| Blaxel | `BlaxelSandboxClient` | Managed execution |
| Cloudflare | `CloudflareSandboxClient` | Edge computing |
| Daytona | `DaytonaSandboxClient` | Development environments |
| E2B | `E2BSandboxClient` | Sandbox hosting |
| Modal | `ModalSandboxClient` | Serverless compute |
| Runloop | `RunloopSandboxClient` | Devbox environments |
| Vercel | `VercelSandboxClient` | Edge deployment |

## Status and Availability

> "Sandbox agents are available in the TypeScript and Python Agents SDKs. They are in beta, so API details, defaults, and supported capabilities may change."

---

## Local indexing notes

- Cited by Wave 2 sprint-046 research wave (Angle C — concrete Manifest schema + state model API surface).
- **3-surface state model** (RunState / Session state / Snapshot) is a load-bearing pattern:
  - `RunState` = Lance Martin's "Session" layer (harness-owned event log analog)
  - `Session state` = serialized provider-attached sandbox handle (live container reconnection token)
  - `Snapshot` = workspace contents (Hands layer state — *"cattle, not pets"* persistence)
- **palantir-mini cross-ref**: parallels palantir-mini's `<project>/.palantir-mini/session/events.jsonl` (Session) + `.palantir-mini/harness/sprints/<id>/contract.json` (RunState) + ontology graph copy used by `simulator` rubric domain (Snapshot analog; rule 16 v3.2.0 §GradingRubric).
- **Capability system** (Shell / Filesystem / Skills / Memory / Compaction) is a discrete enumerable surface — this is the OpenAI vendor's equivalent of Anthropic's tool registry. Use for cross-vendor capability mapping.
- **9 sandbox providers** (Unix-local + Docker + Blaxel + Cloudflare + Daytona + E2B + Modal + Runloop + Vercel) — adds Unix-local + Docker to the 7-provider list in `agents-sdk-next-evolution-2026-04-15.md`.
- Companion: `agents-sdk-next-evolution-2026-04-15.md` (announcement) + `gpt-5-5-model-developer-page.md` (model API surface).
