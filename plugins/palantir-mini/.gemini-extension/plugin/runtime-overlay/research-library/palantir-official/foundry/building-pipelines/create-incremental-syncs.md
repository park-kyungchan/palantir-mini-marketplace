---
sourceUrl: "https://www.palantir.com/docs/foundry/building-pipelines/create-incremental-syncs/"
canonicalUrl: "https://palantir.com/docs/foundry/building-pipelines/create-incremental-syncs/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c733d823a61611ccaea2188cb82367c31890c6a76e396bc74abc679c2fdff432"
product: "foundry"
docsArea: "building-pipelines"
locale: "en"
upstreamTitle: "Documentation | Incremental pipelines > Creating incremental syncs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Creating incremental syncs

Although it is possible to derive `APPEND`-only datasets in a pipeline from Data Connection syncs that are configured as `SNAPSHOT` transactions, most of the benefits of incremental pipelines come from applying incremental end-to-end. This means that data syncs into Foundry should consist of `APPEND` transactions that only bring new data into the system. An added benefit of configuring incremental syncs is that they minimize load on the source system and can reduce data storage requirements.

Most datasets synced from source systems consist of files synced from a file system, or extracts from a database or data warehouse configured using a JDBC source type. The following guides walk you through how to configure incremental syncs for these source types:

* [Optimize file-based append syncs](/docs/foundry/data-connection/file-based-syncs/)
* [Incremental JDBC syncs](/docs/foundry/data-connection/optimize-jdbc-syncs/#incremental-syncs)
