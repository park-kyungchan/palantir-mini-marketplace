---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/ibm-cloud-object-storage/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/ibm-cloud-object-storage/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "782fc0d9b2cd9dfb18f1ce98bf751e0c23c467a13f149fdc50787c022403a008"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > IBM Cloud Object Storage"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# IBM Cloud Object Storage

<!-- BEGIN GENERATED -->

The IBM Cloud Object Storage connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/GMK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| iam.bluemix.net | Always |
| resource-controller.cloud.ibm.com | Always |
| \<Region>.cloud-object-storage.appdomain.cloud | Always. Region connection property is mapped (may also be returned by IBM or part of CRN) |

<!-- END GENERATED -->
