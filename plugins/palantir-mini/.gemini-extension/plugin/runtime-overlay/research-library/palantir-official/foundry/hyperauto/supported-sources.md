---
sourceUrl: "https://www.palantir.com/docs/foundry/hyperauto/supported-sources/"
canonicalUrl: "https://palantir.com/docs/foundry/hyperauto/supported-sources/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ad76fbc705378b1c8f07ff5ba67347d3afe2b83a11f28447ab027171aaa04a8e"
product: "foundry"
docsArea: "hyperauto"
locale: "en"
upstreamTitle: "Documentation | HyperAuto (SDDI) > Supported sources"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Supported sources for HyperAuto V2

This page describes the [Data Connection](/docs/foundry/data-connection/overview/) source types supported by HyperAuto V2.

## SAP

### Source connection

HyperAuto V2 supports data coming from a [Foundry SAP source](/docs/foundry/sap/sap-source-setup/).
Both SAP ECC and S/4HANA are supported, with or without a corresponding SLT Replication Server (streaming requires SLT). The following minimum requirements must be met for the source to be supported:

* SAP Managed Source (`magritte-sap-source`) Version: **1.25.0**
* [Palantir Foundry Connector for SAP](/docs/foundry/sap/install-sap-connector/) Version: **SP26 (2.26.0)**

For more information on how to set up SAP with Foundry, review the [Add-on for SAP installation guide](/docs/foundry/sap/install-sap/).

### Folder-based data

HyperAuto V2 also works from a static cut of SAP data, without a direct connection. In that case, you will need to upload the following data dictionary tables as datasets:

* DD02L (SAP Tables)
* DD02T (SAP DD: SAP Table Texts)
* DD03L (Table Fields)
* DD04T (R-3 DD: Data element texts)
* DD05S (Foreign key fields)
* DD08L (R-3 DD: relationship definitions)

All the subsequent tables to be processed with HyperAuto will need to be uploaded as Foundry datasets in a single folder.

For more information on how HyperAuto works with static data, review the [folder-based SAP pipeline documentation](/docs/foundry/hyperauto/folder-based-sap/).
