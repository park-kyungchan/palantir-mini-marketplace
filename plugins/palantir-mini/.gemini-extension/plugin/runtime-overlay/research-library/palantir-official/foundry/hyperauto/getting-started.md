---
sourceUrl: "https://www.palantir.com/docs/foundry/hyperauto/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/hyperauto/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4f2004eb8ad67a32fa9132e78b14d03fdfda5bd7998a9d5155d7c607fb69e84c"
product: "foundry"
docsArea: "hyperauto"
locale: "en"
upstreamTitle: "Documentation | HyperAuto (SDDI) > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started with HyperAuto V2

:::callout{theme="neutral"}
This guide is for HyperAuto V2. To get started with HyperAuto V1, see the [HyperAuto V1 documentation](/docs/foundry/hyperauto/v1-getting-started/).
:::

:::callout{theme="neutral"}
If you do not have a direct connection to a system and are working with static data, you can create a [folder-based pipeline](/docs/foundry/hyperauto/folder-based-sap/).
:::

Create your first HyperAuto pipeline by following these steps:

1. Navigate to the [supported source](/docs/foundry/hyperauto/supported-sources/) you would like to sync data from. You can find a list of all sources on your Foundry instance in the [Data Connection](/docs/foundry/data-connection/overview/) app.

    <img src="./media/data-connection-sap-sources.png" alt="Source List" width="750">

2. From the source's specific overview tab, select **Create HyperAuto pipeline** to open the HyperAuto pipeline wizard.

    <img src="./media/source-overview-pipelines-card.png" alt="Create HyperAuto pipeline button on source overview page" width="750">

3. Define the name and location of the new HyperAuto Pipeline resource and any corresponding generated resources. Note that the HyperAuto pipeline must live in the same project as the input datasets.

    <img src="./media/hyperauto-v2-wizard-1-name-and-location.png" alt="Name and location tab" width="750">

4. Select the source sub-system if appropriate (for example, the "context" for SAP sources), along with the ingestion method (either batch or streaming, see [architecture](/docs/foundry/hyperauto/architecture/) for more info).

    <img src="./media/hyperauto-v2-wizard-2-source-config.png" alt="Source config screen in the wizard" width="750">

5. In the **Input Configuration** step, choose the source tables from which you would like to process data. You can select tables individually, by category ("module"), or by workflow. You can also select tables without Data Connection syncs as inputs. If a chosen input has existing syncs, HyperAuto will default to using the most recent one. To reconfigure a selected input, hover over the **Configure input** table button. From this menu, you can either choose an alternative existing sync or create a new sync.

    <img src="./media/hyperauto-v2-wizard-3-add-add-to-cart.png" alt="Input configuration" width="750">

6. Decide the desired pipeline configuration, including the language and transformation options. For more info, see [configuration options](/docs/foundry/hyperauto/configuration-options/).

    <img src="./media/hyperauto-v2-wizard-4-pipeline-config.png" alt="Pipeline configuration" width="750">

7. Select **Create HyperAuto pipeline**. Your new HyperAuto pipeline will be created and begin processing data. You will be redirected to the pipeline's overview page where you can monitor the generation progress.

    <img src="./media/hyperauto-v2-overview-creating-resources.png" alt="Generating" width="750">

8. Once generation has succeeded, you can use the overview page to manage and monitor the pipeline and its related resources, including input syncs and datasets, and output datasets and objects.

   * Select **View builder pipeline** to open the read-only builder pipeline and view the transformation logic in more detail.

    <img src="./media/hyperauto-v2-builder-pipeline.png" alt="HyperAuto generated builder pipeline" width="750">

   * The **Configuration** tab displays the input and pipeline configuration for the HyperAuto pipeline. Select **Edit** in this tab to make a new [proposal](/docs/foundry/hyperauto/proposals/) and update the configuration.

       <img src="./media/hyperauto-v2-overview-pipeline-config.png" alt="HyperAuto pipeline" width="750">
