---
sourceUrl: "https://www.palantir.com/docs/foundry/ontology-mcp/debugging-with-mcp-inspector/"
canonicalUrl: "https://palantir.com/docs/foundry/ontology-mcp/debugging-with-mcp-inspector/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8c7dbc73334853578a7fad1efec51670004cfb2c3ced41bc6ea7a41f79d79995"
product: "foundry"
docsArea: "ontology-mcp"
locale: "en"
upstreamTitle: "Documentation | Ontology MCP > Debugging with MCP Inspector"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Debugging with MCP Inspector

[MCP Inspector ↗](https://modelcontextprotocol.io/docs/tools/inspector) is an open-source developer tool for testing and debugging MCP servers. It provides an interactive interface where you can connect to any MCP server, browse available tools, execute them with custom inputs, and inspect the responses. This makes it useful for verifying that your Ontology MCP (OMCP) server is configured correctly before connecting it to an AI agent.

## Prerequisites

Before using MCP Inspector with your Ontology MCP server, ensure that you have enabled Ontology MCP for your application in Developer Console. Refer to [Getting started](/docs/foundry/ontology-mcp/getting-started/) for setup instructions.

## Run MCP Inspector

To launch MCP Inspector with your Ontology MCP server, navigate to the **MCP** page of your application in Developer Console and follow the instructions provided for running MCP Inspector. This page displays the connection configuration specific to your application.

Once the MCP inspector application launches, make sure to expand the **Authentication** section and add the client ID before selecting **Connect**. Note that you may also need to add a client secret if you are using a confidential client.

:::callout{theme="neutral"}
It may take a few seconds before tools are available during connection.
:::

![The "Authentication" section, displaying the "Client ID" and "Client secret" fields.](/docs/resources/foundry/ontology-mcp/mcp-mcpInspector-auth.png)

## Debug tools with MCP Inspector

Once MCP Inspector is connected to your Ontology MCP server, you can use it to list, execute, and inspect the tools exposed by your application.

### List available tools

Select the **Tools** tab in MCP Inspector to view all tools exposed by your Ontology MCP server. Each tool displays its name and description. This list should match the ontology resources you configured in your application's restrictions, including search tools, action tools, and query tools.

If a tool is missing from the list, verify that the corresponding ontology resource is included in your [application restrictions](/docs/foundry/developer-console/application-restrictions/).

### View tool history

![The "Tools" tab in MCP inspector, displaying a list of the tools exposed by your application."](/docs/resources/foundry/ontology-mcp/mcp-mcpInspector-tools.png)

Use the **History** section in the **Tools** tab to view a log of all requests made to your MCP server, including tool executions and their responses. This can help you track the sequence of interactions and identify any errors or unexpected behavior in your tools.

### Run a tool

Follow the steps below to execute a tool:

1. Select a tool from the list to view its input schema.
2. Fill in the required parameters in the input form. MCP Inspector displays the expected parameter types and descriptions for each tool.
3. Select **Run Tool** to execute the tool against your Ontology MCP server.

### View tool execution results

After running a tool, MCP Inspector displays the response in the **Results** panel.

You can inspect the following:

* **Success responses:** The returned data, such as object properties from a search tool or the result of an action execution.
* **Error responses:** Error messages and codes that indicate issues with the request, such as missing required parameters or permission errors.

Use the response details to verify that your tools return the expected data, and to diagnose issues with tool configurations or permissions.

## Limitations

Currently, Ontology MCP does not support prompts or resources, so the **Prompts** and **Resources** tabs in MCP inspector will display an empty list.
