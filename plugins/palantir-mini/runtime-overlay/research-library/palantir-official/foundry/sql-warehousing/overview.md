---
sourceUrl: "https://www.palantir.com/docs/foundry/sql-warehousing/overview/"
canonicalUrl: "https://palantir.com/docs/foundry/sql-warehousing/overview/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3b580c0cabffbba706454de0b8f940de96d0c2c088395f82ba52062a79694eae"
product: "foundry"
docsArea: "sql-warehousing"
locale: "en"
upstreamTitle: "Documentation | SQL in Foundry > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SQL in Foundry

Foundry supports SQL queries against both tabular data and ontology object types, using a common [Spark SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/). SQL is available from the dedicated [SQL Studio](/docs/foundry/sql-warehousing/sql-studio/) application, the embedded [SQL console](/docs/foundry/sql-warehousing/sql-console/) in supported applications, and external SQL clients connected via [Arrow Flight SQL](/docs/foundry/sql-warehousing/arrow-flight-sql/) or the [SQL REST API](/docs/foundry/api/v2/sql-queries-v2-resources/sql-queries/execute-sql-query/).

## Capabilities

SQL in Foundry enables you to:

* **Query tabular data** using standard SQL syntax powered by the [Furnace](/docs/foundry/sql-warehousing/furnace/) engine.
* **Query ontology object types** using the [Ontology SQL](/docs/foundry/sql-warehousing/ontology-sql/) engine.
* **Create and modify tabular data**.
* **Author Ontology SQL functions (beta)**.
* **Run quick contextual queries** using the embedded [SQL console](/docs/foundry/sql-warehousing/sql-console/).
* **Connect external tools** to query Foundry resources with SQL.

## Getting started

To get started with SQL in Foundry:

1. **Learn the fundamentals** by reviewing the [SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/) documentation, along with the [Furnace](/docs/foundry/sql-warehousing/furnace/) and [Ontology SQL](/docs/foundry/sql-warehousing/ontology-sql/) engine overviews.
2. **Open the SQL editor**, either via SQL Studio or the embedded SQL console in supported applications.
3. **Run your first query** referencing [SQL examples](/docs/foundry/sql-warehousing/sql-examples/).
4. **Connect external tools** using [Arrow Flight SQL](/docs/foundry/sql-warehousing/arrow-flight-sql/).

For details on the roles and permissions that govern SQL access, see [SQL permissions](/docs/foundry/sql-warehousing/sql-permissions/).
