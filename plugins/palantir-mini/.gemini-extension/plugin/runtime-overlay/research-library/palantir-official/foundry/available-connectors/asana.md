---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/asana/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/asana/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "afd2dc344525b31a1104945706f8b6e9e9b0758574bc2d74470dd97a65a900ed"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Asana"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Asana

Connect Foundry to Asana with the CData JDBC driver to import data into Foundry datasets.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Exploration | 🟢 Generally available |
| Bulk import | 🟢 Generally available |
| Incremental | 🟢 Generally available |

## Data model

The CData driver models Asana data as a list of tables in a relational database that can be queried using standard SQL statements. For information about the available tables and their contents, review the CData documentation for [Asana tables ↗](https://cdn.cdata.com/help/UJJ/jdbc/pg_alltables.htm).

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Asana** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Authentication

Authentication to Asana is performed with personal or service access tokens.

To generate a Service Account or personal access token, follow the guides in the Asana documentation:

* [Service Account token ↗](https://help.asana.com/s/article/service-accounts)
  * Use a Service Account token for persistent and durable source creation that does not directly link to an individual user.
* [Personal access token ↗](https://developers.asana.com/docs/personal-access-token)
  * Some organizations do not allow users to create access tokens. Reach out to your Asana administrators if you have issues obtaining one.

### Networking

The Asana connector requires network access to `app.asana.com` on port 443. If you are using a Foundry worker source, ensure that an [egress policy](/docs/foundry/administration/configure-egress/) exists. For agent worker sources, the server running the agent must have network access to this domain.

## Configuration options

The following configuration options are available for the Asana connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `Project ID` | Yes |   Find the project ID in the URL of the project on Asana. For example: `https://app.asana.com/0/PROJECT_ID/list` |
| `Credentials settings` | Yes |  Configure using the [Authentication](#authentication) guidance shown above. |
| `Proxy settings` | No | Enable and enter the username and password to allow a proxy connection to Asana.|
| `Logs` | No |  Enable to control how the connector logs information. Review the [log settings](#log-settings) section below for more details. |

### Log settings

Detailed logs may be required to troubleshoot connections. Use **Verbosity level** setting to increase or decrease the amount of information logged.

:::callout{theme="warning"}
Increasing log verbosity can lead to sensitive information being saved into Foundry build logs. Before sharing these logs, redact any passwords as necessary. Review the CData documentation to learn more about different [verbosity levels ↗](https://cdn.cdata.com/help/DNJ/jdbc/pg_advancedlogging.htm).
:::

## Sync data from Asana

To set up a Asana sync, select **Explore and create syncs** in the upper right of the source **Overview** screen. Next, select the tables you want to sync into Foundry. When you are ready to sync, select **Create sync for x datasets**.

Learn more about [source exploration](/docs/foundry/data-connection/source-exploration/) in Foundry.

## Configure Asana syncs

The Asana connector allows for advanced sync configurations to determine how much of which data is brought into Foundry.

After exploring your available tables and adding them to your connection, navigate to **Edit syncs**. From the **Syncs** panel to the left, find the sync you want to configure and select **>** to the right.

| Option  | Required?  | Description |
|--- |--- |---  |
| `Table` | Yes |  Choose what table from Asana should be copied into Foundry. See [data model](#data-model) for what tables are supported. |
| `Column selection` | No | Select a subset of columns to sync into Foundry. Review the [column selection](#column-selection) section below for more information. |
| `Row filters` | No | Enable and add filters to remove rows that do not fit criteria based on its column values. Review the [row filters](#row-filters) section below for more information. |
| `Limit` | No |  Adds an SQL `limit` clause to the underlying query. This setting can be used to limit the number of rows synced into Foundry in a single run. |
| `Incremental` | No |  Enable to sync data into Foundry in small batches. Review the [incremental](#incremental) section below for more information. |

### Incremental

Typically, syncs will import all matching rows from the target table, regardless if data changed between syncs or not. Incremental syncs, by contrast, maintain state about the most recent sync and only ingest new matching rows from the target.

Incremental syncs can be used when ingesting large tables from Asana. To use incremental syncs, the table must contain a column that is strictly monotonically increasing. Additionally, the table being read from must contain a column with one of the following data types:

* `DATE`
* `TIMESTAMP`

Numeric column types:

* `int`
* `TINYINT`
* `SMALLINT`
* `INTEGER`
* `long`
* `BIGINT`
* `NUMERIC`
* `NUMBER`
* `DECIMAL`
* `DEC`

String column types:

* `string`
* `VARCHAR`
* `CHAR`
* `NVARCHAR`
* `NCHAR`
* `LONGNVARCHAR`
* `LONGVARCHAR`

Incremental syncs require the following configurations:

Option  | Required?   | Description |
|---     |---          |---          |
| Column | Yes | Select the column that will be used for incremental ingests. The dropdown menu will be empty if the table does not contain any supported columns types. |
| `Initial value` | Yes  | The value from which to start syncing data.  |

**Example:** A 5TB table contains billions of rows that we want to sync to Asana. The table has a **monotonically increasing column** called `id`. The sync can be configured to ingest 50 million rows at a time using the `id` column as the **incremental column**, with an initial value of -1 and a configured limit of 50 million rows.

When a sync is initially run, the first 50 million rows (ascending based on `id`) containing an `id` value greater than -1 will be ingested into Foundry. For example, if this sync was run several times and the largest `id` that was ingested during the last run of this sync was `19384004822`, the next sync will ingest the next 50 million rows starting with the first `id` greater than `19384004822`, and so on.

### Column selection

Choose the columns to sync into Foundry. If no column is selected, all columns will be synced into Foundry.

:::callout{theme="warning"}
All column names must start with either an underscore or a character from the English alphabet. The names can only contain underscores, characters from the English alphabet, or numbers.

The following examples are valid column names:

* `_colum_name`
* `a_column_name_123`

The following examples are invalid column names:

* `1ColumnName`; starts with a number.
* `a-column-name*`; contains hyphens and an asterisk.
* `å-column-name`; contains non-English characters.
:::

### Row filters

Filters can be added to reduce the amount of synced rows or to individually select which rows will be synced into Foundry. For row filters to be configured, previews of the table must succeed. Before configuring row filters, we recommend refreshing the preview using the `Preview of inbound data` section at the bottom of the interface. The preview can be refreshed to validate the behavior of the filters added.

A filter configuration consists of a set of conditions that each row must pass for it to be synced into Foundry. Each set of conditions can be evaluated to either match if `all` the conditions match or if `at-least one`condition matches. Sets of conditions can be nested to give more fine-grained control over what to import and provide high flexibility. These are equivalent to `AND` and `OR` statements in standard SQL.

A condition itself is a simple comparison of a value in the column of the table in Asana against a value that can be entered in the interface. For example, the condition `CreatedAt` is equal to `12/04/2021` will only import those rows where the value in the `CreatedAt` column is `12/04/2021`. The data type of the column determines the comparison operations that are supported.

#### Comparison operations

The following operations are supported in the filter:

* `EQUAL TO`
* `GREATER THAN`
* `LESS THAN`
* `GREATER THAN OR EQUAL TO`
* `LESS THAN OR EQUAL TO`
* `NOT EQUAL TO`
* `IS NULL`
* `IS NOT NULL`

These comparison operations behave equivalent to how these operations would behave in standard SQL.

String type columns additionally support `Like` and `Not like` operators which use the standard SQL-92 syntax.
