---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/sap-source-setup/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/sap-source-setup/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "910965595bbaf73f35bcfa91f6993219c2aa6fd1bb988c73fc60fdc7a2c7117f"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | Foundry SAP setup > Create a new source"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a new source

For Foundry to connect to the Palantir Foundry Connector 2.0 for SAP Applications ("Connector"), a source needs to be configured in the Data Connection app. The configuration requires an [agent](/docs/foundry/data-connection/set-up-agent/), user credentials for the connection, and the URL for the SAP Source System.

To create an SAP source follow these steps:

1. Navigate the **Data Connection** app in the sidebar.

2. Select **Add Custom Source** option.

3. Choose the connection **Via an agent** option.

4. Give the source a name and location.

5. Complete the Source Setup requirements:
   * Select the Agent in the SAP network.
   * In the custom YAML section, fill in the definition as follows.

     ```yaml
       type: magritte-sap-source
       url: https://<host>:<port>/sap/palantir
       usernamePassword: <username>:{{password}}
     ```

     * The username and password are those for the technical user that was created for Foundry to use to connect to SAP.
     * The host is where the relevant SAP application server is located.
     * The port is the default HTTPS (or HTTP) port for ICM (the Internet Communication Manager), a component of the SAP application server.

     :::callout{theme="warning"}
     The expression `{{password}}` should be written as it appears. You can then enter the password under **Encrypted values** on the right of the dialog box and it will be encrypted.
     :::

6. Save the source definition.

## Configuration

These are the extra parameters that can be configured on the source.

| Parameter | Required? | Default | Description |
|---|:---:|:---:|---|
| `url` | Y |  | The base URL of the SAP add-on service endpoint. |
| `usernamePassword` | Y |  | The username and password are those for the technical user that was created for Foundry to use to connect to SAP. |
| `useKernelJsonSerialization` | N | false | Switch on kernel JSON serialization for paginated data returned from SAP. Only works for JSON formatted data: checks will fail if set to true when `useTsvFormat:true`. |
| `useTsvFormat` | N | false | Switch on using TSV format for paginated data returned from SAP (vs JSON). |
| `output` | N | 50,000 rows | Definition of the maximum file size (rows or bytes) that will be returned from SAP. |
| `convertDatesToStrings` | N | false | Ingest all dates as strings for this source. |
| `proxy` | N | None | Proxy configurations for connecting to SAP. |
| `cacheConfigurations` | N  | None | Cache configurations for configuring cache timeouts for different SAP Object types. |

### Configuring the maximum size of each Parquet file

The maximum file size of each Parquet file in Foundry datasets can be defined on a specific sync (for that specific sync) or on the Source (for all syncs).

If you would like to change the maximum size of each Parquet file for *all* syncs under a given source, you can configure this in the source config.

Examples:

```yaml
output:
  maxFileSize:
    type: rows
    rows:
      max: 10000
```

```yaml
output:
  maxFileSize:
    type: bytes
    bytes:
      approximateMax: 400MB
```

:::callout{theme="neutral"}
Specifying the maximum size in bytes is only approximate. The resulting file sizes might be slightly smaller or larger.
:::

:::callout{theme="neutral"}
If specifying a maximum size in bytes, the number of bytes needs to be at least twice as large as the in-memory buffer size of the Parquet writer (which defaults to 128MB).
:::
