---
sourceUrl: "https://www.palantir.com/docs/foundry/sql-warehousing/furnace/"
canonicalUrl: "https://palantir.com/docs/foundry/sql-warehousing/furnace/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1f53cb0a0de933ea5a34a1b94684d9c9c1d6485873bc9498b904ff7b0f0b5af1"
product: "foundry"
docsArea: "sql-warehousing"
locale: "en"
upstreamTitle: "Documentation | SQL in Foundry > Furnace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Furnace

Furnace is Foundry’s modern SQL warehousing engine, purpose-built for flexibility, performance, and extensibility. Furnace lets you run powerful, flexible SQL queries on your data, using the latest industry standards for compute and interoperability. With Furnace, you can run read/write SQL on top of Foundry compute, both natively inside Foundry and from your choice of third-party analytics tools. Furnace is engineered from first principles to support multiple compute engines behind a common syntax, providing future-proofing and resilience for your SQL workloads.

## Furnace architecture

Furnace’s architecture decouples query parsing and planning from query execution. This separation is key to Furnace's flexibility and extensibility:

* **Query parsing & planning:** All SQL queries are parsed and planned using a unified engine-agnostic layer. This layer leverages Apache Calcite to parse SQL into an abstract syntax tree (AST), validate it, and optimize the query, regardless of the eventual compute engine.
* **Compute engine abstraction:** After planning, Furnace determines which compute engine should execute the query. The compute engine is responsible for running the query, reading data, and returning results.
* **Engine selection:** By default, Furnace intelligently selects the best available engine for each query based on workload, compatibility, and performance. Engine selection is automatic and requires no configuration from users.
* **Unified user experience:** Regardless of which compute engine is used or whether the query entry point is inside the Foundry platform or external, users interact with Furnace through the same APIs and interfaces (including [Arrow Flight SQL](/docs/foundry/sql-warehousing/arrow-flight-sql/)), and benefit from consistent support for modern table formats like Iceberg.

This architecture diagram demonstrates the information flow for interactive Furnace queries:

![Diagram showing the architecture of Furnace, including routing to different compute engines and routing of large and small results.](/docs/resources/foundry/sql-warehousing/furnace-diagram.png)

## Supported compute engines

Furnace's compute engine abstraction allows Palantir to update and optimize supported engines over time.

Currently supported Furnace engines are:

* [Spark ↗](https://spark.apache.org/)
* [Trino ↗](https://trino.io/)

## Unified SQL experience

Furnace provides a unified SQL experience across all connection methods:

* **In-platform queries** via [SQL Studio](/docs/foundry/sql-warehousing/sql-studio/) and [SQL Console](/docs/foundry/sql-warehousing/sql-console/)
* **External BI tools** via existing [ODBC/JDBC drivers](/docs/foundry/analytics-connectivity/odbc-jdbc-drivers/)
* **Modern integrations** via [Arrow Flight SQL](/docs/foundry/sql-warehousing/arrow-flight-sql/)

All connection methods benefit from Furnace's intelligent engine selection and performance optimizations, regardless of how you connect to Foundry.
