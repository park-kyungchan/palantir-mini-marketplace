---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/exact-online/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/exact-online/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6a7540db3f25b509c98cfd9336c5ea34b208f42e4a41b5ab078c6373a95c1367"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Exact Online"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Exact Online

<!-- BEGIN GENERATED -->

The Exact Online connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/DYK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| start.exactonline.\<Region> | Always |

### Region Mappings

Use the following region mapping to complete the domain url:

| Region  | Endpoint |
|--- |--- |
| United Kingdom | co.uk |
| The Netherlands | nl |
| Belgium | be |
| Germany | de |
| Spain | es |
| France | fr |

<!-- END GENERATED -->
