---
source-url: https://www.palantir.com/docs/foundry/ai-fde/overview/ + https://www.palantir.com/docs/foundry/ai-fde/modes-and-skills/
source-author: "Palantir Technologies (official Foundry docs)"
source-published: 2026-03-12
fetched-at: 2026-05-06T12:40:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Original docs copyright Palantir Technologies. Do not redistribute outside ~/.claude/research/."
topic: "AI FDE (AI-powered Forward Deployed Engineer) — interactive Foundry agent; 8 modes × agent-skills/domain-skills × closed-loop operation"
---

# AI FDE — Overview + Modes and Skills (combined mirror)

> Source 1: https://www.palantir.com/docs/foundry/ai-fde/overview/
> Source 2: https://www.palantir.com/docs/foundry/ai-fde/modes-and-skills/
> Both fetched 2026-05-06 from official Palantir Foundry docs.
> AI FDE first announced at DevCon 5 (2026-03-12 keynote demo, YouTube `pyudERNI1Qo`).
> Cited by: rule 26 v1.0.0 §Axis B + Axis C anchors; `palantir-vision/aipcon-devcon/ai-fde.md`.

---

## Section A — AI FDE Overview

**AI FDE**, the AI-powered forward deployed engineer, is an interactive agent
that operates Foundry for you through conversational commands. AI FDE
translates natural language requests into Foundry operations, allowing you to
perform data transformations, manage code repositories, build and maintain
your ontology, and more. You can also provide AI FDE with context from
Foundry to facilitate and inform operations.

### Requirements

AI FDE requires AIP to be enabled on your enrollment. It is also recommended
that Global Branching be enabled to support Ontology edits from AI FDE.
Contact your Palantir administrator to enable AIP and Global Branching for
your enrollment.

### How AI FDE works

When you provide a request in natural language, AI FDE takes the following
steps:

1. Analyze your intent and the provided context.
2. Determine the appropriate Foundry operations to execute.
3. Perform the requested actions with native tool support.
4. Return contextual explanations and documentation.

All operations respect the user's existing permissions, including application
and data access. You can select the specific model to use, as well as the
tools and data available to the model, so that AI FDE only has access to the
capabilities necessary for the requested operation.

### Customizable tools

AI FDE can use tools that match the operations that users can perform in the
platform, including creating object types, writing transforms, and running
builds. The ability to use tools is essential for production systems that
need to reliably interact with development tools, APIs, and infrastructure in
real-world environments. AI FDE displays the tools used to perform actions in
Foundry and keeps a record of all prompts and tools used during the active
session in the chat outline.

### Context management

AI FDE gives users complete authority and visibility over what information
the model can access. In its initial state, AI FDE loads minimal context to
provide the model with general knowledge of Foundry concepts without access
to user data. This baseline configuration ensures the system starts with a
clean state for each interaction. This controlled context approach prevents
the "context pollution" that can occur when irrelevant information dilutes
the effectiveness of the model's reasoning; by starting with a controlled
baseline, AI FDE can maintain precise governance over the model's
capabilities and knowledge boundaries.

Users can expand this context in multiple ways, including dragging and
dropping folders, datasets, or documentation to provide relevant information.

### Closed-loop operation

AI FDE employs a *closed-loop* operation model, where the model executes an
action, observes the result, and uses that feedback to determine its next
action. This creates a continuous feedback loop where outputs from one
operation become inputs for subsequent decisions, enabling complex
multi-step workflows.

AI FDE can perform various actions to validate its own changes, including
but not limited to:

- Running a transform preview to validate transform code.
- Running a function preview to validate function behavior.
- Reviewing CI checks to validate code written in Code Repositories.

### Capabilities

AI FDE has access to several modes and skills (see Section B) that allow it
to perform a broad range of operations. You can customize the tools
available to AI FDE in the Tools menu under the request input field.

AI FDE is able to perform a variety of tasks based on natural language
descriptions, including:

- **Data integration:** Building or modifying data pipelines (Python
  transforms or Pipeline Builder).
- **Ontology editing:** Creating or updating the objects, links, and
  actions that make up your ontology.
- **Functions editing:** Writing Foundry functions in Logic, TypeScript, or
  Python, and testing them with AIP Evals.
- **Exploration:** Read-only investigation; understanding what exists in
  your platform before making changes.
- **Governance:** Auditing permissions, access control, markings, and data
  protection.
- **OSDK React:** Building React applications or custom widgets that
  connect to Foundry data.
- **Platform Q&A:** Asking general questions about how Foundry works.

By default, AI FDE uses branching across all workflows. AI FDE will propose
changes in a Global Branch proposal or Code Repository pull request for
review.

### Model support

To be used by AI FDE, a model must be enabled for your enrollment. AI FDE
has first-class support for Anthropic, OpenAI, Google, and xAI models along
with support for native tool APIs.

---

## Section B — AI FDE Modes and Skills

AI FDE uses modes and skills to accomplish tasks and provide an easy way to
manage the agent's context. *Modes* are the broad task at hand, such as data
integration or ontology editing, while *skills* are granular capabilities
that can be used across different modes.

