---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-python/tables-compute-pushdown/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-python/tables-compute-pushdown/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "07316c2a0dc0ae8d67e41ddb522219cb830c2c90423b7fd5b43d13a0f0f49fd2"
product: "foundry"
docsArea: "transforms-python"
locale: "en"
upstreamTitle: "Documentation | Virtual tables and compute pushdown > Compute pushdown"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Compute pushdown

Tables backed by a [BigQuery](/docs/foundry/available-connectors/bigquery/), [Databricks](/docs/foundry/available-connectors/databricks/), or [Snowflake](/docs/foundry/available-connectors/snowflake/) connection can push Foundry authored transforms to BigQuery, Databricks, or Snowflake. This is known as "compute pushdown", and allows Foundry's pipeline management, data lineage, and security functionality to be used on top of data warehouse compute. Use [virtual table](/docs/foundry/data-integration/virtual-tables/) inputs and outputs to push down compute.

![Compute pushdown architecture diagram.](/docs/resources/foundry/transforms-python/compute-pushdown-diagram.png)

For more information and code examples, refer to the following source-specific compute pushdown documentation:

* [BigQuery compute pushdown](/docs/foundry/transforms-python/tables-bigquery/)
* [Databricks compute pushdown](/docs/foundry/transforms-python/tables-databricks/)
* [Snowflake compute pushdown](/docs/foundry/transforms-python/tables-snowflake/)
