---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-java/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-java/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a9fe663704ff922f78b300e51bdc8616ba77bf44a105063de7bf0438cea6c0e1"
product: "foundry"
docsArea: "transforms-java"
locale: "en"
upstreamTitle: "Documentation | Java > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

:::callout{theme="success" title="Tip"}
The instructions below step through a simple Java data transformation. If you are just getting started with data transformation, consider going through the batch pipeline tutorial for [Pipeline Builder](/docs/foundry/building-pipelines/create-batch-pipeline-pb/) or [Code Repositories](/docs/foundry/building-pipelines/create-batch-pipeline-cr/) first.
:::

Follow the steps here to get started writing your first Java transformation:

1. Create a new Transforms Java repository. Navigate to a Project, select **+ New** > **Repository**, and select **Java** under **Language template**.

2. Download this sample dataset: [`Download titanic.zip`](/docs/resources/foundry/transforms-java/titanic.zip). Import this dataset into Foundry.

3. Navigate to your repository. Your data transformation code goes in `myproject/datasets/HighLevelAutoTransform.java`. The sample code in this file is commented out, so make sure to un-comment it before moving on.

4. Update the input dataset by replacing `/path/to/input/dataset` with the full path to your `titanic` dataset.

5. Update the output dataset by replacing `/path/to/output/dataset` with the full path to your desired output dataset location.

6. Let’s modify the default transformation code to filter the `titanic` dataset based on gender to get all female passengers. Update your data transformation code in `my_compute_function`:

   ```java
   @Compute
   // Replace this with the full path to your output dataset.
   @Output("/path/to/output/dataset")
   // Replace this with the full path to your "titanic" dataset.
   public Dataset<Row> myComputeFunction(@Input("/path/to/input/dataset") Dataset<Row> myInput) {
       return myInput.filter(myInput.col("Sex").equalTo("female"));
   }
   ```

7. After you successfully commit your changes to your branch, you can open and build your output dataset!

This example defines a high-level Transform that uses automatic registration. For more information about the different types of data transformations supported in Transforms Java as well as an explanation of the template project structure and included files, refer to [this documentation](/docs/foundry/transforms-java/transforms-pipelines/).