### Modes

Modes tell the agent what kind of task you are working on. You can manually
select a mode, or simply enter your task in the input field and allow the
agent to select the mode for you. Agents can also change the mode mid-task
as the task evolves. Modes focus the agent by loading the right
documentation, giving the agent access to relevant tools, and tailoring how
it approaches a problem. Providing agents with the right context helps
ensure that they don't get distracted or use the wrong tools; an agent that
writes Python transforms does not need governance or React application
tools, so only relevant documentation and tools are provided.

AI FDE modes include the following (8 total):

1. **Data integration:** Building or modifying data pipelines (Python
   transforms or Pipeline Builder).
2. **Ontology editing:** Creating or updating the objects, links, and
   actions that make up your ontology.
3. **Functions editing:** Writing Foundry functions in Logic, TypeScript,
   or Python.
4. **Exploration:** Read-only investigation; understanding what exists in
   your platform before making changes.
5. **Governance:** Auditing permissions, access control, markings, and
   data protection.
6. **Machine learning:** Training, evaluating, deploying, and tuning
   machine learning models. Covers classification, regression, time series
   forecasting, and custom predictive modeling.
7. **OSDK React:** Building React applications or custom widgets that
   connect to Foundry data.
8. **Platform Q&A:** Asking general questions about how Foundry works.

Some modes allow you to refine their configuration. The agent uses these
choices to determine which documentation to read and which tools to invoke.

| Mode | Configuration options |
|------|------------------------|
| Data integration | Python transforms or Pipeline Builder |
| Function editing | Language selection |
| Machine learning | Model Studio (no-code) or pro-code development, and preferred code editing environment |

### Skills

Skills are individual capabilities the agent can use across any mode. While
modes determine the broad task context, skills are more granular. Each one
maps to one or more specific tools the agent can call. Skills are
categorized into **agent skills** and **domain skills**.

**Agent skills** are how the agent manages itself and communicates. This
includes the following:

- **Change mode:** The agent can switch to a different mode mid-task when
  the work calls for it, without requiring you to manually switch.
- **Request clarification:** The agent can ask you questions (multiple
  choice or free text) when it needs more information before proceeding.
- **Generate plan:** Before taking action, the agent drafts a plan for your
  review. This is useful for ambiguous or multi-step tasks.
- **Load documentation:** The agent can look up Foundry documentation on
  demand.
- **Manage context / Manage skills:** The agent can tidy its own working
  memory and adjust which skills are active as the task evolves.

**Domain skills** are real actions that the agent can perform in Foundry,
including but not limited to the following:

- **Filesystem:** Create folders, browse resources, and move things around.
- **Notepad:** Read, create, and update Notepad documents.
- **Solution design:** Create and edit solution design diagrams.
- **Execute actions:** Run actions against ontology objects.

Skills can be enabled or disabled. The agent can also turn skills on or off
mid-task if needed, which is enabled by **Manage skills**.

---

## Local indexing notes

- **Cited by**:
  - `~/.claude/rules/26-valuable-data-standard.md` v1.0.0 §Axis B (Verifiable — outcome-paired, rubric-measurable) + §Axis C (Refining — LEARN-mapped, refinement target typed).
  - `~/.claude/research/palantir-vision/aipcon-devcon/ai-fde.md` (interpretation layer).
  - palantir-mini sprint-harness §Roles (rule 16 v4.0.0 — harness-generator's mode/skill mental model is derived from AI FDE).
- **Companion mirrors**:
  - `aip/blog-securing-agents-agentic-runtime-1-2026-01-22.md` — 4 memory categories (Axis E anchor).
  - `aip/aip-evals-overview-and-ontology-edits-2026-04-14.md` — 19 evaluators + OntologyEditSimulation (Axis B anchor).
  - `palantir-vision/aipcon-devcon/blog-fde-deep-dive-diogo-silva-santos-2026-04-08.md` — Delta+Echo team formation analysis.
- **Pre-existing fetch overlap**: `aip/ai-fde-overview.md` (2026-04-20 batch) and `aip/ai-fde-modes-and-skills.md` (same batch) cover the same source URLs at an earlier fetch date. This file is the **2026-05-06 refresh** anchored to the AI FDE GA date (2026-03-12). Both pre-existing files remain untouched per `~/.claude/CLAUDE.md` §Artifact Layer Policy (research/ AI-agent read-only).
- **Refresh trigger**: refetch if (a) AI FDE adds a 9th mode, (b) Skills taxonomy splits beyond agent/domain, or (c) closed-loop operation gains a new validation surface beyond transform-preview/function-preview/CI-checks.
- **DevCon 5 keynote reference**: 16-minute YouTube demo at `pyudERNI1Qo`. Synthesis of the demo is in `palantir-vision/aipcon-devcon/devcon.md`.
- **Note on naming**: AI FDE was generally available the week of 2026-03-12 per the official 2026-03-12 announcement (`security-deployments/announcements-2026-03-04-05-aipcon9-bundle.md` §AIFDE-GA).
