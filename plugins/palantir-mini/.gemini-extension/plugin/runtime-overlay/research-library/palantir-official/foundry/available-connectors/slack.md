---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/slack/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/slack/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "10ed6cf7aac72a0f3aca9a6117f67d8fef9b1a8cfb6df8981b380bf09efffd00"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Slack"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Slack \[Beta]

:::callout{theme="neutral" title="Beta"}
The Slack connector in Data Connection is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. Contact Palantir Support to request access to the Slack connector if you do not see it listed in Data Connection.
:::

Connect Foundry to Slack with the CData JDBC driver to import data into Foundry datasets.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Bulk import | 🟡 Beta |
| Exploration | 🟡 Beta |
| Incremental | 🟡 Beta |

## Data model

The CData driver models Slack data as a list of tables in a relational database that can be queried using standard SQL statements. For information about the available tables and their contents, review the CData documentation for [Slack tables ↗](https://cdn.cdata.com/help/FCJ/jdbc/pg_alltables.htm).

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Slack** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the set up of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Authentication

Authentication to Slack is performed with a bearer token. This can be supplied using a bot user token associated with an installed Slack app in your Slack workspace.

Use of a bot token allows for persistent and durable source creation that does not directly link to an individual user. To create a Slack app and obtain its bot token, follow the steps in the Slack documentation:

* [Create a Slack app in your target workspace. ↗](https://api.slack.com/start/quickstart#creating)
* [Configure the required scopes for the app. ↗](https://api.slack.com/start/quickstart#scopes)
  * See [Permissions](#permissions) for details of required scopes.
* [Install the app to your target workspace. ↗](https://api.slack.com/start/quickstart#installing)
  * App installation may require approval from your Slack workspace administrator. Any additions to the scopes for an app will also require re-installation.
  * After installation, follow the steps in the Slack documentation to locate and copy the bot token for the installed app into the Credentials settings for the Slack source in Data Connection (see [Configuration options](#configuration-options)).

### Permissions

To ingest data tables, the Slack application for the bearer token configured in the **Credentials** settings for [source configuration](#configuration-options) must be granted specific Slack permission scopes.

For a full list of permission scopes required to support all CData driver features, refer to the [CData documentation ↗](https://cdn.cdata.com/help/FCJ/jdbc/pg_oauthcustomappcreate.htm#configure-permission-scopes). Write permission scopes are **not** required when using the Slack connector for only data ingestion features. For more details on permission scopes, review the [Slack documentation ↗](https://api.slack.com/scopes).

Permission scope requirements for a Slack application used for data ingestion can be reduced if only specific data tables or types of Slack channel data in these tables are required for ingestion.

**Example:** Permission scope requirements for ingesting data tables related to Slack messages and channel types include the following:

| Table name | Scopes | Always Required? | Description |
|--- |--- |--- |--- |
| `Users` | `users:read` | Yes | Load users.  |
| `Channels` | `channels:read`, `groups:read`, `im:read`, `mpim:read`  | No | Only required if loading public, private, im (direct messages) or mpim (group direct messages) channels respectively. All are required when loading all channel types (which is the default if no channel filters are specified). |
| `Messages` or `MessageReplies` | `channels:history`, `groups:history`, `im:history`, `mpim:history` + requirements for `Channels` | No | Only required if loading messages/replies from public, private, im  or mpim channels respectively. All are required when loading from all channel types (which is the default if no channel filters are specified). Also see additional note below on channel membership requirements. |

:::callout{theme="neutral"}
To ingest messages and message replies from a given Slack channel using the bot token for a Slack application with the Slack connector, the Slack application must be **added to the Slack channel** first, as well as have read permission scopes for the channel type as detailed above.
Slack applications can be added to a channel in Slack by users manually or can use the application's bot user token to join public channels programmatically using the [Slack Web API ↗](https://api.slack.com/methods/conversations.join).
:::

### Networking

The Slack connector requires network access to `slack.com` on port `443`. If your source is running in Foundry, ensure that an [egress policy](/docs/foundry/administration/configure-egress/) to that address exists.

For sources running on an agent, the agent host must have network access to this domain.

## Configuration options

The following configuration options are available for the Slack connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `Credentials settings` | Yes |  Configure using the [Authentication](#authentication) guidance shown above. |
| `Proxy settings` | No | Enable and enter the username and password to allow a proxy connection to Slack. |
| `Logs` | No |  Enable to control how the connector logs information. |

## Sync data from Slack

To set up a Slack sync, select **Explore and create syncs** in the upper right of the source **Overview** screen. Next, select the tables you want to sync into Foundry. When you are ready to sync, select **Create sync for x datasets**.

[Learn more about source exploration in Foundry.](/docs/foundry/data-connection/source-exploration/)

## Configure Slack syncs

The Slack connector allows for advanced sync configurations to determine how much of which data is brought into Foundry.

After exploring your available syncs and adding them to your connector, navigate to **Edit syncs**. From the **Syncs** panel to the left, find the sync you want to configure and select **>** to the right.

| Option  | Required?  | Description |
|--- |--- |---  |
| `Table` | Yes |  Choose what table from Slack should be copied into Foundry. See [data model](#data-model) for what tables are supported. |
| `Column selection` | No | Select a subset of columns to sync into Foundry. Review the [column selection](#column-selection) section below for more information. |
| `Row filters` | No | Enable and add filters to remove rows that do not fit criteria based on its column values. Review the [row filters](#row-filters) section below for more information. |
| `Limit` | No |  Adds an SQL `limit` clause to the underlying query. This setting can be used to limit the number of rows synced into Foundry in a single run. |
| `Incremental` | No |  Enable to sync data into Foundry in small batches. Review the [incremental](#incremental) section below for more information. |

### Incremental

Typically, syncs will import all matching rows from the target table, regardless if data changed between syncs or not. Incremental syncs, by contrast, maintain state about the most recent sync and only ingest new matching rows from the target.

Incremental syncs can be used when ingesting large tables from Slack. To use incremental syncs, the table must contain a column that is strictly monotonically increasing. Additionally, the table being read from must contain a column with one of the following data types:

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

**Example sync configuration:**

* The `Messages` table contains all non-threaded reply messages for every channel the configured bearer token has access to.
* The table has a `CreatedTime` timestamp column for the message creation timestamp.
* The sync can be configured to ingest only new messages using the `CreatedTime` column as the **incremental column** for an **APPEND** transaction sync, along with an initial starting timestamp value from which to begin reading messages.
* When an initial sync is run, all messages created at or after the starting timestamp will be ingested.
* On the next sync, only messages created at or after the most recent `CreatedTime` timestamp from the previous sync will be ingested.
* A similar incremental sync configuration can be used to sync threaded message replies from the `MessageReplies` table using its `CreatedTime` timestamp column.

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

A condition itself is a simple comparison of a value in the column of the table in Slack against a value that can be entered in the interface. For example, the condition `CreatedAt` is equal to `12/04/2021` will only import those rows where the value in the `CreatedAt` column is `12/04/2021`. The data type of the column determines the comparison operations that are supported.

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
