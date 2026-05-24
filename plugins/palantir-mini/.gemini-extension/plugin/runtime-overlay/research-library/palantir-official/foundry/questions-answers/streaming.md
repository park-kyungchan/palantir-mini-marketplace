---
sourceUrl: "https://www.palantir.com/docs/foundry/questions-answers/streaming/"
canonicalUrl: "https://palantir.com/docs/foundry/questions-answers/streaming/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "27a6039ae07dbce116949fa9bd1c8b232f4f2e1cbaa49f0257d64fadb390d6fd"
product: "foundry"
docsArea: "questions-answers"
locale: "en"
upstreamTitle: "Documentation | Product QAs > Streaming"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Streaming

### Is there a default number of output partitions for a Flink pipeline and is it configurable?

The output is limited to 8 partitions by default when automatically computing the number of partitions, but this output can be set to a maximum of 16 in the pipeline settings.

*Timestamp:* March 2, 2024

### What is the best practice for converting a batch dataset to a stream for exporting to Kafka?

The best practice is to create a streaming pipeline in Pipeline Builder, using a batch dataset as the input and configuring the output as a stream. This stream can then be exported to Kafka, following the normal [Kafka streaming export documentation](/docs/foundry/available-connectors/kafka/#export-data-to-kafka).

*Timestamp:* March 26, 2024

### How can I replay a stream from a Java deployment UDF?

You can replay a stream by bumping the logic version in the pipeline configuration yaml file.

*Timestamp:* July 25, 2024
