---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/microsoft-dynamics-365-business-central/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/microsoft-dynamics-365-business-central/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5baf6cd48bb644fc4a0db5d347c4e724bbb38975d65bff52329ceeb326a35913"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Microsoft Dynamics 365 Business Central"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Microsoft Dynamics 365 Business Central

<!-- BEGIN GENERATED -->

The Microsoft Dynamics 365 Business Central connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/FBK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<OrganizationURL> | Always. OrganizationURL connection property (will contain more than just the base domain) |
| api.businesscentral.dynamics.com | This endpoint will likely be used in any cloud instance, unless on-prem is used |
| login.microsoftonline.com | If `AuthScheme=AzureAD,` AzureServicePrincipal, AzureServicePrincipalCert AND `AzureEnvironment=GLOBAL` (default) |
| login.chinacloudapi.cn | If `AuthScheme=AzureAD,` AzureServicePrincipal , AzureServicePrincipalCert AND `AzureEnvironment=CHINA` |
| login.microsoftonline.us | If `AuthScheme=AzureAD,` AzureServicePrincipal, AzureServicePrincipalCert AND `AzureEnvironment=USGOVT` or USGOVTDOD |

<!-- END GENERATED -->
