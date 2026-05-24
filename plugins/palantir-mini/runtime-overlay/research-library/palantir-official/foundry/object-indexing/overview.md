---
sourceUrl: "https://www.palantir.com/docs/foundry/object-indexing/overview/"
canonicalUrl: "https://palantir.com/docs/foundry/object-indexing/overview/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3ca55ab85985da425827e103574babc0aed9f8ce2b110c7bdcb6c69b4bf5cbcf"
product: "foundry"
docsArea: "object-indexing"
locale: "en"
upstreamTitle: "Documentation | Indexing > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Indexing

In the Ontology, **indexing** is the process of making tabular or other forms of data in Foundry datasources available for faster data retrieval operations through specialized databases.

This section of documentation describes the indexing process for Object Storage V2, in which indexing is overseen by the Object Data Funnel service ("Funnel"). The Funnel service is responsible for orchestrating Funnel pipelines that create and modify object instances in the Ontology and ensure up-to-date data and metadata.

There are two main types of funnel pipelines, **funnel batch pipelines** and **funnel streaming pipelines**, which allow users to adopt one or the other indexing mechanism depending on their datasource landscape, latency and workflow requirements, and cost considerations.

[Learn more about Funnel batch pipelines.](/docs/foundry/object-indexing/funnel-batch-pipelines/)

[Learn more about Funnel streaming pipelines.](/docs/foundry/object-indexing/funnel-streaming-pipelines/)

For information about Object Storage V1 (Phonograph) indexing, review the [legacy documentation](/docs/foundry/object-databases/object-storage-v1/).
