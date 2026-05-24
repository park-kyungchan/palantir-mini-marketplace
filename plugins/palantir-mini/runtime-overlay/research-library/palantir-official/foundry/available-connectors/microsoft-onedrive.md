---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/microsoft-onedrive/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/microsoft-onedrive/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bbdb00f2d8e2d5545e1aa54a027568054fcd8ebeb78ac14600ad62b4253e88b4"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Microsoft OneDrive"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Microsoft OneDrive

<!-- BEGIN GENERATED -->

The Microsoft OneDrive connector is a [Palantir-provided driver](/docs/foundry/data-integration/foundry-provided-drivers/) connector. The official documentation for this driver can be found [here ↗](https://cdn.cdata.com/help/UOK/jdbc/pg_connectionj.htm).

## Networking

The table below lists the domains that the source needs to be able to access in order to successfully run.

If running the connection on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), be sure to add corresponding egress policies for each of those domains.

If those domains are in a different network from Foundry's network, and you are using [agent proxy egress policies](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) (preferred) or an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) (not recommended), the agent must be able to reach the domain addresses. Additionally, the systems on those domains must be configured to allow connections from the agent. [Learn more about agent networking.](/docs/foundry/data-connection/set-up-agent/#configure-agent-network-access)

| Domain  | Required |
|--- |--- |
| graph.microsoft.com | If `AzureEnvironment=GLOBAL` (default) |
| login.microsoftonline.com | If `AuthScheme=AzureAD` (default), AzureServicePrincipal, AzureServicePrincipalCert AND `AzureEnvironment=GLOBAL` |
| microsoftgraph.chinacloudapi.cn | If `AzureEnvironment=CHINA` |
| login.chinacloudapi.cn | If `AuthScheme=AzureAD` (default), AzureServicePrincipal , AzureServicePrincipalCert AND `AzureEnvironment=CHINA` |
| graph.microsoft.us | If `AzureEnvironment=USGOVT` |
| login.microsoftonline.us | If `AuthScheme=AzureAD` (default), AzureServicePrincipal, AzureServicePrincipalCert AND `AzureEnvironment=USGOVT` or USGOVTDOD |
| dod-graph.microsoft.us | If `AzureEnvironment=USGOVTDOD` |

<!-- END GENERATED -->

## Extracting files

Files can be extracted from Microsoft OneDrive by executing the [DownloadFile ↗](https://cdn.cdata.com/help/UOK/jdbc/pg_sp-downloadfile.htm) stored procedure.

To extract a file, add the following SQL query in the sync definition.

```sql
EXECUTE DownloadFile ResourceId = '1234'
```

This will produce an output dataset with the file content stored in a Base64 encoded string column, which should be decoded to binary in a downstream data transformation.

![Microsoft OneDriver syncextracting a file using a stored procedure.](/docs/resources/foundry/available-connectors/onedrive-downloadfile-procedure.png)
