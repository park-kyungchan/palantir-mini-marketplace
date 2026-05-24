---
sourceUrl: "https://www.palantir.com/docs/foundry/sql-warehousing/sql-studio/"
canonicalUrl: "https://palantir.com/docs/foundry/sql-warehousing/sql-studio/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "da5f45d8853293930439c7bd21d1acfc45127cceaa7ee48231846404511f848f"
product: "foundry"
docsArea: "sql-warehousing"
locale: "en"
upstreamTitle: "Documentation | SQL in Foundry > SQL Studio"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SQL Studio

:::callout{theme="neutral" title="Beta"}
SQL Studio is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development, and some features may not be available in your environment. Functionality may change during active development. Foundry administrators can enable SQL Studio from the [**Application access** page of Control Panel](/docs/foundry/administration/configure-application-access/).
:::

SQL Studio is Foundry's dedicated application for writing and running SQL queries against datasets, tables, and ontology object types. SQL Studio supports interactive analytical workflows, read and write operations on tabular data, and the authoring of [Ontology SQL functions (beta)](/docs/foundry/sql-warehousing/sql-functions/).

SQL Studio is built on Foundry's two SQL engines: [Ontology SQL](/docs/foundry/sql-warehousing/ontology-sql/) for querying ontology object types and [Furnace](/docs/foundry/sql-warehousing/furnace/) for querying tabular data, which share a common [Spark SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/). For embedded SQL access in the context of a specific resource (such as a dataset or object type), see [SQL console](/docs/foundry/sql-warehousing/sql-console/).

![The SQL Studio application.](/docs/resources/foundry/sql-warehousing/sql-studio.png)

## Accessing SQL Studio

Once enabled by a Foundry administrator, SQL Studio is accessible from:

* The **Applications** menu.
* The expand option in any embedded [SQL console](/docs/foundry/sql-warehousing/sql-console/).
* Opening a SQL worksheet from the Compass browser.

To enable SQL Studio, Foundry administrators can navigate to the [**Application access** page of Control Panel](/docs/foundry/administration/configure-application-access/).

## Modes

SQL Studio supports two modes that determine which compute engine executes your queries and which resources you can query.

You can switch between modes from the mode selector in the resource browser toolbar. The active mode determines which resources appear in the browser and which engine executes your query.

### Data mode

In **data mode**, you can query tabular data, such as tabular [datasets](/docs/foundry/data-integration/datasets/), [Iceberg tables](/docs/foundry/data-integration/iceberg-tables/), and [virtual tables](/docs/foundry/data-integration/virtual-tables/), using the [Furnace SQL engine](/docs/foundry/sql-warehousing/furnace/).

Data mode supports both read and write operations:

* `SELECT` queries.
* `CREATE TABLE` operations.
* `INSERT`, `UPDATE`, and `DELETE` operations on Iceberg tables.

### Object mode

In **object mode**, you can query ontology object types and many-to-many links using the [Ontology SQL engine](/docs/foundry/sql-warehousing/ontology-sql/). Object mode is read-only and supports `SELECT` queries against object types defined in [Ontology Manager](/docs/foundry/ontology-manager/overview/).

## Worksheets

Worksheets are the primary way you organize work in SQL Studio. SQL Studio supports both ephemeral and persistent worksheet workflows.

### Scratchpad

The **scratchpad** is an ephemeral editor for one-off analyses. Scratchpad contents are not saved as a Foundry resource and are not shared with other users.

### Saved worksheets

You can save your code as a **SQL worksheet** to persist it as a Foundry resource. Your worksheet can optionally be saved either:

* **Privately**, accessible only to you and visible only from SQL Studio.
* **Into a project**, making the worksheet available as a project resource that can be shared with other users who have access to the project.

### Worksheet versioning

Saved worksheets are versioned. Each manual save creates a new version that you can view and restore from the worksheet's version history. Between manual saves, unsaved changes are automatically staged so that in-progress work persists across sessions; auto-staged changes do not create new versions.

:::callout{theme="warning"}
Note that the scratchpad is not versioned. If work is replaced or overwritten in the scratchpad, it is not retrievable.
:::

## Writing and running queries

SQL Studio uses Foundry's [Spark SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/) for both data mode and object mode. The editor provides syntax highlighting, autocomplete for table, object type, and column names, and inline error reporting.

To run a query, select **Run** in the editor toolbar or use the keyboard shortcut. To run only part of a query, highlight the relevant SQL and run the selection.

In data mode, table identifiers are referenced by filesystem path or resource identifier (RID), wrapped in backticks:

```sql
SELECT * FROM `branch_name`.`/path/to/dataset`;
```

In object mode, object types are referenced by their RID:

```sql
SELECT * FROM `ri.ontology.main.object-type.<object-type-rid>`;
```

For full syntax reference, see the [SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/) documentation. For mode-specific guidance, see [Furnace](/docs/foundry/sql-warehousing/furnace/) and [Ontology SQL](/docs/foundry/sql-warehousing/ontology-sql/).

## AI-assisted query generation

SQL Studio includes a conversational AIP side panel that can generate, explain, and debug SQL queries. The panel is available alongside the editor and supports multi-turn interactions within a single session.

The AIP panel has access to:

* The current contents of the editor.
* The schemas of any datasets, tables, or object types referenced in the query.
* Foundry's [SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/), including supported functions and syntax for the active mode.

When generating SQL, the panel can either replace the editor contents with new code or append to the existing query. Each prompt and response is preserved in the session so you can iterate conversationally on the generated output.

The AIP side panel is available for users with the [AIP and core assistant features permission](/docs/foundry/aip/enable-aip-features/#aip-permissions) enabled.

## Previewing and visualizing results

After running a query, results are displayed in the results panel below the editor.

The default preview limit is 1,000 rows. Users with the [appropriate permissions](#roles-and-permissions) can configure SQL Studio to return up to 10,000 rows per query from the SQL Studio settings menu.

Results can be visualized in a table or as a chart. Both visualizations are subject to the preview limit. For example, if a query produces 100,000 matching rows, you would by default view a table or chart of only the first 1,000 rows.

![SQL Studio with a query editor and a results panel showing query results in a table.](/docs/resources/foundry/sql-warehousing/sql-studio-results-panel.png)

## Ontology SQL functions

You can author and publish [Ontology SQL functions (Beta)](/docs/foundry/sql-warehousing/sql-functions/) from SQL Studio. Ontology SQL functions are reusable, parameterized SQL queries over ontology objects that can be published as ontology functions and called from across Foundry.

## Connecting external tools

For tabular data querying via the Furnace engine, you can also connect externally using:

* [Arrow Flight SQL](/docs/foundry/sql-warehousing/arrow-flight-sql/), or
* [REST API](/docs/foundry/api/v2/sql-queries-v2-resources/sql-queries/execute-sql-query/)

For object types querying via the Ontology SQL engine, you can connect externally using the [Ontology MCP server](/docs/foundry/ontology-mcp/overview/), which exposes ontology SQL to MCP-compatible clients.

## Roles and permissions

Access to SQL Studio is governed by the same SQL and download control roles that apply across Foundry. For details on the available roles and how they interact with SQL access, see [SQL permissions](/docs/foundry/sql-warehousing/sql-permissions/).
