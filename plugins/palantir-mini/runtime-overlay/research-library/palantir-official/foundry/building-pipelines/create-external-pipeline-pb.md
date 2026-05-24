---
sourceUrl: "https://www.palantir.com/docs/foundry/building-pipelines/create-external-pipeline-pb/"
canonicalUrl: "https://palantir.com/docs/foundry/building-pipelines/create-external-pipeline-pb/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "de14ad0983370d17e4a8e21a9957749d4a8f19414f980745f764b36b2cc0114e"
product: "foundry"
docsArea: "building-pipelines"
locale: "en"
upstreamTitle: "Documentation | Getting started > External pipelines with Pipeline Builder"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# External pipelines in Pipeline Builder

:::callout{theme="neutral"}
If you're new to Pipeline Builder, review [how to create a batch pipeline in Pipeline Builder](/docs/foundry/building-pipelines/create-batch-pipeline-pb/) before proceeding.
:::

Pipeline Builder now offers **external pipelines**, which push down compute to external compute engines. This functions in a similar manner as [compute pushdown in Python transforms](/docs/foundry/transforms-python/tables-compute-pushdown/), and allows Foundry's pipeline management, data lineage, and security functionality to be used on top of external data warehouse compute. As with compute pushdown in Python transforms, all inputs and outputs from external pipelines must be [virtual tables](/docs/foundry/data-integration/virtual-tables/).

Tables built with external compute can be composed together with datasets and tables built with Foundry-native compute using Foundry’s scheduling tools, allowing you to orchestrate complex multi-technology pipelines using the exact right compute at every step along the way.

![Diagram showing how Foundry external pipelines use virtual tables to enable you to push down compute to external execution engines.](/docs/resources/foundry/building-pipelines/compute-pushdown-diagram.png)

## Supported external compute engines for Pipeline Builder

Currently, Databricks and Snowflake are supported external compute engines in Pipeline Builder. To use other external compute engines, such as BigQuery, use [transforms with compute pushdown](/docs/foundry/transforms-python/tables-compute-pushdown/).

|Source type|Status|Notes|
|---|---|---|
|[BigQuery](/docs/foundry/available-connectors/bigquery/)| Not available ||
|[Databricks](/docs/foundry/available-connectors/databricks/)| Generally available | Serverless (default) or classic compute available. |
|[Snowflake](/docs/foundry/available-connectors/snowflake/)| Beta ||

## Create a new external pipeline

1. Open Pipeline Builder and select **Create new pipeline**.
2. After entering a name for your pipeline and the desired location, choose **Batch pipeline** > **External** in the configuration settings and select **Next**.
3. Search for and select your [supported external source](#supported-external-compute-engines-for-pipeline-builder) and import it into the pipeline.
4. Now you can add virtual tables from that source to the graph and create your pipeline as usual.
5. All pipeline outputs will be [virtual table outputs](/docs/foundry/pipeline-builder/outputs-add-virtual-table-output/) in the source.
6. When ready to build, save and deploy the pipeline. The pipeline will run using external compute and then output the result as a virtual table with storage in the source system.

:::callout{theme="neutral"}
All input and output tables must be configured from the same source you selected as part of the pipeline setup.
:::

![Screenshot of Pipeline configuration.](/docs/resources/foundry/building-pipelines/external-compute.png)

## Configuring build settings

You can edit your pipeline source and configure source-specific compute options in the build settings panel.

<img src="./media/external-compute-build-settings.png" alt="Screenshot of external build settings configuration" width="600"/>

## Known limitations

External pipelines do not currently support the same set of transforms and expressions as standard batch pipelines.

Due to the differences between external and batch pipelines, you should always verify results using **Preview** or by examining build outputs.

Currently unsupported features and expressions include:

* Incremental computation
* LLM features
* Media set operations
* Union
* User-defined functions
* Geospatial operations
