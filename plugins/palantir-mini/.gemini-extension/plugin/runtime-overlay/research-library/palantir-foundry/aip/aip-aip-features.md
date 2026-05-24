---
source: https://www.palantir.com/docs/foundry/aip/aip-features/
fetched: 2026-04-20
section: aip-stack
doc_title: AIP features
---

AIP features
=============

Applications across the Palantir platform are equipped with AIP-powered capabilities. These capabilities are powered by your choice of supported LLMs.

AIP applications and builder capabilities
------------------------------------------

AIP enables developers and builders to create LLM-backed workflows, agents, and applications using LLM-native tools like AIP Agent Studio and AIP Logic, or AIP-accelerated platform applications like Pipeline Builder and Workshop.

Palantir-provided LLMs are also available in core Foundry features such as Functions, Transforms, and Jupyter notebooks via Code Workspaces.

### AIP application reference

| Application | Description |
| --- | --- |
| **AIP Assist** | LLM-powered support tool that helps users navigate the Palantir platform by providing real-time, secure natural language assistance. Context-aware responses in the user's preferred language. |
| **AIP Logic** | No-code development environment for creating, testing, and deploying AI-powered functions. Point-and-click LLM usage backed by Ontology data. Enables automation of complex processes with robust security controls. |
| **AIP Agent Studio** | Create interactive agents that leverage enterprise-specific data in the Ontology and a range of tools to complete tasks. Automate manual actions, edit Ontology data, streamline workflows, and enhance application interactions. |
| **AIP Evals** | Foundation of stable, reliable AIP workflows in production. Test and evaluate LLM-based functions and prompts; compare different models; examine variance across runs. |
| **AIP Threads** | Easy way to use LLMs for ad-hoc analyses — drag and drop documents or pick from existing resources and agents, then prompt the LLM. No technical setup required. |
| **Palantir MCP** | Enables external AI IDEs and agents to connect to the Palantir platform. Query data, access documentation, and build applications using Ontology context. |

AIP and the developer toolchain
---------------------------------

Palantir's dev toolchain gives you building blocks to create AI applications that work directly with your Ontology data, logic, and actions. Ontology SDK (OSDK) lets you write AIP-powered apps in Python, Java, or TypeScript, with built-in access to AIP Logic functions. Palantir MCP connects external AI IDEs and agents to the Palantir platform.

AIP features in platform applications
---------------------------------------

AIP has been embedded into core Foundry applications:

### AIP Assist sidebar

From any platform application, you can open the AIP Assist sidebar (context-aware). Keyboard shortcut: `Cmd + Shift + U` (macOS) or `Ctrl + Shift + U` (Windows).

### Pipeline Builder

* **Use LLM node:** Execute LLMs on your data at scale, with trial runs over sample rows.
* **Text to embeddings:** Convert text strings into semantic vector representations using text-embedding-ada-002.
* **Core Assist features:** Explain pipeline steps, Regex Helper, Transform Assist.

### Automate

Automate is integrated with AIP Logic to create automations that monitor conditions and execute effects. Improves ontology management by automating application or staging of ontology edits for human review.

### Notepad

LLM-powered functionality in Notepad: spellcheck, shorten, modify, or translate text without affecting existing formatting.

### Scheduler

Use AIP in the Scheduler to generate schedule configurations from natural language prompts (generates cron format for complex triggers).
