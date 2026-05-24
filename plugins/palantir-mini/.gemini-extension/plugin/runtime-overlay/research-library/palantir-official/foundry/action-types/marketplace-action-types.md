---
sourceUrl: "https://www.palantir.com/docs/foundry/action-types/marketplace-action-types/"
canonicalUrl: "https://palantir.com/docs/foundry/action-types/marketplace-action-types/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "da7858ad247dfbb7c590f7468e5747aeff35e21bb6dbf184715f6e06e031f3dc"
product: "foundry"
docsArea: "action-types"
locale: "en"
upstreamTitle: "Documentation | Action types > Add action types to a Marketplace product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add action types to Marketplace product

Use [Foundry DevOps](/docs/foundry/devops/overview/) to include your action types in [Marketplace products](/docs/foundry/devops/core-concepts/#product) for other users to install and reuse. [Learn how to create your first product.](/docs/foundry/foundry-devops/create-products/)

## Supported features

Most action type features are supported, except actions that reference [object types with unsupported features](/docs/foundry/object-link-types/marketplace-ontology-types/#unsupported-features). When preparing your action type for packaging, ensure your action type [**Security & Submission criteria**](/docs/foundry/action-types/getting-started/#add-submission-criteria) does not reference a user; update any user references to refer to groups instead.

## Adding action types to products

To add an action type to a product, first [create a product](/docs/foundry/foundry-devops/create-products/) and then select the **Action type** content type as below.

![Add action type.](/docs/resources/foundry/action-types/marketplace-add-action-type.png)

You will then be prompted to choose an action type.

![Add action type dialogue.](/docs/resources/foundry/action-types/marketplace-add-action-type-dialog.png)

While you can select action types directly, we recommend first adding content like [Workshop applications](/docs/foundry/workshop/marketplace-workshop/) and then selecting relevant actions via the dependencies panel as shown below.

![Add action type via panel.](/docs/resources/foundry/action-types/marketplace-add-action-type-panel.png)
