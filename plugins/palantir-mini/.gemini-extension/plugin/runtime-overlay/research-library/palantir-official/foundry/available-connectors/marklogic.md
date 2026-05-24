---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/marklogic/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/marklogic/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2632935d5be5cae22a5631246797dc6718b8e1cdf33956291537f7b5159be488"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > MarkLogic"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# MarkLogic

<!-- BEGIN GENERATED -->

The MarkLogic connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/OMK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<Server>:\<Port> | Always |

<!-- END GENERATED -->
