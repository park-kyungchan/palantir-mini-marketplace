---
sourceUrl: "https://www.palantir.com/docs/foundry/hyperauto/v1-getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/hyperauto/v1-getting-started/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "713d1d189b16e3fe7b34e23a05e570767bcb1d64bd04c232e94fd87b6e7aaef5"
product: "foundry"
docsArea: "hyperauto"
locale: "en"
upstreamTitle: "Documentation | HyperAuto V1 [Sunset] > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started with HyperAuto V1

:::callout{theme="warning" title="Sunset"}
HyperAuto V1 is in the [sunset](/docs/foundry/platform-overview/development-life-cycle/) phase of development and will be deprecated at a future date. Full support remains available. The creation of new V1 pipelines is discouraged, and users should migrate from HyperAuto V1 to V2 as detailed in the [migration documentation](/docs/foundry/hyperauto/v1-to-v2-differences/#migrating-existing-hyperauto-v1-pipelines-to-hyperauto-v2).
:::

:::callout{theme="neutral"}
This documentation is for HyperAuto V1. If you are using HyperAuto V2, refer to the [HyperAuto V2 getting started documentation](/docs/foundry/hyperauto/getting-started/).
:::

The following steps guide the creation of an SDDI instance:

1. Open SDDI Cockpit either from the [sidebar](/docs/foundry/getting-started/orientation-and-nav/#workspace-navigation-sidebar), or at `[foundryinstance URL]/workspace/sddi-app` and select **Create new instance**.

    <img src="./media/v1-sddi-initial-set-up.png" alt="Initial Set Up Create New Instance" width="400" />

2. Follow the on-screen instructions to select the appropriate source type.

3. Input your preferred repository name and select the desired repository location as well as the pipeline output folder location. For the pipeline output folder, HyperAuto provides a suggested location.

    <img src="./media/v1-sddi-initial-set-up-new-repo-for-non-sap-sources.png" alt="Initial set up of new repository for non-SAP sources" width="500" />

4. Configure a Data Connection Source on which you would like to apply HyperAuto. This source should have the same source type that you selected in Step 1. Identify a folder location for raw data and metadata respectively. These folders will subsequently house raw and metadata datasets that are synced from the source.

    <img src="./media/v1-sddi-initial-set-up-source-configuration-for-non-sap-sources.png" alt="Initial Set Up Source Configuration for Non-SAP Sources" width="500" />

5. Sync database metadata tables in the Sync Data step. This will sync the relevant metadata tables from your source system and add them to the designated automatic pipeline generator repository for pipeline generation in the background.

    <img src="./media/v1-sddi-metadata-ingestion.png" alt="Metadata ingestion" width="500" />

Your SDDI instance should now be functional and ready to clean tables from your source.
To learn more about configuring and executing your SDDI flow, navigate to [Cockpit](/docs/foundry/hyperauto/v1-cockpit/).
