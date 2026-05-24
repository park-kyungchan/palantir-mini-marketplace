---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/quickbooks-online/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/quickbooks-online/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4d540e2bfbcf64c74b7c21beb200075c3086c02515b05f9f2d76eeed4511bf0a"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > QuickBooks Online"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# QuickBooks Online

<!-- BEGIN GENERATED -->

The QuickBooks Online connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/RNK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| quickbooks.api.intuit.com | If `UseSandbox=FALSE` (Default) |
| sandbox-quickbooks.api.intuit.com | If `UseSandbox=TRUE` |
| qbo.sbfice.intuit.com | Used when retrieving Entitlements (only available when `UseSandbox=FALSE)` |
| appcenter.intuit.com | Authorization URL |
| developer.api.intuit.com | Always. May be used for token disconnects |
| oauth.platform.intuit.com | Always. Token URL |

<!-- END GENERATED -->
