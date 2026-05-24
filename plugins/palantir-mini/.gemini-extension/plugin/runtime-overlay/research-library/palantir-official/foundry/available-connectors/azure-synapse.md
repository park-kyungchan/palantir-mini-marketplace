---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/azure-synapse/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/azure-synapse/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fa2f3a977408f9be05020ca1c1e859ab25ac64c2de80351a55eba7b828d3a169"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Azure Synapse"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Azure Synapse

<!-- BEGIN GENERATED -->

The Azure Synapse connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/HEK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<Server>:\<Port> | Always. Server connection property |
| None | Always. Port connection property |
| \<StorageAccountLocation> | Used for staging data in COPY mode |
| login.microsoftonline.com | If `AuthScheme=AzureAD,` AzureServicePrincipal, AzureServicePrincipalCert, AzurePassword AND `AzureEnvironment=GLOBAL` (default) |
| login.chinacloudapi.cn | If `AuthScheme=AzureAD,` AzureServicePrincipal , AzureServicePrincipalCert, AzurePassword AND `AzureEnvironment=CHINA` |
| login.microsoftonline.us | If `AuthScheme=AzureAD,` AzureServicePrincipal, AzureServicePrincipalCert, AzurePassword AND `AzureEnvironment=USGOVT` or USGOVTDOD |

<!-- END GENERATED -->
