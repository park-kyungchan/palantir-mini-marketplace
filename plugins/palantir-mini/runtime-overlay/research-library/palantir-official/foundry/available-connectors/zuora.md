---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/zuora/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/zuora/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "654ebef335e2017843d6cfc40bb63268096ce73eaa12977703c461da07e9655c"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Zuora"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Zuora

<!-- BEGIN GENERATED -->

The Zuora connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/HZK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| rest.zuora.com | If `Tet=USProduction` (default) |
| rest.apisandbox.zuora.com | If `Tet=USAPISandbox` |
| rest.pt1.zuora.com | If `Tet=USPerformanceTest` |
| rest.eu.zuora.com | If `Tet=EUProduction` |
| rest.sandbox.eu.zuora.com | If `Tet=EUSandbox` |
| rest.na.zuora.com | If `Tet=USCloudProduction` |
| rest.sandbox.na.zuora.com | If `Tet=USCloudAPISandbox` |
| rest.test.zuora.com | If `Tet=USCentralSandbox` |
| rest.test.eu.zuora.com | If `Tet=EUCentralSandbox` |
| \<URL> | URL connection property for US Production copy environment |

<!-- END GENERATED -->
