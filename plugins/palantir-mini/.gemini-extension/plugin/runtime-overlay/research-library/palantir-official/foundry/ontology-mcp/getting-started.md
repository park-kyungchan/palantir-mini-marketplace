---
sourceUrl: "https://www.palantir.com/docs/foundry/ontology-mcp/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/ontology-mcp/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "84b95cebb7925fa5249e93a7981d51a2cbaebf06689e745dced437dcea52ceb0"
product: "foundry"
docsArea: "ontology-mcp"
locale: "en"
upstreamTitle: "Documentation | Ontology MCP > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

To enable Ontology MCP (OMCP) for your application:

1. Navigate to your application in Developer Console.
2. Select the **MCP** page on the left side menu.
3. Toggle the button on the top right to enable MCP server for your application.
4. Use the configuration details listed on the page based on your selected agent framework.

![The Ontology MCP toggle in Developer Console application settings.](/docs/resources/foundry/ontology-mcp/mcp-enabled.png)

:::callout{theme="neutral"}
Even if your framework of choice is not listed, the configuration is likely similar assuming your framework can act as an MCP client.
:::

Once enabled, your application will expose its ontology resources as MCP tools. External MCP clients can connect to your application using the connection details shown in the settings panel.

:::callout{theme="neutral"}
Ensure your application has the appropriate [application restrictions](/docs/foundry/developer-console/application-restrictions/) configured to control which ontology resources are accessible through MCP.
:::
