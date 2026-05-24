---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/microsoft-exchange/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/microsoft-exchange/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0ceecfa3e894fd2036ebc08be7ce71db9f10cf27c9405126b9427bd23e23ec79"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Microsoft Exchange"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Microsoft Exchange

<!-- BEGIN GENERATED -->

The Microsoft Exchange connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/CEK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<Server> | Always. For Exchange Online, use `Server=' https://outlook.office365.com/EWS/Exchange.asmx'` |
| outlook.office365.com | If `Platform=Exchange_Online` AND `Schema=EWS` |
| graph.microsoft.com | If `Platform=Exchange_Online` AND `Schema=MSGraph` |
| login.microsoftonline.com | If `Platform=Exchange_Online` (default) AND `AuthScheme=AzureAD,` AzureServicePrincipal, or AzureServicePrincipalCert |
| \<KerberosKDC>:88 | If `AuthScheme=Negotiate` |
| \<KerberosServiceKDC>:88 | If `AuthScheme=Negotiate` AND Kerberos topology uses multiple realms |

<!-- END GENERATED -->
