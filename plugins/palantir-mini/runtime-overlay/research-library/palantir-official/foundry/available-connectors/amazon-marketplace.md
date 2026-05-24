---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/amazon-marketplace/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/amazon-marketplace/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b796470ed706036a1ba3f40b08be05b4be2900365b7cdec296cdd4dd389e41c0"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Amazon Marketplace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Amazon Marketplace

<!-- BEGIN GENERATED -->

The Amazon Marketplace connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/ONK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| sts.\<AWSRegion>.amazon.com | If `Schema=SellingPartner,`  AWSRegion Mappings |
| sellingpartnerapi-\<AWSRegion>.amazon.com | If `Schema=SellingPartner,` SellingPartner Mappings |
| sandbox.sellingpartnerapi-\<AWSRegion>.amazon.com | If `Schema=SellingPartner` and `UseSandbox=True,` SellingPartner Sandbox Mappings |
| mws.amazonservices.\<Marketplace> | If `Schema=Marketplace,` AWSMarketplace Mappings |
| api.amazon.com | If using OAuth |
| Seller Central URLs | If using OAuth |
| oa.cdata.com | If using the embedded CData OAuth credentials |

<!-- END GENERATED -->

## Extracting files

Files can be extracted from Amazon Marketplace by executing the [GetReport ↗](https://cdn.cdata.com/help/ONK/jdbc/pg_SellerCentralsp-getreport.htm) stored procedure.

To extract a file, add the following SQL query in the sync definition.

```sql
EXECUTE GetReport @ReportDocumentId = '1234'
```

This will produce an output dataset with the file content stored in a Base64 encoded string column, which should be decoded to binary in a downstream data transformation.
