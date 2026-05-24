---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/management-charts/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/management-charts/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e5c5399bca9153df736ba7d6535b2dd320eb3767a2993198d37b2a8ec2d54497"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Pipeline management > Charts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Charts in Pipeline Builder

You can use charts in Pipeline Builder to seamlessly analyze and validate intermediate data without leaving your workspace. Charts can be added from any [transform node](/docs/foundry/pipeline-builder/transforms-transform-data/). Bar charts, including histograms are currently supported.

## Add a chart

1. To add a chart to your graph, navigate to any transform node and select the **Edit** option below the node. Charts can be added by searching for "chart" in the transforms search bar, or by selecting the **Visualize** option to the right of the search bar, highlighted in red below. <br><br>
   ![The transforms search bar, as well as the "Visualize" icon to the right.](/docs/resources/foundry/pipeline-builder/chart-search.png) <br><br>

2. In the **Configure** panel, choose the **X-Axis** and **Y-Axis** values. You can choose various aggregations for the **Y-Axis** values, including distinct count, max, min, median, mode, row count, sum, and more. <br><br> <img src="./media/chart-example.png" alt="An example of a chart configuration." width="500"> <br><br>

   You can also add multiple aggregations to a single graph by selecting **Add item** at the bottom of the **Configure** panel. <br><br> <img src="./media/chart-aggregation.png" alt="A sample chart configuration with multiple aggregations." width="500"> <br><br>

3. In the **Format** panel, you can change the chart's title and the **X-Axis** and **Y-Axis** labels. <br><br> <img src="./media/chart-format.png" alt="The Format tab in the chart configuration panel." width="500"> <br><br>

4. Select **Apply** when you are done.

You can collapse and expand the color legend using the **Legend** option in the lower left corner of the chart board. You can also page through results using arrows, or select a range of results from the **Show results** dropdown in the lower right side of the chart.

To view previously created charts, select a transform node and open the **Transformations** tab below the pipeline graph, or search for "chart" in the pipeline search to view nodes with associated charts.
