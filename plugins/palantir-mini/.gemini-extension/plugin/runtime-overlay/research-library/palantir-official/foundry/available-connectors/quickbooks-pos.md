---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/quickbooks-pos/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/quickbooks-pos/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4a9d83451ccf250b9802dbabf7f7360f3df02c7b293b80a9b010ba79d4fa72cf"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > QuickBooks POS"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# QuickBooks POS

<!-- BEGIN GENERATED -->

The QuickBooks POS connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/DRJ/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<URL> | Always. URL connection property - Address and Port of the host machine running the CData QuickBooks Gateway |

<!-- END GENERATED -->
