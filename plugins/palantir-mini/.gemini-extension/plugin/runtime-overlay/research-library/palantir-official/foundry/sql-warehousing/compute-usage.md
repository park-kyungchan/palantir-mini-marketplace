---
sourceUrl: "https://www.palantir.com/docs/foundry/sql-warehousing/compute-usage/"
canonicalUrl: "https://palantir.com/docs/foundry/sql-warehousing/compute-usage/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fc03ff4bf610459c484573bd5bdafd2d5ba2ee20007498ec64c65e53028ace12"
product: "foundry"
docsArea: "sql-warehousing"
locale: "en"
upstreamTitle: "Documentation | SQL in Foundry > Compute usage"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Compute usage with SQL in Foundry

Running queries or builds with SQL warehousing in Foundry consumes compute resources, measured in compute-seconds. This page explains how compute is used by the SQL warehouse and how usage is attributed to Foundry resources for reporting. Usage can be viewed from the [Resource management application](/docs/foundry/resource-management/overview/).

## Foundry compute by query type

The below table lays out Foundry compute used in SQL warehouse queries by query type and links to relevant detailed documentation.

|Query type         |Resources queried      |Query engine               |Compute rate type               |Resource allocation        |
|---                |---                    |---                        |---                        |---                        |
|Read (SELECT) |Datasets, Iceberg tables       |[Furnace](/docs/foundry/sql-warehousing/furnace/) | [Transforms](/docs/foundry/code-repositories/compute-usage/#measuring-foundry-compute) |Split evenly across resources queried                       |
|Write (CREATE, INSERT, UPDATE, DELETE) |Datasets, Iceberg tables                   |  [Furnace](/docs/foundry/sql-warehousing/furnace/)                     |[Transforms](/docs/foundry/code-repositories/compute-usage/#measuring-foundry-compute)  |Split evenly across resources written to                       |
|Read (SELECT)|Datasets, Iceberg tables, virtual tables, restricted views, objects (via materializations)|[Legacy Spark engine](/docs/foundry/analytics-connectivity/architecture/#spark-engine)|[Contour](/docs/foundry/contour/compute-usage/)|Split evenly across resources queried|
|Read (SELECT)|Datasets|[Legacy direct read engine](/docs/foundry/analytics-connectivity/architecture/#direct-read-engine)|NA|NA|
|Read (SELECT) |Object Types, Many-to-Many Links    |[Ontology SQL](/docs/foundry/sql-warehousing/ontology-sql/) | [Foundry Ontology](/docs/foundry/ontologies/query-compute-usage/#investigating-foundry-compute-usage-from-ontology-queries) |The underlying saved application executing the query, if not present split evenly across resources queried
