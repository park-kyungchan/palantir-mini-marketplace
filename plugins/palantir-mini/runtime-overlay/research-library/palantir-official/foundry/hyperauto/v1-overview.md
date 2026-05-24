---
sourceUrl: "https://www.palantir.com/docs/foundry/hyperauto/v1-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/hyperauto/v1-overview/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "25b79add90743ec9bd8a76590f14c38165a56db825180b503d23ac60f1253dbc"
product: "foundry"
docsArea: "hyperauto"
locale: "en"
upstreamTitle: "Documentation | HyperAuto V1 [Sunset] > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# HyperAuto V1 \[Sunset]

:::callout{theme="warning" title="Sunset"}
HyperAuto V1 is in the [sunset](/docs/foundry/platform-overview/development-life-cycle/) phase of development and will be deprecated at a future date. Full support remains available. The creation of new V1 pipelines is discouraged, and users should migrate from HyperAuto V1 to V2 as detailed in the [migration documentation](/docs/foundry/hyperauto/v1-to-v2-differences/#migrating-existing-hyperauto-v1-pipelines-to-hyperauto-v2).
:::

HyperAuto V1 (also known as SDDI or Bellhop), is the first version of Palantir's source-to-value automation suite. [HyperAuto V2](/docs/foundry/hyperauto/overview/) has been released for SAP and is strongly recommended for that data source, but HyperAuto V1 is still currently supported for several source types, including:

* Salesforce
* Oracle NetSuite
* SAP (V1 not recommended; use [V2](/docs/foundry/hyperauto/overview/) instead)

Detailed documentation for HyperAuto V1 is available in-platform. From there, view **Software-Defined Data Integration** to see the range of configuration options.

## Architecture

HyperAuto V1 consists of three components designed to integrate data from raw sources to ontology with minimal effort:

1. **Connectors** enable transfer of large-scale data in a secure and optimized way from and to source systems.
2. **Source exploration** allows rapid data discovery in a guided manner, and a "shopping cart" experience for rapid bulk data sync creation and configuration.
3. **Automatic pipeline generation** transforms raw data into curated Foundry datasets and object types in the [Ontology](/docs/foundry/ontology/overview/) using automatically generated data pipelines.

![Architecture Diagram](/docs/resources/foundry/hyperauto/v1-sddi-overall-architecture.png)

## Pipeline generation

**Automatic pipeline generation** creates out-of-the-box data pipelines for integrating common source systems. The pipelines prepare the data so that it can be used by ontologies and workflows. Because pipeline generation ships with embedded knowledge about each source system, using this feature increases efficiency and removes the need to fully understand the intricacies of each underlying source system.

![Pipeline Generator Architecture Diagram](/docs/resources/foundry/hyperauto/v1-sddi-pipeline-generator-architecture.png)

Generated pipelines include four major steps:

* *Source-specific preprocessing* generates a set of metadata datasets with a pre-defined schema. These metadata contain the necessary information to understand data from the source system.
* *Cleaning libraries* apply standardized data cleaning steps to all datasets, ensuring that best practices are followed for every piece of data flowing into the system.
* *Core generation* performs data enrichment, column renaming, de-duplication, and data unioning to produce usable data that can be used for analysis, reporting, and workflows in the Ontology.
* *Derived elements* provide pre-defined support for advanced workflows, including generating join tables, time series datasets, and enriched columns that provide rich derived information that also feeds into the Ontology.

![Pipeline Data Lineage Diagram](/docs/resources/foundry/hyperauto/v1-sddi-pipeline-generator-data-lineage.png)

## Ontology creation

After pipelines are automatically generated, HyperAuto V1 additionally supports generating an [Ontology](/docs/foundry/ontology/overview/) automatically. This completes the data integration process, allowing you to immediately begin searching for, analyzing, and even building applications on top of data thanks to the broad set of [Ontology-aware applications](/docs/foundry/ontology/applications/) in Foundry.

![Batch Ontology Generation](/docs/resources/foundry/hyperauto/v1-sddi-cockpit-batch-ontology-generation.png)
