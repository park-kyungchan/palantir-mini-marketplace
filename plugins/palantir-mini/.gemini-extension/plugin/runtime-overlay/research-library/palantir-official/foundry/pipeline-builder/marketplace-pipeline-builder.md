---
sourceUrl: "https://www.palantir.com/docs/foundry/pipeline-builder/marketplace-pipeline-builder/"
canonicalUrl: "https://palantir.com/docs/foundry/pipeline-builder/marketplace-pipeline-builder/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bd695c1821a9a12fb7919b6d8b093cb0c54e354c6bdcfb08284df7be20a2e316"
product: "foundry"
docsArea: "pipeline-builder"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder > Add pipeline to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add pipeline to a Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your Pipeline Builder pipelines in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

All Pipeline Builder features are supported by Marketplace products with the exception of:

* Streaming pipelines with time series targets
* Parameters of the following types: struct type **constants**, complex **expressions** that are not composed of constants, **options**, and **struct locators**.

### Check Marketplace compatibility with the Marketplace linter

In Pipeline Builder, you can check whether a pipeline is compatible with Marketplace by using the Marketplace linter. To enable this, navigate to **Settings**, and select **Enable Marketplace validation** in your pipeline. This setting is not enabled by default.

![Enable Marketplace validation setting.](/docs/resources/foundry/pipeline-builder/marketplace-settings-enable-validation.png)

Once enabled, the **Pipeline warnings** section at the bottom of your pipeline will display any errors preventing your pipeline from being packaged in Marketplace.

![Pipeline warning example.](/docs/resources/foundry/pipeline-builder/marketplace-pipeline-warnings.png)

If there are no Marketplace incompatibilities, no **Marketplace packaging warnings** will appear in the errors/warnings drawer. Note that other types of pipeline errors or warnings may still appear.

## Adding Pipeline Builder pipelines to products

To add a Pipeline Builder pipeline to a product, first [create a product](/docs/foundry/foundry-devops/create-products/), then [add outputs](/docs/foundry/foundry-devops/create-products/#add-outputs). Choose the **Add files** option to navigate to the pipeline from within the [Compass](/docs/foundry/compass/overview/) filesystem and add it to your product.

## Pipeline parameters

You can use [pipeline parameters](/docs/foundry/pipeline-builder/management-parameter-overview/) to give installers the ability to customize their pipeline at installation time. For example, you can use a `boolean` parameter to follow one branch of a pipeline versus another depending on the installer's input. See [supported features](#supported-features) for a list of supported parameter types. When you package a pipeline with a parameter, that parameter will be surfaced as a [dependency](/docs/foundry/foundry-devops/create-products/#add-outputs) to your pipeline and an [input](/docs/foundry/foundry-devops/create-products/#add-inputs) for installers as below.

![parameter](/docs/resources/foundry/pipeline-builder/marketplace-parameter.png)

## Packaging settings

To configure required or optional datasets and columns for installers, navigate to **Pipeline outputs panel > Settings** to access the **Packaging settings**.

![packaging settings](/docs/resources/foundry/pipeline-builder/marketplace-packaging-settings.png)

By default, all columns and input datasets are required for Marketplace installations. If there are any columns or input datasets that are not required, you may mark them as optional. Optional input datasets will default to empty and optional column values will default to null if used in pipeline logic.

![packaging settings dialog](/docs/resources/foundry/pipeline-builder/marketplace-packaging-settings-dialog.png)
