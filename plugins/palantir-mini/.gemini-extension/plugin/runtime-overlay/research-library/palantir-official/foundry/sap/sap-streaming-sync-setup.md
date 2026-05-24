---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/sap-streaming-sync-setup/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/sap-streaming-sync-setup/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d996b4b6151202e816d1a7620f61187c98fd484ca7d15f60383f948c588d8162"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | Foundry SAP setup > Create a new streaming sync"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a new streaming sync \[Beta]

:::callout{theme="neutral" title="Beta"}
Streaming syncs from SAP are in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development.
:::

## Set up a source

SAP streaming ingest is only supported for [connections to an SAP system via the SAP SLT Replication Server](/docs/foundry/sap/architecture/#connecting-to-an-sap-erp-system-via-an-sap-slt-replication-server).

If one does not already exist, create a new SAP source that explicitly sets the connection type as SLT and includes the context to identify the source system. Follow the standard steps to [create a new source](/docs/foundry/sap/sap-source-setup/), and use custom YAML of the following form:

```yaml
type: magritte-sap-source
url: https://<host>:<port>/sap/palantir
usernamePassword: <username>:{{password}}
connectionType:
  type: slt
  slt:
    context: <context>
```

The context is the unique identifier of the RFC connection, as discussed in the [SLT configuration guide](/docs/foundry/sap/configure-sap-slt/#slt-configuration).

## Load considerations

Each streaming sync creates and subscribes to its own operational delta queue (ODQ) in the SLT Replication Server.

Streaming ingest works as follows:

* Foundry will poll the queue periodically; the poll interval defaults to 1 second and can be modified when creating the streaming sync.
* If there are no records on the queue, no further requests are made.
* If there are less than or equal to 50,000 records (the default page size) on the queue, those records will be consumed synchronously.
* If there are greater than 50,000 records on the queue, record consumption will be paginated.

In load testing, we observed that the lowest stream latency is achieved when there are at least as many available dialog work processes in the SLT Replication Server as there are active streaming syncs. When there are fewer available dialog work processes than active streaming syncs, latency is likely to be increased as streaming syncs compete for an available process to handle polling requests.

## Create a streaming sync

1. Open the SAP source. You should see a table of existing streaming syncs on the **Overview** page; you may need to scroll down the page to view. Select **+ Create streaming sync** at the top of this table.

   ![Create streaming sync](/docs/resources/foundry/sap/sap-create-streaming-sync.png)

2. In the first section, enter the name of the SAP table to stream.

![Sync settings](/docs/resources/foundry/sap/sap-streaming-sync-settings.png)

3. In the second section, choose a location for the output streaming dataset.

![Output dataset](/docs/resources/foundry/sap/sap-streaming-output-dataset.png)

:::callout{theme="warning"}
Before proceeding to the next step, ensure that the preview pane at the bottom of the screen has loaded. The schema for the streaming dataset is derived from this preview and will be incorrect if the preview has not finished loading. In some cases, the preview may only show the schema and no data; this is sufficient.
:::

4. Select **Create streaming sync** at the top right of the screen. You can choose to run the stream immediately or start it manually after creation.

![Create streaming sync button](/docs/resources/foundry/sap/sap-create-streaming-sync-button.png)

:::callout{theme="neutral"}
To ensure that a stream automatically restarts in the event of either Data Connection agent or SAP system downtime, [set a schedule](/docs/foundry/building-pipelines/create-schedule/) on the streaming dataset with a 1-minute time trigger.
:::

## Throughput and partition keys

Switching the throughput setting from **Normal** to **Very high** may help increase performance. However, this will increase the number of partitions used. When more than a single partition is used, partition keys will need to be set in order to guarantee ordering between unique records from SAP. These keys should make up the primary key for the table in SAP.
