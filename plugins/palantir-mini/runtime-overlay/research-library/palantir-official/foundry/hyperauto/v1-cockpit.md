---
sourceUrl: "https://www.palantir.com/docs/foundry/hyperauto/v1-cockpit/"
canonicalUrl: "https://palantir.com/docs/foundry/hyperauto/v1-cockpit/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "554d592879a477b5f2b1e9c7215ce4437ec1fcd471e5969bcccda7426a47e965"
product: "foundry"
docsArea: "hyperauto"
locale: "en"
upstreamTitle: "Documentation | HyperAuto V1 [Sunset] > Cockpit"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SDDI cockpit

:::callout{theme="warning" title="Sunset"}
HyperAuto V1 is in the [sunset](/docs/foundry/platform-overview/development-life-cycle/) phase of development and will be deprecated at a future date. Full support remains available. The creation of new V1 pipelines is discouraged, and users should migrate from HyperAuto V1 to V2 as detailed in the [migration documentation](/docs/foundry/hyperauto/v1-to-v2-differences/#migrating-existing-hyperauto-v1-pipelines-to-hyperauto-v2).
:::

**SDDI Cockpit** is the central place to configure and execute your SDDI flow, guiding you from sync creation and configuration to data pipeline generation and Ontology creation.

Cockpit's left-side panel lists out individual SDDI flow steps as well as the status of those steps. When clicking into each step, the right-side main section surfaces different actions that you can take for that particular SDDI flow step.

## Initial state

Before getting started, it is necessary to tie Cockpit to a functional SDDI instance.
To configure your first SDDI instance, see [Getting started](/docs/foundry/hyperauto/v1-getting-started/).

## Access an existing Cockpit

To view an already-configured SDDI instance, navigate to the **Source Overview** page of the attached source in Data Connection and select **Edit pipeline generator settings**.

![SDDI Source Overview Edit pipeline generator settings](/docs/resources/foundry/hyperauto/v1-sddi-source-exploration.png)

## Cockpit controls

Cockpit's left-side panel lists three stages:

1. [Sync Data](#sync-data)
2. [Pipeline Generation](#pipeline-generation)
3. [Ontology Changes](#ontology-changes)

### Sync data

During the sync data stage you can explore data from the source and create new syncs into Foundry. It also automates the configuration of metadata tables into Foundry that are needed for SDDI to function correctly. Finally, it allows you to trigger the ingestion of this data into Foundry.

![SDDI Cockpit Sync Data](/docs/resources/foundry/hyperauto/v1-sddi-cockpit-sync-data.png)

### Pipeline generation

The pipeline generation stage allows you to interact with the SDDI Automatic Pipeline Generator repository via point-and-click to generate and build data pipelines, as well as navigate to SDDI data lineage.

:::callout{theme="neutral" title="Note"}
Pipeline configuration is only available for non-SAP sources. For SAP sources, pipeline configurations are set within the SDDI Source Explorer for SAP.
:::

![SDDI Cockpit Pipeline Generation](/docs/resources/foundry/hyperauto/v1-sddi-cockpit-pipeline-generation.png)

### Ontology changes

During the Ontology changes step, you can preview Ontology changes that can be made in bulk based on the datasets that are being specified and processed in the [SDDI Automatic Pipeline Generator](/docs/foundry/hyperauto/v1-overview/#pipeline-generation) repository.

![Batch Ontology Generation](/docs/resources/foundry/hyperauto/v1-sddi-cockpit-batch-ontology-generation.png)

## Troubleshooting access

Access the Cockpit from the workspace navigation bar under **Software Defined Data Integration**.

Permissions are configurable through Control Panel's **Application access** page. If you do not have the permission to access SDDI Cockpit, contact either your Foundry Platform IT administrator or Palantir Support.
