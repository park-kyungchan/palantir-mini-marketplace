---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/sap-concur/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/sap-concur/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8f5fd20acfed66493e7d17d19cf7edb3dc72ff4a5ac8eab3c9a1327810c101cd"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > SAP Concur"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SAP Concur

<!-- BEGIN GENERATED -->

The SAP Concur connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/FNK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| developer.concur.com | Always |
| us2.api.concursolutions.com | If `UseSandbox=FALSE` (default) AND `Region=US` (default) |
| www-us2.api.concursolutions.com | If `UseSandbox=FALSE` (default) AND `Region=US` (default) - OAuth Authorization URL |
| eu2.api.concursolutions.com | If `UseSandbox=FALSE` (default) AND `Region=EU` |
| www-eu2.api.concursolutions.com | If `UseSandbox=FALSE` (default) AND `Region=EU` - OAuth Authorization URL |
| cn.api.concurcdc.cn | If `UseSandbox=FALSE` (default) AND `Region=CN` |
| www-cn.api.concurcdc.cn | If `UseSandbox=FALSE` (default) AND `Region=CN` - OAuth Authorization URL |
| us-impl.api.concursolutions.com | If `UseSandbox=TRUE` AND `Region=US` (default) |
| www-us-impl.api.concursolutions.com | If `UseSandbox=TRUE` AND `Region=US` (default) - OAuth Authorization URL |
| emea-impl.api.concursolutions.com | If `UseSandbox=TRUE` AND `Region=EU` |
| www-emea-impl.api.concursolutions.com | If `UseSandbox=TRUE` AND `Region=EU` - OAuth Authorization URL |
| \<GeoLocation> | If `UseNewOAuthVersion=FALSE` - GeoLocation property (retrieved automatically unless OAuthAccessToken set) |
| \<ConcurInstanceURL> | Used with older API versions (API v1-3) |
| concursolutions.com | If `UseNewOAuthVersion=FALSE` AND GeoLocation empty AND ConcurInstanceURL empty |

<!-- END GENERATED -->
