---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/hdfs/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/hdfs/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b907c5982c0af8eafe4b02bdf6da35ec09a7aa5f81e9d72059f34473910f7dbf"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > HDFS"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# HDFS

Connect Foundry to the Hadoop Distributed File System (HDFS) to read and sync data from HDFS to Foundry datasets.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Exploration | 🟢 Generally available|
| Bulk import | 🟢 Generally available |

## Data model

The connector can transfer files of any type into Foundry datasets. File formats are preserved, and no schemas are applied during or after the transfer. Apply any necessary schema to the output dataset, or [write a downstream transformation](/docs/foundry/pipeline-builder/transforms-overview/) to access the data.

## Performance and limitations

There is no limit to the size of transferable files. However, network issues can result in failures of large-scale transfers. In particular, direct cloud syncs that take more than two days to run will be interrupted. To avoid network issues, we recommend using smaller file sizes and limiting the number of files that are ingested in every execution of the sync. Syncs can be [scheduled](/docs/foundry/data-connection/set-up-sync/#build-or-schedule-your-batch-sync) to run frequently.

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **HDFS** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Networking

We recommend using the [HDFS scheme ↗](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/ViewFsOverloadScheme.html) if available due to faster RPC performance. Alternatively, [WebHDFS ↗](https://hadoop.apache.org/docs/r1.0.4/webhdfs.html) is a HTTP REST API that supports the complete FileSystem interface for HDFS. Some examples include:

* hdfs://myhost.example.com:1234/path/to/root/directory
* webhdfs://example.com/path
* swebhdfs://example.com/path

:::callout{theme="warning"}
The required network ports will differ based on the selected scheme. For the HDFS scheme, these ports are typically 8020/9000 on the NameNode server and 1019, 50010, and 50020 on the DataNode. For the WebHDFS scheme, the required port is typically 9820.
:::

### Certificates and private keys

SSL connections validate server certificates. Normally, SSL validations happen through a certificate chain; by default, both agent and Foundry workers trust most industry-standard certificate chains. If the server to which you are connecting has a self-signed certificate, or if there is TLS interception during the validation, the connector must trust the certificate. Learn more about [using certificates in Data Connection](/docs/foundry/data-connection/set-up-source/#optional-add-certificates).

## Configuration options

The following configuration options are available for the HDFS connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `URL` |  Yes  |  The HDFS URL to the root data directory  |
| `Extra properties` | No |  Add a properties map that is passed to the [Hadoop Configuration ↗](https://hadoop.apache.org/docs/r2.7.1/api/org/apache/hadoop/conf/Configuration.html). Each entry is a name and value pair that corresponds to a single property, avoiding the need for specifying the config on disk via `configurationResources`.|

### Advanced options

The following advanced options are available for the HDFS connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `User` | No |  HDFS user (defaults to currently logged in user for agent worker sources). <br>The `user` parameter overrides Data Connection's global Kerberos settings. Leave the `user` parameter blank if you are using Kerberos. |
| `File change timeout` | No | Amount of time (in [ISO-8601 ↗](https://docs.oracle.com/javase/8/docs/api/java/time/Duration.html#parse-java.lang.CharSequence)) a file must remain constant before being considered for upload. <br>If possible, use the more efficient `lastModifiedBefore` processor.|

## Sync data from HDFS

Visit the `Explore` tab to interactively explore data available in the configured HDFS instance. Select `New Sync` to regularly pull data from HDFS to a specified dataset in Foundry.

## HDFS export task (legacy)

:::callout{theme="warning"}
[Export tasks](/docs/foundry/data-connection/export-tasks/) are a legacy feature that is *not* recommended for new implementations. This documentation is provided for users who are still using legacy export tasks.
:::

### Basic configuration

```yaml
type: export-hdfs-task
directoryPath: /some/directory
```

### Complete configuration options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `directoryPath` | Yes | N/A | The directory where files will be written |
| `incrementalType` | No | snapshot | Use `incremental` for incremental exports |
| `retriesPerFile` | No | 0 | Number of retry attempts per file on failure |
| `rewritePaths` | No | N/A | Map of regex patterns for path rewriting (see [common configuration](/docs/foundry/data-connection/export-tasks/#path-rewriting)) |

### Incremental exports

For incremental exports, set `incrementalType` to `incremental`. The first export will export all files, then subsequent exports will only include new transactions if the previous transaction is still present in the dataset.

```yaml
type: export-hdfs-task
directoryPath: /exports/incremental/
incrementalType: incremental
```

### Connection retries

If you experience connection issues to the HDFS cluster, you can configure retry attempts per file. Setting `retriesPerFile: 1` will attempt to export each file twice (one initial attempt plus one retry).

```yaml
type: export-hdfs-task
directoryPath: /some/directory
retriesPerFile: 1
```
