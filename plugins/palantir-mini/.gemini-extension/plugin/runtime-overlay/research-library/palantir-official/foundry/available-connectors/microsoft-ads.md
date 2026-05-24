---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/microsoft-ads/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/microsoft-ads/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e19a3fa31f1c1443df123f233d6ab45139dfa20759e90cfa70194b43365cf483"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Microsoft Ads"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Microsoft Ads

<!-- BEGIN GENERATED -->

The Microsoft Ads connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/EZK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| bingads.microsoft.com | Always |
| api.bingads.com | Always |
| clientcenter.api.bingads.microsoft.com | Always |
| login.microsoftonline.com | Always |
| campaign.api.bingads.microsoft.com | If `UseSandbox=False` |
| clientcenter.api.bingads.microsoft.com | If `UseSandbox=False` |
| adinsight.api.bingads.microsoft.com | If `UseSandbox=False` |
| reporting.api.bingads.microsoft.com | If `UseSandbox=False` |
| campaign.api.sandbox.bingads.microsoft.com | If `UseSandbox=True` |
| clientcenter.api.sandbox.bingads.microsoft.com | If `UseSandbox=True` |
| adinsight.api.sandbox.bingads.microsoft.com | If `UseSandbox=True` |
| reporting.api.sandbox.bingads.microsoft.com | If `UseSandbox=True` |

<!-- END GENERATED -->
