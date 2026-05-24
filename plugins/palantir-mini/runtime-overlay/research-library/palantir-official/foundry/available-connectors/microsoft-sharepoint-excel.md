---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/microsoft-sharepoint-excel/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/microsoft-sharepoint-excel/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "56c25da934c7f6a6370031543b23de5ec1fdf77201924ebf084d0dbdcb89d11a"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Microsoft SharePoint Excel"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Microsoft SharePoint Excel

<!-- BEGIN GENERATED -->

The Microsoft SharePoint Excel connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/DTK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<URL> | Always. URL connection property |
| \<KerberosKDC>:88 | If `SharePointEdition='SharePoint OnPremise'` (default) AND `AuthScheme=Negotiate` |
| \<KerberosServiceKDC>:88 | If `SharePointEdition='SharePoint OnPremise'` (default) AND `AuthScheme=Negotiate` AND Kerberos topology uses multiple reams |
| \<SSOLoginURL> | If `SharePointEdition='SharePoint OnPremise'` (default) AND `AuthScheme=ADFS` |
| login.microsoftonline.com | If `SharePointEdition='SharePoint Online'` AND `AuthScheme=AzureAD,` AzurePassword, SharePointOAuth, OAuthJWT  AND `AzureEnvironment=GLOBAL` (default) |
| login.chinacloudapi.cn | If `SharePointEdition='SharePoint Online'` AND `AuthScheme=AzureAD,` AzurePassword, SharePointOAuth, OAuthJWT AND `AzureEnvironment=CHINA` |
| login.microsoftonline.us | If `SharePointEdition='SharePoint Online'` AND `AuthScheme=AzureAD,` AzurePassword, SharePointOAuth, OAuthJWT AND `AzureEnvironment=USGOVT` or USGOVTDOD |

<!-- END GENERATED -->
