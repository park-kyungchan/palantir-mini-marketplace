---
sourceUrl: "https://www.palantir.com/docs/foundry/data-integration/streaming-guide/"
canonicalUrl: "https://palantir.com/docs/foundry/data-integration/streaming-guide/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d5b41e35d98fca56cdf671f342a57cb678c03d87275f7f4499d823dc5ec8318e"
product: "foundry"
docsArea: "data-integration"
locale: "en"
upstreamTitle: "Documentation | Resource guides > Streaming"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Streaming resource guide

This page lists the resources you may need to reference when implementing an end-to-end streaming workflow.

Data Connection supports syncing data from a wide variety of streaming platforms into Foundry streaming datasets, which can then be used in [streaming pipelines](/docs/foundry/building-pipelines/streaming-overview/). Streaming syncs enable data to flow into Foundry with low latency and high throughput to support real time decision-making processes.

There are two ways to sync data from streams into Foundry:

* Data Connection supports pulling records from streaming platforms into Foundry. As with batch syncs, data is read from a stream and synced to Foundry using only unidirectional connections using the [agent architecture](/docs/foundry/data-connection/architecture/).
* If desired, Foundry enables pushing records from a stream directly into a Foundry stream via the *stream proxy*.

Foundry can connect to many sources of streaming data. Sources with dedicated connectors include:

* **[Apache Kafka](/docs/foundry/available-connectors/kafka/)**
* **[Amazon Kinesis](/docs/foundry/available-connectors/amazon-kinesis/)**
* **Amazon SQS**
* **[Aveva PI](/docs/foundry/available-connectors/pi/)**
* **[Google Pub/Sub](/docs/foundry/available-connectors/pubsub/)**

For streaming sources without a dedicated connector, you can connect to them using [external transforms](/docs/foundry/data-connection/external-transforms/). This includes sources such as:

* **ActiveMQ**
* **Amazon SNS**
* **IBM MQ**
* **RabbitMQ**
* **MQTT \[Beta]**
* **Solace**

This page lists the resources you may need to reference when implementing an end-to-end streaming workflow.

## 1. Core concepts

We recommend reviewing the following introductory concept page to understand what streams are, how they are stored, and how they are processed.

* [Streams](/docs/foundry/data-integration/streams/)
* [Flink in Foundry streaming](/docs/foundry/data-integration/flink-streaming/)

## 2. Overview

These pages will offer a broader scope of the various points to consider when determining if streaming is right for your use case or when deploying production streams.

* [Streaming pipelines overview](/docs/foundry/building-pipelines/streaming-overview/)
* [Comparison: Streaming vs. batch](/docs/foundry/building-pipelines/stream-vs-batch/)
* [Performance considerations](/docs/foundry/building-pipelines/streaming-performance-considerations/)
* [Streaming compute usage](/docs/foundry/building-pipelines/streaming-compute-usage/)
* [Streaming profiles](/docs/foundry/data-integration/streaming-profiles/)
* [Stream monitoring](/docs/foundry/data-integration/stream-monitoring/)
* [Streaming keys](/docs/foundry/building-pipelines/streaming-keys/)
* [Streaming stateful transforms](/docs/foundry/building-pipelines/streaming-stateful-transforms/)
* [Stream debugging](/docs/foundry/dataset-preview/overview/#stream-only-for-streaming-datasets)

## 3. Connect to data sources

You will need to complete one of the following workflows to connect your external data sources to Foundry for streaming. We recommend reviewing both options to understand possible benefits and limitations for your use case.

* [Set up a streaming sync](/docs/foundry/data-connection/set-up-streaming-sync/)
* [Push data into a stream](/docs/foundry/data-connection/push-based-ingestion/)

## 4. Transform your streaming data

You can use [Pipeline Builder](/docs/foundry/pipeline-builder/overview/) to transform your live data. Outputs of your Pipeline Builder transforms will still be streaming datasets that you can [use in real time throughout Foundry](/docs/foundry/building-pipelines/stream-vs-batch/#front-end-tools).

* [Create a streaming pipeline with Pipeline Builder](/docs/foundry/building-pipelines/create-stream-pipeline-pb/)
* [Integrate your stream with the Ontology](/docs/foundry/object-indexing/funnel-streaming-pipelines/)

## 5. Monitor streaming pipelines \[Beta]

Set up alerting around your pipeline's health.

* [Stream monitoring](/docs/foundry/data-integration/stream-monitoring/)

## 6. Development tools

Here, you can find tools to improve development of streaming pipelines.

* [Reset stream](/docs/foundry/data-integration/reset-stream/)
