---
source: https://www.palantir.com/docs/foundry/dev-toolchain/overview/
fetched: 2026-04-20
section: architecture-overviews
doc_title: Developer toolchain
---

## Developer toolchain

The Palantir platform comes with a set of developer tools that enable you to build on top of the Ontology and unlock value with new workflows, applications, and functionality. With Palantir's developer toolchain, you can access the full power of the Ontology directly from your development environment.

The Palantir developer toolchain provides:

- **Core APIs and SDKs** — open up the Ontology to your applications.
- **Development environments and developer-centric functionality** — accelerate your workflows.
- **Palantir MCP** — enable AI IDEs and AI agents to use Palantir context and take action throughout Foundry.
- **Compute modules** — containerize your code and scale your deployments.

### Core APIs and SDKs

#### Ontology SDK (OSDK)

The Ontology SDK (OSDK) enables developers to generate SDKs from their ontologies in Python, Java, and TypeScript. OSDK lets you access object types, apply actions to update data in the Ontology, call functions, and run AIP Logic functions for AIP-enabled enrollments. The in-platform Developer Console includes Ontology-specific documentation for the entities chosen for your application. Applications use the OAuth flow as a public or confidential client to access the data.

#### APIs

Palantir's APIs support users building on the Palantir platform by enabling programmatic management of platform access and the data backing your Ontology.

Available Palantir APIs include:
- Datasets
- Users
- Groups
- Builds [Beta]
- Schedules [Beta]

Beta platform SDKs are available for Python and TypeScript, usable alongside Ontology SDKs with the same Palantir platform clients.

### Developer environments and functionality

In addition to development tools focused on data connection such as Pipeline Builder and Code Repositories, Code Workspaces allows you to use familiar IDEs like VS Code while building on top of the Palantir platform.

VS Code workspaces are integrated with Developer Console, allowing you to rapidly build React applications.

**Global Branching** helps create a safe, streamlined environment for development of end-to-end workflows.

### Palantir MCP

Palantir MCP is an implementation of the Model Context Protocol that allows AI IDEs and AI agents to autonomously build end-to-end applications in the Palantir platform — from data integration through ontology configuration and application development. In addition, you can use Palantir MCP to allow external AI systems to query documentation, metadata, and data, as well as perform high-level tasks on the platform. Developers can use Palantir MCP to automate auxiliary tasks while they stay focused on the system they are building.

### Compute Modules

The Compute Modules feature enables you to deploy interactive containers on the Palantir platform, allowing you to bring in your existing code base (regardless of language) and run it inside the platform. With Compute Modules, for example, you could bring a third-party machine learning model into the platform and integrate it into your workflow.

### Custom endpoints

Custom endpoints enable developers to configure and deploy user-defined API endpoints with their own URL patterns, request and response shapes, and specifications, while leveraging Foundry's back-end capabilities. These endpoints are backed by the ontology through actions and functions.
