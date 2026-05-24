---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/outputs-add-media-set-output/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/outputs-add-media-set-output/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "464289212001d9eb2b3aa279adf1f1504df68db9aa4aac9c641b4062051e9aac"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Pipeline outputs > Add a media set output"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add a media set output

When working with media sets in Pipeline Builder, you can create a *media set output* as the result of your pipeline. Media set outputs enable your pipelines to provide clean, transformed media data (such as images or audio) for use across the platform.

Learn more about [media sets and unstructured data](/docs/foundry/data-integration/media-sets/) in Foundry.

## Create a media set output

To create a media set output, first [generate a new media set](#generate-a-new-media-set) and then [configure](#configure-the-media-set) it in the proper format before deploying your pipeline and [building the output](#build-a-media-set-output).

### Generate a new media set

First, select **Add** next to the **Media set** type in the **Pipeline outputs** panel to the right of the graph.

<img src="./media/outputs-add-output-with-media-set@2x.png" alt="The list of output types in Pipeline Builder." width="600">

Alternatively, you can choose a transform node that produces media and select **Add output**.

<img src="./media/outputs-media-set-node-select-output@2x.png" alt="The 'Add output' option on a selected node." width="600">

Then, select **New media set**.

<img src="./media/outputs-media-set-node-select-media-set@2x.png" alt="The 'New media set' option on a selected node." width="600">

### Configure the media set

There are several parameters required to configure the output media set. You can rename your output media set using the name field.

<img src="./media/outputs-media-set-configure@2x.png" alt="The media set output configuration in its initial state." width="600">

Select the **Media type** for your media set. This should match the output type of the media after any transformations you have applied.

<img src="./media/outputs-media-set-configure-type@2x.png" alt="Configuring the media set media type." width="600">

Select the **Format**. This should match the specific file format of the media after any transformations you have applied.

<img src="./media/outputs-media-set-configure-completed@2x.png" alt="A completed media set configuration." width="600">

Now you have successfully configured a new output media set. The configuration can be changed until the pipeline gets deployed. After the pipeline is deployed, your media set output will be created in the same folder as your pipeline.

:::callout{theme="neutral"}
Output media sets are transactional only. Learn more about [transactional and transactionless media sets](/docs/foundry/media-sets-advanced-formats/media-set-settings/#transaction-policies).
:::

## Build a media set output

After adding your media set output to your pipeline, be sure to save your changes. If you have finished transforming your media and defining your pipeline workflow, you are ready to deploy your pipeline and build your new media set output.

Learn how to [deploy your pipeline](/docs/foundry/pipeline-builder/outputs-deliver-pipeline/).
