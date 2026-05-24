---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/db2/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/db2/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1b274a062de17efacae06ed4f270855115fe3469630561abbd0630426f51522c"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Db2"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Db2

Connect Foundry to Db2 to read and sync data between Db2 databases and Foundry.

## Supported capabilities

| Capability | Status |
| --- |--- |
| Exploration | 🟢 Generally available |
| Batch syncs | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| Change data capture syncs | 🟢 Generally available |
| [Table Exports](/docs/foundry/data-connection/export-overview/#table-exports) | 🟢 Generally available |

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Db2** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Configuration options

|Parameter	|Required?	|Description	|
|---	|---	|---	|
|`URL`	|Yes	|The JDBC URL that is used by the driver. Comes pre-populated with a template that may need to be modified to ensure correct behavior. Refer to the source system's documentation for the JDBC URL format, and review the [Java documentation ↗](https://docs.oracle.com/javase/tutorial/jdbc/basics/connecting.html) for additional information. 	|
|`JDBC properties`	|Yes	|Lists out all required and recommended properties that the driver needs. Hovering over a required or recommended property will allow you to navigate to the official documentation. You can add any additional properties by hitting the **+ Add property** button. 	|
|	|	|	|

### JDBC properties

You can add [properties ↗](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/Properties.html) to your JDBC connection to configure behavior. Certain properties are mandatory for the Db2 driver. These mandatory properties are populated by default and must be set before you can save your source. You can also view recommended properties that you can add by selecting **+Add property** and viewing the **Recommended** section.

Hover over the name of a `Required` or `Recommended` property to visit the official documentation page for the Db2 driver.

## Configure Db2 syncs

### SQL queries

A single SQL query can be executed per sync. This query should produce a table of data as an output and should not perform operations like invoking stored procedures. The results of the query will be saved to the output dataset in Foundry.

![The SLQ Query input on the Edit syncs page for a JDBC connector.](/docs/resources/foundry/available-connectors/jdbc-sql-query.png)

## Table Exports

The Db2 source type supports [table exports](/docs/foundry/data-connection/export-overview/#table-exports). For Db2 databases running on z/OS or LUW (Linux, Unix, Windows), no additional configuration should be required. However, for Db2 databases running on the IBM iSeries or AS/400, [journaling ↗](https://www.ibm.com/docs/en/i/7.5?topic=integrity-journaling) must be enabled for any target tables.

## Change data capture

The Db2 connector supports [change data capture](/docs/foundry/data-integration/change-data-capture/) (CDC) syncs. Db2 CDC syncs are implemented using the [Debezium Db2 connector ↗](https://debezium.io/documentation/reference/stable/connectors/db2.html). To enable CDC on your Db2 instance, follow the instructions outlined in the [Debezium documentation ↗](https://debezium.io/documentation/reference/stable/connectors/db2.html#setting-up-db2).

Once change data capture is enabled for the table(s) you wish to sync to Foundry, you can navigate to the **Overview** page and select **+ Create CDC sync** to start creating a new change data capture sync.

:::callout{theme="neutral"}
The exploration runtime must be working in order to create a change data capture sync. If the runtime is still initializing, you may need to wait a few seconds and refresh the page to proceed with creating a change data capture sync.
:::
