---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/transforms-transform-media/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/transforms-transform-media/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0f04a548a1aae572d38a0b4ccc5b54c64d98de3b4cdfdd2a5e5de1b604a13e2c"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Transforms > Transform media"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transform media

In addition to [transforming tabular structured data](/docs/foundry/pipeline-builder/transforms-transform-data/), Pipeline Builder allows you to transform unstructured data, represented in the Palantir platform as media sets.

Transforming media generally means one of two things: either *manipulating* media or *extracting information* from media. A transform that manipulates media will take a media input and produce a media output. An expression that extracts information from media will take a media input and produce a tabular output.

You can start transforming your unstructured data in Pipeline Builder after [adding data from Foundry](/docs/foundry/pipeline-builder/datasets-add/#add-data-from-foundry-to-pipeline-builder) in the form of a [media set](/docs/foundry/data-integration/media-sets/) to your workspace.

:::callout{theme="neutral"}
Media set inputs do not need to be converted to tables. When a media set input is added to a pipeline, it can be read as a media set or tabular input, meaning you can apply media transformations or tabular expressions without needing to convert it.
:::

## Select a media set

To apply a transform to a media set, choose a media set node in your workspace and select **Transform**.

![The operation selection menu on a media set node.](/docs/resources/foundry/pipeline-builder/transforms-media-data@2x.png)

## Search for a transform

In the transform page, search for a transform type by name or browse from a list of available transforms. You can also select the **Media** category on the left-hand side to browse only available media transforms.

The example below shows how to take a media set input containing PDF documents and trim down, or "slice", the documents to a subset of their pages. You can do this by searching for and selecting the **Slice PDF** transform.

![Searching 'slice' in the transforms search page.](/docs/resources/foundry/pipeline-builder/transforms-media-search-slice@2x.png)

Slicing PDF documents is an example of transforming media by *manipulating* it. However, you may wish to *extract information* from your documents instead.

The example below begins with the same media set input containing PDF documents; if you want to extract the text from the documents, you can search for and then select the **PDF text extraction** transform.

![Searching 'pdf' in the transforms search page.](/docs/resources/foundry/pipeline-builder/transforms-media-search-pdf@2x.png)

## Configure a transform

Many transforms will prompt you to provide parameters to configure how the transform should run. Complete these parameters as appropriate for your workflow.

The example below shows how to configure the **Slice PDF** transform in order to slice the documents to pages 2 through 5.

![The transforms configuration page for slicing PDFs.](/docs/resources/foundry/pipeline-builder/transforms-media-configure-slice-pdf@2x.png)

Below is an example of how to use the **PDF text extraction** transform to extract text for an entire document. In configuration, select **Raw text** because the text is embedded in the documents, but **OCR** is available if that were not the case.

For **Media reference**, select the `media_reference` column from the dropdown. For **Start page** and **End page**, leave the default values at `1` and *empty* respectively in order to extract text for all pages.

![The transforms configuration page for PDF text extraction.](/docs/resources/foundry/pipeline-builder/transforms-media-configure-extract-text@2x.png)

## Apply a transform

After configuring the transform board, select **Apply** to add the transform to your pipeline. The example below shows the addition of two different transform paths with the transforms used above, renamed to `Slice PDF` and `PDF text extraction` respectively.

![A graph, displaying a media set and two new media set transforms.](/docs/resources/foundry/pipeline-builder/transforms-media-complete@2x.png)

From here, you can add an output or add subsequent downstream transforms.

Learn more about [adding pipeline outputs](/docs/foundry/pipeline-builder/outputs-overview/).

:::callout{theme="warning"}
It is not currently possible to extract information from media that has been transformed, or to transform media that is referenced in a dataset. <br><br>
It is also not possible to transform media in changelog mode when using a media set input that contains deleted items.
:::
