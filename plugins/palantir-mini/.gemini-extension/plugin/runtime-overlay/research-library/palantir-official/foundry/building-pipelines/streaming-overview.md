---
sourceUrl: "https://www.palantir.com/docs/foundry/building-pipelines/streaming-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/building-pipelines/streaming-overview/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "395690881912c541501db1568200a396b42a2c67390a5789e1a87576a90854fa"
product: "foundry"
docsArea: "building-pipelines"
locale: "en"
upstreamTitle: "Documentation | Streaming pipelines > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Streaming pipelines

Streaming pipelines provide the ability to make immediate critical decisions based on real-time data. By processing data as a stream with dedicated compute, streaming pipelines are able to process records with [very low latency](/docs/foundry/building-pipelines/streaming-performance-considerations/). On average, streaming data can be accessible in the Ontology and available for analysis in time series applications, such as [Quiver](/docs/foundry/quiver/overview/) or [Foundry Rules](/docs/foundry/foundry-rules/overview/), in under 15 seconds. To achieve this low-latency, streams are built on top of [compute that runs continuously](/docs/foundry/building-pipelines/streaming-compute-usage/) and require different architecture and maintenance consideration compared to batch pipelines.

## Best practices

When building out streaming pipelines, consider these factors:

* Streams often power highly operational workflows and require careful planning around downtime, maintenance, and logic changes to ensure high uptime and availability.
* Compute for streaming runs continuously. This can result in higher compute costs than a periodic batch job. Similarly to batch pipelines, consider starting with the smallest profile available and adjust that if the scale of your data requires it.
* Streams operate on a per-row basis and have constraints on the maximum row size to ensure low latency data transfers. The constraint is set to 1mb per individual row.
* Streams using state (windows or aggregations, for example) require design consideration to ensure the state is not broken when changing the stream logic.

## Get started

To start using streaming pipelines in Foundry, review how to [create a simple streaming pipeline](/docs/foundry/building-pipelines/create-stream-pipeline-pb/), and learn about streaming transforms in [Pipeline Builder](/docs/foundry/pipeline-builder/overview/). If you want to learn about connecting your data sources to Foundry, review [how to push data into a stream](/docs/foundry/data-connection/push-based-ingestion/), or [how to setup a streaming sync](/docs/foundry/data-connection/set-up-streaming-sync/).
