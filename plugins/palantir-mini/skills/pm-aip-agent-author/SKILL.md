---
name: pm-aip-agent-author
category: core-workflow
surfaceStatus: public-core
description: "Author an AIPAgentDeclaration (Palantir AIP Chatbot Studio / AI FDE-style governed..."
allowed-tools: mcp__palantir-mini__apply_edit_function mcp__palantir-mini__commit_edits mcp__palantir-mini__compute_edits_dry_run mcp__palantir-mini__emit_event mcp__palantir-mini__ontology_schema_get Read Write Bash
effort: high
disable-model-invocation: true
---

# pm-aip-agent-author — AIPAgentDeclaration authoring

## When to use

- Defining a new ontology-connected product agent (Chatbot Studio / AI FDE / AIP Assist surface).
- Codifying an existing prompt-based bot as a governed AIPAgentDeclaration with scoped tools + eval suites + deployment lifecycle.
- When `/palantir-mini:pm-aip-agent-author` is invoked or these phrases appear: "AIP agent", "agent declaration", "ontology-native agent", "create AIP chatbot", "author governed agent".

## NOT for

- Authoring spawnable subagent definitions (those go in `~/.claude/plugins/<plugin>/agents/*.md` + use `AgentDefinition` primitive, not `AIPAgentDeclaration`).
- Drafting prompt-only experiments — graduate them to AIPAgentDeclaration only when scoping ontology + tools + evals.

## Prerequisites

- Schemas v1.37.0+ (AIPAgentDeclaration primitive) — current schemas at v1.40.0+.
- Optional: prior `/palantir-mini:pm-eval-suite-author` for `evaluationSuiteIds[]` cross-ref.
- Plugin v4.5.0+ (this skill).

## Inputs (interactive walkthrough)

Ask user for:
- `<apiName>`: stable slug (e.g. "support-triage-bot")
- `<displayName>`: human-readable
- `<surface>`: one of `aip-chatbot-studio | ai-fde | aip-assist | custom-osdk-application | mcp-client`
- `<modelRefs>`: ordered list (e.g. ["<provider-model-primary>", "<provider-model-fallback>"] for fallback chain)
- `<systemPromptRef>`: file path or RID for the system prompt
- `<ontologyScope>`: { objectTypeRids[], objectViewRids[], allowObjectSetSearch?, allowMutatingActions? }
- `<toolBindings>`: 1-N `AIPToolBinding` entries (kind + actionRid?/logicFunctionRid?/objectViewRid?/toolName? + mutability + requiresApproval)
- `<evaluationSuiteIds>` (optional): cross-ref to AIP Evals suites (per /pm-eval-suite-author)
- `<deploymentStage>`: `draft | dev | staging | production | retired`
- `<observability>`: { captureSessionTrace, captureToolCalls, lineageRefsRequired? }

## How to run

### Step 1 — Compose AIPAgentDeclaration JSON

Per schemas v1.37 `aip-agent.ts` interface. Generate `agentId` as `aipAgentRid("agent:" + apiName + ":" + Date.now())`. If `surface` is "aip-chatbot-studio", set `legacyNames: ["aip-agent-studio", "aip-agents"]` (preserves naming-drift cross-ref per primitive doc).

### Step 2 — Validate

Run schema type guard via `mcp__palantir-mini__ontology_schema_get({primitiveRid: "aip-agent"})` to confirm structure. Verify `toolBindings[].mutability` matches `requiresApproval` (e.g. mutability=write SHOULD imply requiresApproval=true unless explicit override).

### Step 3 — Persist via Two-Tier Action

```
mcp__palantir-mini__apply_edit_function({
  functionName: "aip-agent-declare",
  params: { agentDecl: <fromStep1> },
  hypotheticalEdits: [{ kind: "object", rid: "aip-agent-registry", properties: { [agentDecl.agentId]: agentDecl } }]
})
```

Then `mcp__palantir-mini__compute_edits_dry_run({...})` → `mcp__palantir-mini__commit_edits({...})` per rule 16 v4.0.0 §Loop.

Persisted at `<project>/.palantir-mini/aip-agents/<agentId>.json` (mkdir if absent).

### Step 4 — Emit `aip_agent_declared` event

Reuse `phase_completed` envelope:

```
mcp__palantir-mini__emit_event({
  type: "phase_completed",
  payload: { phaseTag: "aip-agent-declared", taskId: agentId, validations: ["schema-conform", "tool-bindings-validated", "deployment-stage-set"] },
  withWhat: {
    reasoning: "AIP Agent '<displayName>' declared on surface=<surface>; <N> tool bindings; deployment=<stage>",
    memoryLayers: ["semantic", "procedural"],
    refinementTarget: { kind: "primitive-field-add", filePathOrRid: agentId, description: "Author AIPAgentDeclaration", confidenceLevel: "high" }
  },
  lineageRefs: { actionRid: agentId, evidenceUrls: [<persistPath>] }
})
```

## Output

```
# AIPAgentDeclaration authored — <displayName>

Agent ID: <agentId>
Surface: <surface>
Models: <modelRefs>
Ontology scope: <objectTypeCount> objects + <objectViewCount> views
Tool bindings: <N> (read=<r>, write=<w>, deploy=<d>)
Eval suites: <count>
Deployment: <stage>

Persisted: <path>
Next: bind to a Workshop application or invoke /pm-eval-suite-run for first eval cycle.
```

## Authority + cross-refs

- Schemas: `~/.claude/schemas/ontology/primitives/aip-agent.ts` (v1.37+).
- 1차 자료: `~/.claude/research/palantir-foundry/aip/ai-fde-overview-and-modes-skills-2026-03-12.md` + `~/.claude/research/claude-code/managed-agents.md` (compare/contrast Anthropic Managed Agents vs Palantir AIP Agents).
- Companion agent: `agent-author` (this plugin's spawnable subagent for autonomous authoring).
- Companion skills: `/pm-eval-suite-author`, `/pm-ontology-branch-create`, `/pm-ai-fde-route`.
- Plan §3.W3.A — `~/.claude/plans/mossy-mapping-eich.md`.
