---
sourceUrl: "https://www.palantir.com/docs/foundry/hyperauto/architecture/"
canonicalUrl: "https://palantir.com/docs/foundry/hyperauto/architecture/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "be9d1eef2528218d1f6463cda71aafcefdca835f85bdb6c5146778ec0b676c96"
product: "foundry"
docsArea: "hyperauto"
locale: "en"
upstreamTitle: "Documentation | HyperAuto (SDDI) > Architecture"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# HyperAuto V2 architecture

:::callout{theme="neutral"}
This page describes the architecture of HyperAuto V2.
For a description of HyperAuto V1's architecture, visit [HyperAuto V1 overview](/docs/foundry/hyperauto/v1-overview/#architecture).
:::

HyperAuto V2 provides orchestration and automation around three main components of the data integration workflow - [Data Syncs](/docs/foundry/data-connection/core-concepts/#syncs), [Builder Pipelines](/docs/foundry/pipeline-builder/overview/), and [Ontology](/docs/foundry/ontology/overview/) - in order to automatically generate ready-to-use outputs from supported sources.

HyperAuto leverages the metadata of a data source, querying the source in real-time to derive opinions on how syncs should be built, what transformation logic should be applied, and how an appropriate Ontology can be designed.

A HyperAuto pipeline refers to all resources managed by a single HyperAuto instance, from syncs to objects. Each pipeline takes a user-provided list of source tables as an input, syncs them to Foundry (if required) and transforms them into valuable, ready-to-use output datasets and (optionally) [Ontology Objects](/docs/foundry/ontology/overview/). Users may make multiple HyperAuto pipelines per source to fit their individual needs.

![Graph of HyperAuto V2's architecture](/docs/resources/foundry/hyperauto/hyperauto-v2-architecture-graph.png)

## Data syncs

:::callout{theme="neutral"}
HyperAuto also supports the use of static files when no direct connection to the source exists, in which case this section does not apply. See the [folder-based SAP documentation](/docs/foundry/hyperauto/folder-based-sap/) to learn more.
:::

HyperAuto provides access to the entire set of visible tables on the source. If a user selects a source table that is not mapped to an existing data sync, a new data sync will be automatically generated.

If one or multiple data syncs already exist for the selected source table, the latest sync will be selected by default. You can change that selection on the **Input Configuration** page by hovering over the **Configure input table** button. From there, either select a different existing sync to use or choose to create a new sync.

:::callout{theme="neutral"}
Depending on data scale, generation may take significantly longer if HyperAuto has created new data syncs. This is because data syncs require an initial run before the rest of the HyperAuto process, such as builder pipeline generation, can take place.
:::

![HyperAuto Input Configuration Map Existing Syncs](/docs/resources/foundry/hyperauto/hyperauto-v2-map-existing-syncs.png)

## Data transformation (Pipeline Builder)

Data transformation within HyperAuto pipelines allows hard-to-use source data to be converted into cleaned, enriched outputs that can be immediately used for analysis and application building.

HyperAuto pipelines are powered by automatically generated [builder pipelines](/docs/foundry/pipeline-builder/overview/) - the primary method of data transformation within Foundry.

HyperAuto dynamically generates opinionated transformation logic based on the source type and the user's preferences. Users can view this builder pipeline by selecting **View pipeline** from the HyperAuto Pipeline Overview page. Edits to this pipeline are performed by changing the HyperAuto configuration through a [proposal](/docs/foundry/hyperauto/proposals/).

The types of transform functionality available within HyperAuto are as follows:

* **Cleaning:** Source systems often export data with common "cleanliness" issues, such as incorrect data types, poor handling of null / empty values or unwanted whitespace in string values. HyperAuto provides opinionated transformation options to fix these issues (and more).
* **Renaming:** By using the source's metadata, HyperAuto can rename the output tables and columns to be descriptive and self-explanatory, rather than sticking with an often non-human-readable schema.
* **Joining:** Source systems often store related information (such as metadata) in separate tables, for example when conforming to the "normal" data model. HyperAuto uses its understanding of the source's data model to join these tables together, providing a de-normalized, rich set of output datasets that allow for ease of analysis and a strong foundation for an Ontology.
* **Filtering:** Unwanted rows (such as duplicates) can be filtered out automatically by HyperAuto, for example to de-duplicate change-data-capture inputs.

Both **batch** and real-time **streaming** pipeline modes are supported, see [configuration options](/docs/foundry/hyperauto/configuration-options/#pipeline-modes) for more detail.

![Generated Pipeline Builder graph](/docs/resources/foundry/hyperauto/hyperauto-v2-builder-pipeline.png)

## Ontology

HyperAuto can use the source's data model to dynamically generate an [Ontology](/docs/foundry/ontology/overview/) based on the generated output datasets, including defining the semantic links between the objects.

Enabling this setting allows you to go from a new (supported) source to a fully-defined Ontology in a matter of minutes, with no manual intervention required.

If you are interested in this feature, contact your Palantir representative.

## Resource management

HyperAuto pipelines are designed to fully control any resources they create, allowing the user to consistently receive benefits and upgrades to their system, including performance upgrades and bug fixes. The design of these pipelines also makes it easy to tweak already-generated resources, such as adding a new transform step or input to the pipeline.

Any edits to the underlying resources (for example, syncs or builder pipelines) must be managed via the HyperAuto application to avoid change conflicts.

If needed, deleting the HyperAuto pipeline resource will remove its ownership over the corresponding builder pipeline, allowing direct edits to the builder pipeline as normal.
