---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/outputs-add-virtual-table-output/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/outputs-add-virtual-table-output/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "55a462e28ddc2a9116ad538aa9f81674597d4eac36de9884f546c315107cfc01"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Pipeline outputs > Add a virtual table output"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add a virtual table output

You can choose to add a virtual table output in Pipeline Builder to guide your pipeline integration towards clean, transformed data that is stored outside of Foundry. Learn more about [different output types](/docs/foundry/pipeline-builder/outputs-overview/).

## Create a virtual table output

First, select **Add** next to the virtual table type in the outputs panel to the right of the graph.

<img src="./media/outputs-output-types.png" alt="Output types" width="600">

Next, select the source to which you would like to write your new table. Sources that have already been used in your pipeline (for example, any input virtual table's associated sources) will show up under **Sources in this pipeline** for ease of use. You will only be able to select source types [currently supported by virtual tables](/docs/foundry/data-integration/virtual-tables/#supported-sources). Sources must also have exports enabled in the [export configuration settings in Data Connection](/docs/foundry/data-connection/export-overview/).

![Screenshot of setting virtual table external location](/docs/resources/foundry/pipeline-builder/virtual-table-output-location.png)

Configure the external location. Follow the [source documentation](/docs/foundry/data-integration/source-type-overview/) and any requirements listed there for configuring where virtual tables will be stored in the source type you have chosen.

From here, you can [follow the same steps as adding a dataset output](/docs/foundry/pipeline-builder/outputs-add-dataset-output/), though please note that configuring [write modes](/docs/foundry/pipeline-builder/outputs-add-dataset-output/#configure-write-mode) and [write formats](/docs/foundry/pipeline-builder/outputs-add-dataset-output/#dataset-write-format) are not supported for virtual tables.
