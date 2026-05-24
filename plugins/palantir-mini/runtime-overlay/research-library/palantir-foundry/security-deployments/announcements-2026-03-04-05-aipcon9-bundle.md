---
source-url: https://www.palantir.com/docs/foundry/announcements/2026-03/ + 2026-04/ + 2026-05/
source-author: "Palantir Technologies (official Foundry docs)"
source-published: 2026-03-01 to 2026-05-05
fetched-at: 2026-05-06T12:40:00Z
license-note: "External source — read-only mirror for AI-agent research SSoT per ~/.claude/CLAUDE.md §Artifact Layer Policy. Original docs copyright Palantir Technologies. Do not redistribute outside ~/.claude/research/."
topic: "Combined Mar/Apr/May 2026 Foundry announcements bundle (AIP-related entries only) — AIPCon 9 / DevCon 5 launch wave + post-launch deltas"
---

# Foundry Announcements — Mar/Apr/May 2026 (AIP-only bundle)

> Sources (3 monthly pages):
> - https://www.palantir.com/docs/foundry/announcements/2026-03/
> - https://www.palantir.com/docs/foundry/announcements/2026-04/
> - https://www.palantir.com/docs/foundry/announcements/2026-05/
> All fetched 2026-05-06 from official Palantir Foundry docs.
> AIPCon 9 + DevCon 5 launch context: this bundle covers the post-launch wave.
> Cited by: `~/.claude/research/palantir-vision/aipcon-devcon/announcements.md` (interpretation layer); rule 16 v4.0.0 §Roles (Claude Opus 4.7 GA Apr 21 = palantir-mini Lead model upgrade anchor).

---

## March 2026 (AIP-related, date-prefixed)

### 2026-03-31 — AIP Analyst GA (week of 2026-04-13)

AIP Analyst will be generally available the week of April 13, 2026 for
users with AIP enabled. AIP Analyst is a conversational AI interface for
exploring your ontology that enables both technical and non-technical
users to explore and generate insights from ontology data. With AIP
Analyst, you can ask questions, visualize results, and understand every
step of your analysis with complete transparency.

### 2026-03-26 — Ontology MCP × Microsoft Copilot Studio integration

Ontology MCP now supports integration with Microsoft Copilot Studio,
enabling you to connect your Foundry ontology to Microsoft's AI agent
platform and surface structured ontology data directly in Teams, Copilot,
and Outlook.

When setting up this integration, create your Developer Console
application as a `Backend` service with `User's` permissions. Copilot
Studio only supports authorization code grant in a Confidential Client,
which requires a service user to issue tokens on behalf of your users.

### 2026-03-26 — Functions repositories in VS Code Workspaces

You can now author your functions repositories in VS Code Workspaces,
bringing the same UI and tooling you are used to from Code Repositories
into a faster, more capable environment.

### 2026-03-19 — GPT-5.4 mini and GPT-5.4 nano available from OpenAI

GPT-5.4 mini and GPT-5.4 nano are now available directly from OpenAI for
non-georestricted enrollments.

### 2026-03-19 — Autopilot beta

Autopilot, now available in beta, provides the visibility needed to
understand how automations connect, trace objects through your workflow,
and debug failures in one place. As a beta product, functionality and
appearance may change during active development.

### 2026-03-17 — AIP Document Intelligence: chunking + embedding

AIP Document Intelligence now supports chunking and embedding extracted
text across all enrollments. Alongside document extraction powered by
vision language models and OCR, you can now process documents end-to-end
directly within the platform. Chunking is a critical step in
document-centric workflows — it determines the granularity of text passed
to models in RAG systems, directly impacting retrieval accuracy and
downstream generation quality.

### 2026-03-17 — Branch role-based security

Branch creators can now assign users roles to control who can manage and
merge their Foundry branches. Previously, only the branch creator could
manage and merge a branch. With role-based security, branch creators can
delegate ownership to other users and groups, removing bottlenecks while
maintaining control over who can access and manage the branch.

### 2026-03-12 — AI FDE GA

AI FDE, the AI Forward Deployed Engineer, is now generally available for
enrollments with AIP enabled. AI FDE allows you to operate Foundry with
natural language, using conversations to unlock the power of the Palantir
platform. AI FDE makes platform interactions more intuitive and accessible
for all users, regardless of technical expertise, while maintaining
complete control and visibility into tool use and data access.

### 2026-03-12 — GPT-5.4 GA from OpenAI and Azure

GPT-5.4 is now available directly from OpenAI and Azure for
non-georestricted enrollments.

