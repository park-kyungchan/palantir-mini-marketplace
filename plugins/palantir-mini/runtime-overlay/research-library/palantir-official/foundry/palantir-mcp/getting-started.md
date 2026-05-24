---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-mcp/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-mcp/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8d25d78a329f513fa6a9e629061a235e5902e146a590bb5a179e306b4b182a23"
product: "foundry"
docsArea: "palantir-mcp"
locale: "en"
upstreamTitle: "Documentation | Palantir MCP > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

Use the following section below to explore useful tips and best practices to get started with Palantir MCP.

## Ask for coding help

If you need coding assistance, the Palantir MCP can help by searching the Palantir documentation or getting context about your current repository.

In a TypeScript OSDK repository:

```plaintext
What ontology objects do I have in my OSDK?
```

In a Python transforms repository:

```plaintext
Can you rewrite this Python transform to use lightweight?
```

## Analyze a dataset

If you are working in a Python transforms repository, it is often necessary to understand the contents of a dataset. You can prompt the model to analyze datasets for you by providing a dataset RID.

Replace the <RID> in the prompt below with a dataset RID or URL to the dataset, or reference an existing transform code file (commonly using the `@` shortcut).

```plaintext
Can you find an appropriate primary key in this dataset: <RID>?
```

## Create an Ontology object with notional data

If you are working on a TypeScript OSDK application, it is common to reference data that may not yet be in the ontology. Instead of breaking focus on your current task, you can ask the MCP to create notional data for you and continue working on your application.

```plaintext
I'm working on this OSDK application and need to reference some user data that I don't have in my OSDK yet.
Can you create a new notional user dataset, create a new User Ontology object, and then create a pull request for me?

The user dataset should have the columns:
user_id, name, email
```

## Ask what tools are available

To receive a full list of tools available in Palantir MCP that can be useful for your workflows, you can ask the following:

```plaintext
What tools does the Palantir MCP (Model Context Protocol) provide?
When should they be used?
```

![Ask the agent what tools are available in Palantir MCP.](/docs/resources/foundry/palantir-mcp/palantir-mcp-tools-ask.png)
