---
sourceUrl: "https://www.palantir.com/docs/foundry/health-checks/marketplace-data-health/"
canonicalUrl: "https://palantir.com/docs/foundry/health-checks/marketplace-data-health/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "95b007f8064b1f9252de36226e6b95587369c7bc4bbf5a7b72f6b10d75145dbd"
product: "foundry"
docsArea: "health-checks"
locale: "en"
upstreamTitle: "Documentation | Health checks > Add health checks to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add health checks to a Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your Data Health checks in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

The following features are supported when adding health checks to Marketplace products:

* Health checks on datasets.
* Health check configuration validations are supported for all except:
  * Dataset validations (for example, health checks involving secondary dataset validations).
  * Path configuration validations (for example, health checks with source path validations).
  * Health checks with configuration to create a [Foundry issue](/docs/foundry/getting-help/issues/).
* [Monitoring views](/docs/foundry/monitoring-views/overview/) and [check groups](/docs/foundry/monitoring-views/check-groups/) are automatically added as inputs, such that all health checks packaged in a group will be added to the provided input group during [installation](/docs/foundry/marketplace/install-product/).
* [Data expectation](/docs/foundry/pipeline-builder/dataexpectations-overview/) health checks are automatically added if a [dataset transformation](/docs/foundry/code-repositories/marketplace-dataset-transformation/) is packaged which contains a data expectation in the transformation logic. These types of checks cannot be manually added or removed by the packager, as they are part of the transforms logic.

## Adding Data Health checks to products

To add a Data Health check to a product, first [create a product](/docs/foundry/foundry-devops/create-products/), then add a [dataset transformation](/docs/foundry/code-repositories/marketplace-dataset-transformation/) or [Pipeline Builder pipeline](/docs/foundry/pipeline-builder/marketplace-pipeline-builder/) to your product. You can then package any checks that are associated with the output dataset(s) of your dataset transformation or pipeline using the **Suggestions** button.
