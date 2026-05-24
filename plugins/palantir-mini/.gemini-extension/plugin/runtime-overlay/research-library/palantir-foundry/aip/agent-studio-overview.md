---
source: https://www.palantir.com/docs/foundry/agent-studio/
fetched: 2026-04-20
section: aip-stack
doc_title: AIP Agent Studio
---

AIP Agent Studio
================

**AIP Agent Studio** allows users to build interactive assistants, known as AIP Agents, that are equipped with enterprise-specific information and tools, deployable internally in the platform and externally through the [Ontology SDK](/docs/foundry/ontology-sdk/overview/) and [platform APIs](/docs/foundry/api/aip-agents-v2-resources/agents/agent-basics/).

Agents built in AIP Agent Studio are powered by large language models (LLMs), the Ontology, documents, and custom tools. AIP Agents can be integrated into applications to facilitate dynamic, context-aware read and write workflows that enable you to automate tasks and reduce manual application interactions.

The following example shows an AIP Agent that uses an application variable to take a filtered object set of video transcripts as context when answering user questions about the recent press conference from the Federal Reserve.

The above AIP Agent can also be deployed in a [Workshop application](/docs/foundry/workshop/widgets-aip-agent/) that enables users to interact with the selected video.

AIP Agent Studio is built on the same rigorous [security](/docs/foundry/security/overview/) model that governs the rest of the Palantir platform. These platform security controls grant an LLM access only to what is necessary to complete a task.

Build AIP Agents
----------------

To get started with AIP Agents and create increasingly complex, automated workflows, we recommend using the agent tier framework, where each tier increases in complexity and automation.

### Tier 1: Ad-hoc analysis

New to [AIP](/docs/foundry/platform-overview/overview/) or LLMs? Start with [AIP Threads](/docs/foundry/threads/overview/) to better understand how LLMs can help you improve productivity. Use AIP Threads for ad-hoc document analysis by dragging and dropping documents to get relevant LLM-powered answers.

### Tier 2: Task-specific agent

Upgrade ad-hoc thread configurations from AIP Threads to AIP Agents for reusability, with granular permissions and configuration options in [AIP Agent Studio](/docs/foundry/agent-studio/retrieval-context/#ontology-context). Agents can use Ontology, document, or custom function-backed context, allowing for more targeted and specific interactions. You can build and deploy these agents from AIP Agent Studio. You can use AIP Agents in AIP Threads or [OSDK](/docs/foundry/ontology-sdk/overview/) applications with [platform APIs](/docs/foundry/api/aip-agents-v2-resources/agents/agent-basics/).

### Tier 3: Agentic application

Incorporate AIP Agents into [Workshop](/docs/foundry/workshop/overview/) using the [AIP Agent widget](/docs/foundry/workshop/widgets-aip-agent/) or [third-party OSDK applications](/docs/foundry/ontology-sdk/overview/) using [Developer Console](/docs/foundry/developer-console/create-application/) and platform APIs. Configure variables on your agent to allow it to read from and update the [application state](/docs/foundry/agent-studio/application-state/).

### Tier 4: Automated agent

Automate and delegate tasks to your agent, enabling agents to handle complex workflows autonomously. Start by publishing your [agent as a function](/docs/foundry/agent-studio/getting-started/#save-view-and-publish-an-aip-agent) and pulling it into [AIP Automate](/docs/foundry/automate/overview/).

Learn more about the [core concepts](/docs/foundry/agent-studio/core-concepts/) of AIP Agent Studio or [get started](/docs/foundry/agent-studio/getting-started/) with building an AIP Agent.