### 2026-03-12 — Gemini 3.1 Flash-Lite

Gemini 3.1 Flash-Lite is now available directly from Google VertexAI for
non-georestricted enrollments.

### 2026-03-05 — Pilot beta (AI-powered application builder)

Pilot is an AI-powered application builder that lets you create full-stack
applications on top of your ontology using natural language prompts. Pilot
will be available in beta for enrollments with AIP enabled starting the
week of March 9. To use Pilot, describe the application you want to build,
and Pilot will generate the ontology, design, and front-end code in an
isolated workspace with no manual data wiring or UI coding required.

---

## April 2026 (AIP-related, date-prefixed)

### 2026-04-30 — AIP usage history for projects

AIP usage history for projects is now available in Resource Management to
users with project view permissions. The dashboard shows a breakdown of a
project's AIP usage at minute-level granularity, with filters to further
break down usage by model or resource for up to two weeks prior. You can
also isolate usage by batch versus interactive queries and by token
versus request volume.

### 2026-04-22 — AIP Agent Studio is now AIP Chatbot Studio

Starting the week of April 27, AIP Agent Studio will be rebranded as AIP
Chatbot Studio, better reflecting its role as a dedicated builder for
interactive, multi-turn assistants equipped with enterprise-specific
information and tools. AIP Agents will be rebranded as AIP Chatbots across
the platform, and the AIP Agent widget in Workshop will be rebranded as
the AIP Chatbot widget.

All existing features and functionalities remain unchanged. You can
continue to embed AIP Chatbots into custom applications using the Palantir
API through the existing AIP Agent endpoints, which preserve the existing
API naming convention for backwards compatibility.

### 2026-04-21 — LLM capacity autoscaling up to 2× by default

Autoscaling capacity is now available and enabled by default for specific
models and for eligible enrollments in specific geo-regions and compliance
levels. Autoscaling will increase the enrollment capacity limits — up to
twice the current allocation. Currently autoscaling will only affect:
GPT-5, GPT-5 mini, GPT-5 nano, GPT-4.1, GPT-4.1 mini, GPT-4.1 nano.

### 2026-04-21 — Claude Opus 4.7 GA

Claude Opus 4.7 is now available from Anthropic, AWS Bedrock, and Google
Vertex on non-georestricted enrollments. For US and EU non-georestricted
enrollments, the model is available from AWS Bedrock and Google Vertex.

- **Context window:** 1,000,000 tokens
- **Modalities:** Text, image
- **Capabilities:** Extended thinking, function calling
- Claude Opus 4.7 is Anthropic's most capable generally available model to
  date. It supports long-horizon agentic workflows, knowledge work, vision
  tasks, and memory tasks.

### 2026-04-14 — Evaluate and ship directly with AIP Evals in AI FDE

AI FDE now supports a full workflow with AIP Evals, allowing you to author
evaluation suites, run them, and review results without leaving the agent.
When tests fail, AI FDE can read the results, diagnose the issue, update
the function or suite, and rerun until they pass.

Key capabilities:

- **Full evals workflow** in AI FDE.
- **Manual test cases**: primitive, array, struct, model, object, and
  object set types.
- **Nineteen built-in evaluators**: exact match, regex, ranges, Levenshtein
  distance, keyword checker, LLM-as-a-judge, plus function-backed custom
  evaluators.

Current limitations: Object set-backed test cases, multi-target suites,
run datasets, and Marketplace evaluators (Rubric Grader, Contains Key
Details, ROUGE) are not yet supported in AI FDE.

### 2026-04-14 — GPT-5.1 on Azure OpenAI for IL2/IL4/IL5

GPT-5.1 is now available from Azure OpenAI for IL2, IL4, IL5 enrollments.
Context window: 400,000 tokens. Modalities: text, image. Capabilities:
structured outputs, function calling, reasoning effort.

### 2026-04-09 — AIP Agent widget legacy mode deprecation (May 1)

On May 1 2026, the legacy mode of the AIP Agent widget (formerly the AIP
Interactive widget) in Workshop will be fully deprecated and deleted from
Foundry. Legacy mode has been marked as deprecated in Workshop since
January 2025. The most recent LLMs supported in legacy mode are GPT-4o
and Claude 3 Haiku.

### 2026-04-07 — Grok 4.20 from xAI

Grok 4.20 (Reasoning) and Grok 4.20 (Non-Reasoning) are now available for
enrollments with xAI enabled in the US and other supported regions.

