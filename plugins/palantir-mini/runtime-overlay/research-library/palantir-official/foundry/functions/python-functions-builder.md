---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/python-functions-builder/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/python-functions-builder/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "75eb35ecb2926827256376594a0768f062073389ebf86b403c9cee3dbffbf341"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Python > Use Python functions in Pipeline Builder"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use a Python function in Pipeline Builder

:::callout{theme="neutral"}
Pipeline Builder supports both Java and Python user-defined functions (UDF). [Learn more about Java UDFs](/docs/foundry/transforms-java/user-defined-functions/).
:::

## Prerequisites

This guide assumes you have already authored and published a Python function. Review our [getting started with Python functions](/docs/foundry/functions/python-getting-started/) documentation for a tutorial.

## Architecture

Python functions run in a Pipeline Builder pipeline as a sidecar container. This means that the function does not need to be deployed and scales dynamically with the size of your pipeline. Embedded functions can be [previewed](/docs/foundry/pipeline-builder/outputs-preview-pipeline/) similarly to other transforms in Pipeline Builder.

## Use your function in a Pipeline Builder pipeline

Follow the steps below to prepare and configure a Python function in your pipeline:

1. Open the Pipeline Builder pipeline in which you want to use your Python function.

<img alt="A Python function in Pipeline Builder." src="./media/python-functions-builder.png" width="800px">

2. Import your UDF into Pipeline Builder using one of two methods:
   * **From the graph view:**
     1. Select **Reusables** from the upper part of the pipeline graph, then choose **User-defined functions**. <br><br>
        <img alt="The 'Reusables' button in Pipeline Builder." src="./media/python-functions-builder-reusable.png" width="500px">
     <br><br>
     2\. Select **Import UDF** and search through the available functions to find the one you want to use
     3\. Choose **Add** next to the function name. The function should then display an **Imported** tag.<br><br> <img alt="Add Python function to Pipeline Builder." src="./media/python-functions-add-builder.png" width="700px"> <br><br>
     4\. Close the import dialogue and select **Transform** on your Pipeline Builder graph where you would like to use the function.
     5\. From the list of transforms, find the **UDFs** tab to the left to view your imported functions.
   * **Use the transform picker:**
     1. Select **Transform** on the pipeline builder graph.
     2. Enter the name of the UDF you want to import. <br><br>
        <img alt="Search unimported UDFs in Pipeline Builder." src="./media/python-functions-builder-search-udfs.png" width="500px">
     <br><br>
     3\. Select **Search unimported UDFs**.
     4\. Hover over the desired UDF and select **Import**. <br><br> <img alt="Import UDFs in Pipeline Builder." src="./media/python-functions-builder-import-udfs.png" width="500px"> <br><br>
3. Fill out the transform definition specifying the input columns and parameters, then select **Apply**.

<img alt="Configured Python function transform in Pipeline Builder." src="./media/python-functions-builder-transform.png" width="700px">

You should now see your Python function on your Pipeline Builder graph and can preview the output of the function.

<img alt="Python function in Pipeline Builder" src="./media/python-functions-builder-ete.png" width="900px">

## External API calls in Pipeline Builder

To make API calls to an external system from Pipeline Builder, you can publish a [Python function with access to external systems](/docs/foundry/functions/api-calls/). This will allow you to write logic that communicates with external systems and use it as part of your pipeline.

To be used as a user-defined function (UDF) in Pipeline Builder, all sources used in your function must be configured to be importable into pipelines. To configure this setting, navigate to the source in Data Connection, then to the **Connection settings > Code import configuration** tab:

![Allow source to be imported to pipelines.](/docs/resources/foundry/functions/allow-source-to-be-imported-to-pipelines.png)

Once you have enabled this option on your source and published your Python function, it can be used in your pipeline in the same way as any other Python function.
