---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/sap-erp/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/sap-erp/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3e2f55f3059920ff634df6a6e770510e2e081c6affacf7514dc4b183cffeba8d"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > SAP ERP"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SAP ERP

The SAP ERP connector allows you to connect Foundry to SAP's on-premise ERP Central Component (ECC) and S/4 HANA (on-premise and [Cloud Private Edition ↗](https://www.sap.com/products/erp/s4hana-private-edition.html)). The SAP ERP connector enables Foundry to interact with various types of SAP data, including:

* SAP Application Tables
* SAP ERP Extractors
* SAP Functions/BAPIs
* SAP Data Model
* SAP CDS Views
* SAP HANA Information Views
* SAP Transaction Codes

:::callout{theme="warning"}
Using the SAP ERP source requires the installation of the [Palantir Foundry Connector 2.0 for SAP Applications add-on](/docs/foundry/sap/overview/) on the target SAP Application layer.
:::

## Supported capabilities

| Capability | Status |
|------------|--------|
| Exploration | 🟢 Generally available |
| Batch syncs | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| Media sets | 🟡 Beta |
| Webhooks | 🟢 Generally available |
| [Use in code repositories](/docs/foundry/data-connection/external-transforms/) | 🟢 Generally available |

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **SAP ERP** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Authentication

The SAP ERP connector supports the following authentication methods:

| Authentication Method | Description |
|----------------------|-------------|
| **Basic Auth** | Provide the username and password of the technical user created when installing the [Connector](/docs/foundry/sap/install-sap-connector/). |
| **Authentication token** | Provide a token to authenticate. |
| **Custom authentication header** | Provide a custom authentication header. |
| **No authentication** | An option used if authentication is set up on the agent machine via certificates. |

## Networking and connectivity

Make sure to properly configure egress policies (if using a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker)) or your agent networking (if using an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker)) to make sure your SAP system can communicate with Foundry.

Many SAP systems use custom-signed certificates which can cause SSL handshake exceptions when configuring the connection for the first time. Make sure you have the correct custom certificates from your system and [add them to the source](/docs/foundry/data-connection/set-up-source/#optional-add-certificates) (if using a Foundry worker) or [to the agent directly](/docs/foundry/data-connection/agent-worker/#certificates) (if using an agent worker).

## Sync data from SAP ERP

Use the [exploration view](/docs/foundry/data-connection/source-exploration/) to create syncs for SAP Tables. Additional configuration options are available when editing a sync.

### Example: Source exploration

When you select **Subfolder or media file**, you have two options for choosing what files to ingest: you can either select a specific Document Type (like CPD) to ingest all associated documents, or select a single document to ingest only that specific file.

![Example of source exploration for media sets](/docs/resources/foundry/available-connectors/explore-media-files.png)

For other types of SAP resources, from the source overview page, select **+ New** next to batch sync, then pick your desired object type from the dropdown.

## Media sets

The SAP ERP connector supports [media sets](/docs/foundry/data-integration/media-sets/) for ingesting media files and documents stored in SAP's Document Management System (DMS).

To create a new media ingest:

1. Navigate to the source overview page.
2. Select **+ New** next to **Media set syncs**.
3. Define your media set format. Providing a specific format will enable you to use transformation steps specific to that format in downstream data transformation. Read more about [media set formats](/docs/foundry/media-sets-advanced-formats/media-overview/#supported-media-set-schemas).
4. Use the source exploration tool, which organizes files per document types, to select the files you want to ingest, or define your own filters directly in the **Filters** section.

### Example: Select a Document Type

SAP Media Document Types are designated by an acronym and a plain English description of their purpose. When filtering by Document Type, you can leverage the acronym representation to properly narrow the scope of the media ingest.

![Example of a Document Type filter](/docs/resources/foundry/available-connectors/document-type-filter.png)

The examples are based on a sample SAP ERP table that might represent customer or material data.
