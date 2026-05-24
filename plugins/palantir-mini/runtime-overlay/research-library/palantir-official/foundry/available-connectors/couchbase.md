---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/couchbase/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/couchbase/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2208fd30c301aa6c9c9adf2ff13805e6d0d57c1094cc012017297b50f8b5793d"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Couchbase"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Couchbase

<!-- BEGIN GENERATED -->

The Couchbase connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/CKK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<Server> | If `ConnectionMode=Direct` (Default); Server connection property. Can be an IP address or HTTP/S URL. Can accept multiple URLs |
| \<DNSServer> | If `ConnectionMode=Cloud,` DNS Server is used to look up server addresses (default port 53, port can be passed with \<Server>:\<Port>, but is not required) |
| \<N1QLPort> | If `ConnectionMode=Direct` and `CouchbaseServer=N1QL,` Port defaults to 18093 for SSL and 8093 when not SSL |
| \<AnalyticsPort> | If `ConnectionMode=Direct` and `CouchbaseServer=Analytics,` Port defaults to 18095 w/ SSL and 8095 w/o SSL |
| \<WebConsolePort> | If `ConnectionMode=Direct,` Port defaults to 18091 w/ SSL and 8091 w/o SSL |

<!-- END GENERATED -->
