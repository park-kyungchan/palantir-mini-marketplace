---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/jira-service-management/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/jira-service-management/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3b97bd81708ec7d2403afd1be420b4688c4aa23e03c030ff523b88bb42ea13ad"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Jira Service Management"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Jira Service Management

<!-- BEGIN GENERATED -->

The Jira Service Management connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/GKK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<URL> | URL connection property (usually https://yoursitename.atlassian.net) |
| api.atlassian.com | If `AuthScheme=OAuth` |
| \<SSOLoginURL> | If `AuthScheme=Okta` or Crowd |
| \<SSOExchangeURL> | If `AuthScheme=Okta` or Crowd |

<!-- END GENERATED -->
