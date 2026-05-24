---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/transforms-split/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/transforms-split/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b153b22790df3c8b4fcfea96472d7dac05b7d183a5d6376c3d92881dd0e808c7"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Transforms > Split transform"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Split transform

The Split transform is used to partition input data into two distinct outputs based on a specified condition. This transform evaluates each row of the input data against the defined condition and directs the rows to one of the two outputs accordingly.

![An example Pipeline Builder graph with the Split transform](/docs/resources/foundry/pipeline-builder/split-transform-pipeline.png)

To use the Split transform, select any dataset node in your graph and select **Split**.

![Screenshot of the Split transform in Pipeline Builder](/docs/resources/foundry/pipeline-builder/split-transform-node.png)

### Condition

The Split transform allows you to define a condition that determines how the input data is divided. This condition is a logical expression that evaluates to either **True** or **False**.

### Outputs

The **True** output will contain rows for which the condition evaluates to true. These rows are directed to the first output.

The **False** output will contain rows for which the condition evaluates to false. These rows are directed to the second output.

To preview the outputs, you can use the dropdown in the top left of the bottom panel. Select **True** to see the True output or **False** to see the False output.

![Screenshot of an example Split transform preview table](/docs/resources/foundry/pipeline-builder/split-transform-output-select.png)

To use the outputs in downstream transforms, select the transform, and then select either the **True** or **False** output to use as your next input.

![Screenshot of the Select input Split transform window](/docs/resources/foundry/pipeline-builder/split-transform-true-false.png)

### Example

Consider a dataset of customer orders. You want to separate orders into two categories: high-value and low-value orders, based on a threshold value.

In this case, the **Condition** will be `order_value > 1000`.

The **True** output will contain orders where `order_value` exceeds `1000`, and the
**False** output will contain orders where `order_value` does not exceed `1000`.

![Screenshot of an example Split transform configuration](/docs/resources/foundry/pipeline-builder/split-transform-example.png)
