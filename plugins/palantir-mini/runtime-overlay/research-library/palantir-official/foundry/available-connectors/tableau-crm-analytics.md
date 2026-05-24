---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/tableau-crm-analytics/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/tableau-crm-analytics/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "54f73599b12cffb35f8777f7ab2f5cd4773b45a5874cba3f663963cfe7f66c99"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Tableau CRM Analytics"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Tableau CRM Analytics

<!-- BEGIN GENERATED -->

The Tableau CRM Analytics connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/FSK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| \<InstanceURL> | Always. Returned by Salesforce when authenticating; can be set with InstanceURL property when `InitiateOAuth=OFF` |
| login.salesforce.com | If `UseSandbox=FALSE` and Subdomain blank |
| test.salesforce.com  | If `UseSandbox=TRUE` |
| \<Subdomain>.cloudforce.com | Subdomain connection property is used for custom branded authentication pages |

<!-- END GENERATED -->
