---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-common/local-preview/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-common/local-preview/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a4dab7de354210b9cf3f15610d047d64d5c3ef0d89d8be410fde7e17dc097532"
product: "foundry"
docsArea: "transforms-common"
locale: "en"
upstreamTitle: "Documentation | Common > Local preview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Preview transforms in local development

There are two main ways to preview transforms in local development with VS Code:

* [Preview transforms with the Palantir extension for Visual Studio Code for Python](#preview-with-the-palantir-extension-for-visual-studio-code-python-only)
* [Preview transforms with Gradle-based local preview for Java](#gradle-based-local-preview-for-java)

## Preview with the Palantir extension for Visual Studio Code (Python only)

The Palantir extension for Visual Studio Code supports local preview functionality. Refer to the [extension documentation](/docs/foundry/palantir-extension-for-visual-studio-code/overview/) for installation instructions. Once the extension has been installed and the environment is ready for preview, your transforms should be automatically discovered in the **Preview** tab as shown below.

![Preview functionality for a Python transforms repository in the extension for Visual Studio Code.](/docs/resources/foundry/transforms-common/vscode-transforms-preview.png)

You can also run local preview for Python transforms. When running preview locally, parts of the datasets are streamed to your machine. For more information, review the [documentation for transforms preview](/docs/foundry/palantir-extension-for-visual-studio-code/transforms-preview/).

## Gradle-based local preview for Java

This section details the steps required to preview Python and Java transforms in local development. For additional context, review our documentation for [Java local development](/docs/foundry/transforms-java/local-development/). You can also learn more about [how to preview transforms](/docs/foundry/code-repositories/preview-transforms/). Gradle-based local preview executes the preview remotely, inside of Foundry.

### Prerequisites and limitations

Local preview support requires that the local branch must be tracking a remote branch such that the local branch needs to be pushed at least once, on top of existing prerequisites for local development. Note the following additional limitations:

* The preview URI can only be accessed by the user who ran the preview and is available on a temporary basis.

### Run dataset preview

Before running the preview, you must set up the environment for local development and ensure that your repository is [upgraded to the latest template version](/docs/foundry/code-repositories/repository-upgrades/#manual-branch-upgrade).

1. Run `./gradlew displayTransformsList` which will return a list of all available transforms.
   ![Use datasetPreview task to list all available transforms](/docs/resources/foundry/transforms-common/display-transforms-list.png)

2. Run `./gradlew datasetPreview --transformId=<transformId>` with `<transformId>` replaced by one of the transform ids (blue text on the screenshot above), which will return a link to Foundry where the already-computed preview can be accessed.
   ![Use datasetPreview task to run preview and get Foundry link](/docs/resources/foundry/transforms-common/dataset-preview-result-in-terminal-as-uri.png)
   ![Precomputed dataset preview in Foundry](/docs/resources/foundry/transforms-common/dataset-preview-result-in-foundry.png)

3. (Optional) Add `--printMode=table` flag to the command above to print the first 10 rows of all previewed datasets directly in your terminal instead of being provided a link to the preview.
   ![Use datasetPreview task to run preview and print to terminal](/docs/resources/foundry/transforms-common/dataset-preview-result-in-terminal-as-table.png)

4. (Optional) To include input files in the preview, add `--inputFiles=<datasetAlias>:<path>` where `<datasetAlias>` is one of the input datasets from the selected transform function and `<path>` is the file path within the input dataset.
   ![Use input files arguments to include dataset's files](/docs/resources/foundry/transforms-common/dataset-preview-file-input-arguments.png)

5. (Optional) To include output files in the preview, add `--outputFiles=<datasetAlias>:<path>` where `<datasetAlias>` is one of the output datasets from the selected transform function and `<path>` is the file path within the output dataset.
   ![Use output files arguments to include dataset's files](/docs/resources/foundry/transforms-common/dataset-preview-file-output-arguments.png)
