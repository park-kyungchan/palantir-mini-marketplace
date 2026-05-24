---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/microsoft-power-bi-xmla/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/microsoft-power-bi-xmla/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "91df116d2a3fd540eed175444b0e1f58cb61d2cad400eb3cce6478a8bc73b1e2"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Microsoft Power BI XMLA"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Microsoft Power BI® XMLA

:::callout{theme="warning"}
The following page discusses the Microsoft Power BI® XMLA connector for data integration. If you are searching for information on the Power BI® connector to access Foundry resources from the Power Query interface, review our [analytics connectivity documentation](/docs/foundry/analytics-connectivity/power-bi-overview/).
:::

<!-- BEGIN GENERATED -->

The Microsoft Power BI XMLA connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/LGK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| api.powerbi.com | IF `AzureEnvironment=GLOBAL(default)` |
| \*.pbidedicated.windows.net	 | IF `AzureEnvironment=GLOBAL(default);` The exact cluster used (added in the \*) is determined by calling the api.powerbi.com |
| login.microsoftonline.com | If `AuthScheme=AzureAD` (default), AzureServicePrincipal, AzureServicePrincipalCert AND `AzureEnvironment=GLOBAL` (default) |
| login.chinacloudapi.cn | If `AuthScheme=AzureAD` (default), AzureServicePrincipal , AzureServicePrincipalCert AND `AzureEnvironment=CHINA` |
| login.microsoftonline.us | If `AuthScheme=AzureAD` (default), AzureServicePrincipal, AzureServicePrincipalCert AND `AzureEnvironment=USGOVT,USGOVTHIGH` USGOVTDOD |
| api.powerbigov.us | IF `AzureEnvironment=USGOVT` |
| api.high.powerbigov.us | IF `AzureEnvironment=USGOVTHIGH` |
| api.mil.powerbigov.us | IF `AzureEnvironment=USGOVTDOD` |
| \*.pbidedicated.usgovcloudapi.net	 | IF `AzureEnvironment=USGOVT,USGOVTHIGH,USGOVTDOD` |

<!-- END GENERATED -->