### 2026-04-07 — Nvidia Nemotron 3 models in AIP

Nvidia's Nemotron 3 Super 120B and Nemotron 3 Nano 30B models hosted by
AWS Bedrock are now available for enablement in AIP on non-georestricted
enrollments as well as enrollments georestricted in select regions.

---

## May 2026 (AIP-related, date-prefixed)

### 2026-05-05 — GPT-5.5 in AIP

GPT-5.5 is now available from Azure on US and EU georestricted, and
non-georestricted enrollments. The model is available from OpenAI on US
georestricted and non-georestricted enrollments.

- **Context window:** 1,050,000 tokens
- **Knowledge cutoff:** December 1, 2025
- **Modalities:** Text, image
- **Capabilities:** Reasoning tokens, function calling, structured outputs

GPT-5.5 is OpenAI's newest model, excelling at agentic coding, debugging,
research, tool calling, and a wide range of other tasks.

### 2026-05-05 — Global Branching GA (week of 2026-05-18)

Starting the week of May 18, 2026, Global Branching (formerly Foundry
Branching) will be generally available to all users on all enrollments.
Global Branching provides a shared workflow to make changes across multiple
applications on a single branch, test those changes end-to-end without
disrupting production workflows, and merge them back into `Main`.

Supported applications: transforms and TypeScript v1 functions repositories,
Pipeline Builder, the Ontology, Workshop, AIP Logic, and Object Views.
Restricted Views and Automate are now available in beta.

(See `ontology/global-branching-overview-2026-05-05.md` companion mirror
for the full overview.)

---

## Significance map for palantir-mini

| Announcement | Date | palantir-mini impact |
|--------------|------|----------------------|
| AI FDE GA | 2026-03-12 | Anchor date for AI FDE 8-modes mirror; canonical agentic Foundry agent surface. |
| AIP Document Intelligence chunking | 2026-03-17 | Substrate pattern for RAG retrieval — parallel to palantir-mini's research/ retrieval. |
| Ontology MCP × Copilot Studio | 2026-03-26 | Builder-vs-consumer MCP split anchor for `dev-toolchain/palantir-mcp-and-ontology-mcp-2026-03-26.md`. |
| AIP Evals integrated into AI FDE | 2026-04-14 | 19-evaluator anchor; companion to `aip/aip-evals-overview-and-ontology-edits-2026-04-14.md`. |
| Claude Opus 4.7 GA | 2026-04-21 | Lead model upgrade anchor (rule 12 §Model policy: Lead = `opus[1m]` = `claude-opus-4-7[1m]`). |
| AIP Agent → AIP Chatbot rename | 2026-04-22 | Naming guidance recorded in `aip/BROWSE.md` §Naming note. |
| Global Branching GA | 2026-05-05 (eff. 2026-05-18) | Companion to `ontology/global-branching-overview-2026-05-05.md`. |
| GPT-5.5 GA | 2026-05-05 | Latest OpenAI model anchor (1.05M context). |

---

## Local indexing notes

- **Cited by**:
  - `~/.claude/research/palantir-vision/aipcon-devcon/announcements.md` §ANN-MAR2026, §ANN-APR2026, §ANN-MAY2026 (interpretation layer cross-refs).
  - `~/.claude/rules/12-lead-protocol-v2.md` v3.3.0 §Model policy (Claude Opus 4.7 GA = Lead model anchor).
- **Companion mirrors** (combined into this single bundle):
  - All other 7 mirror files in this 8-file batch reference back to specific announcements here as their date anchors.
- **Pre-existing fetch overlap**: prior `security-deployments/` dir contained Apollo + foundry-administration content but no announcements page. This is a **new file** filling that gap.
- **Refresh trigger**: refetch on the 1st of each new month to capture the prior month's announcements (June 2026 issue: refetch 2026-06-02 to capture May 2026 final + early June). Set up a research-library-refresh task for this.
- **Out of scope (excluded from this bundle)**:
  - Non-AIP announcements: Quiver redesigned graph mode, Pipeline Builder managed profiles (compute), email media set ingestion, media item version history, object & property security policies (security/governance, included partially), incremental media set inputs.
  - Non-AIP product launches (Pipeline Builder Models, etc.) referenced briefly only when they touch AIP surfaces (e.g. Pilot — AI app builder — included; Models in Pipeline Builder — excluded as primarily MLOps).
- **Note**: announcement entries here are condensed-form summaries of the official text, suitable for cross-referencing. For full announcement text including images and screenshots, refer to the source URLs.
