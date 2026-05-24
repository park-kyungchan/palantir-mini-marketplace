---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/ebay/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/ebay/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dfbf2bfb3cd3f5588de17d02420d94f0a1b1903b1055bdf990d12274522ea245"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > eBay"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# eBay

<!-- BEGIN GENERATED -->

The eBay connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/BEK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| auth.ebay.com | If `AuthScheme=OAuth` |
| signin.ebay.com | If `AuthScheme=AuthNAuth` |
| api.ebay.com | If `UseSandbox=False` |
| svcs.ebay.com | If `UseSandbox=False` |
| auth.sandbox.ebay.com | If `AuthScheme=OAuth` and `UseSandbox=True` |
| signin.sandbox.ebay.com | If `AuthScheme=AuthNAuth` and `UseSandbox=True` |
| api.sandbox.ebay.com | If `UseSandbox=True` |
| svcs.sandbox.ebay.com | If `UseSandbox=True` |

<!-- END GENERATED -->
