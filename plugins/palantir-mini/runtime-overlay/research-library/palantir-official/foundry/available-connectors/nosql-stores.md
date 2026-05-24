---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/nosql-stores/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/nosql-stores/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9d9c0bd91c4950dfd18c53e9f85bd4339364ad119011b609ddd7c5f20dcb8353"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > NoSQL stores"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# NoSQL Stores

Data Connection can be configured to sync data from a wide variety of NoSQL databases. Some examples of NoSQL stores that have previously been integrated include:

* **Amazon DynamoDB**
* **Apache HBase**
* **Azure Cosmos DB**
* **Cassandra**
* **Cockroach DB**
* **CouchDB**
* **Elasticsearch**
* **InfluxDB**
* **MarkLogic**
* **MongoDB**
* **Neo4j**
* **OrientDB**
* **Redis**

:::callout{theme="neutral"}
The recommended configuration approach may differ depending on the NoSQL database:

* Some systems have dedicated connectors that may be selected directly on the new source page. When there is a dedicated connector, we recommend selecting it directly.
* Some systems have a REST API that can be used using the [REST API source](/docs/foundry/available-connectors/rest-apis/).
* Some systems provide a JDBC driver that can be used with the generic [JDBC connector](/docs/foundry/available-connectors/custom-jdbc-sources/).
* For systems that do not fall into one of the above categories, contact Palantir support.
:::
