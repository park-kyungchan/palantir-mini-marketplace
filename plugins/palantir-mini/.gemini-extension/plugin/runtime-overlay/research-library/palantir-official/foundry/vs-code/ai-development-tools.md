---
sourceUrl: "https://www.palantir.com/docs/foundry/vs-code/ai-development-tools/"
canonicalUrl: "https://palantir.com/docs/foundry/vs-code/ai-development-tools/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "648557606613bed06ab62ad356d8e277b5182fd164a8701f63881b6f7013d5ea"
product: "foundry"
docsArea: "vs-code"
locale: "en"
upstreamTitle: "Documentation | VS Code workspaces > AI development tools"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# AI development tools

AI development tools can be used in VS Code workspaces to assist with code generation, testing, debugging, and optimization.

## Continue

[Continue ↗](https://docs.continue.dev/) is an open source extension for VS Code. Continue provides features for AI code generation, including [chat ↗](https://docs.continue.dev/features/chat), [inline edits ↗](https://docs.continue.dev/features/edit), [codebase indexing ↗](https://docs.continue.dev/features/codebase-context), [custom context selection ↗](https://docs.continue.dev/features/codebase-context), and more.

In the Palantir platform, Continue is preconfigured to work with Palantir-provided language models, and has added knowledge about relevant Palantir SDKs and your Python transforms or OSDK repository. This contextual understanding of your data structures, Ontology, and organization allows Continue to generate more accurate and relevant code.

### Get started

Below are some commands and actions you can use to get started with Continue:

* Open the Continue extension from the VS Code sidebar, and use the model picker to select a Palantir-provided model.
* Select a code snippet in the editor and use the command `cmd/ctrl + L` to add context to a new chat.
* Select a code snippet in the editor and use the command `cmd/ctrl + I` to edit the selected code.
* Enter `@filename`, `@folder` or `@codebase` to reference parts of your codebase.
* Enter `@problems` to include linting errors in open files.

![The continue extension in VS Code Workspaces](/docs/resources/foundry/vs-code/continue-in-vscode-workspaces.png)

### Python transforms

In [Python transforms](/docs/foundry/transforms-python/overview/) repositories, Continue is preconfigured to understand how to write Python transforms. This includes knowledge of the following topics:

* The Python transforms SDK and related Palantir APIs.
* Dataset schemas: Include a dataset RID in your message, or in added context to automatically include dataset schemas and metadata.
* Foundry-specific conventions and best practices.

Ask `How do I write a transform?` to get started.

![Creating a new Python transform using the Continue extension in VS Code workspaces.](/docs/resources/foundry/vs-code/continue-python-transforms-generation.gif)

### OSDK

In [TypeScript OSDK](/docs/foundry/ontology-sdk-react-applications/overview/) repositories, Continue is preconfigured to understand the OSDK included in your repository. This includes the following:

* The TypeScript OSDK and its associated libraries.
* Ontology objects and their metadata, links, Actions and imported functions.

Ask `Tell me about my OSDK` in your repository to get started.

![Editing an OSDK app using the Continue extension in VS Code workspaces.](/docs/resources/foundry/vs-code/continue-osdk-generation.gif)

### Palantir MCP integration

Palantir MCP is integrated into VS Code workspaces by default. The MCP provides context from your code, library, and Foundry context to the LLM agent. It also offers agent tools to take actions within your repository and Foundry.

The following tools are provided by Palantir MCP in a VS Code workspace:

* Context tools for OSDK, Python, and TypeScript function repositories.
* Preview tools for Python transforms, allowing the agent to run a transform and fix errors if they occur.
* Ontology management tools for you to explore and modify the ontology.
* Developer Console tools for the agent to update and regenerate the OSDK without leaving your IDE.
* Foundry navigation tools to investigate Foundry project contents, view individual dataset schemas, and run SQL queries.

![Example of provided MCP tools in a VS Code workspace.](/docs/resources/foundry/vs-code/palantir-mcp-tools.png)

For more information, review our [Palantir MCP documentation](/docs/foundry/palantir-mcp/overview/).

### Pricing

Continue is included with VS Code workspaces at no additional charge. Usage of Palantir-provided models will incur compute costs according to [Palantir's AIP compute pricing model](/docs/foundry/aip/aip-compute-usage/#measuring-compute-with-aip).

### Security

Continue in VS Code workspaces is preconfigured to use the Palantir-provided models available on your enrollment. To maintain the same level of security offered across the platform, we do not recommend adding additional models directly in the Continue extension. To add additional models use [Control Panel](/docs/foundry/aip/enable-aip-features/#enable-llms).

### Availability

Continue is automatically available in VS Code workspaces if [AIP is enabled](/docs/foundry/aip/enable-aip-features/) on your enrollment. No additional installation or configuration is required. Contact your Palantir administrator to enable AIP for your enrollment.

***

Note: AIP feature availability is subject to change and may differ between customers.

VS Code workspaces and the Palantir extension for Visual Studio Code are not affiliated with or endorsed by Microsoft.

The Continue extension is a product of Continue Dev, Inc. No affiliation or endorsement is implied.
