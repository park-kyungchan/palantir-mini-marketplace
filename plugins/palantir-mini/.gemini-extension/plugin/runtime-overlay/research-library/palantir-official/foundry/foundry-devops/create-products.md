---
sourceUrl: "https://www.palantir.com/docs/foundry/foundry-devops/create-products/"
canonicalUrl: "https://palantir.com/docs/foundry/foundry-devops/create-products/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ceadc3eec4fa520065b7f10c74caa14e070785c948da1ff3519dfe0998d0d84a"
product: "foundry"
docsArea: "foundry-devops"
locale: "en"
upstreamTitle: "Documentation | Products > Create a product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a product

This page contains instructions for creating a new [product](/docs/foundry/devops/core-concepts/#product) in Foundry DevOps. Users can [browse](/docs/foundry/marketplace/browse-products/) and [install available products](/docs/foundry/marketplace/install-product/) via the Marketplace storefront. Read more about [use cases for which you may want to create a product](/docs/foundry/foundry-devops/overview/).

## Stores

To create a new product, select a [store](/docs/foundry/devops/core-concepts/#store) in which to publish your product. To select an existing store or create a new one, select the **Change Store** option in the top-right.

![Store selection view.](/docs/resources/foundry/foundry-devops/select-store.png)

New stores are saved to a project and inherit the permissions of that project. Specifically, anyone with edit access to a store's project can create new products and edit existing products in that store, and anyone with view or edit access to the store's project can install products from that store.

## Product creation

Once you've chosen a store, select **New product** to begin creating your product.

![A DevOps store overview page is displayed.](/docs/resources/foundry/foundry-devops/store-overview.png)

## Configure a new product draft

Provide a name for your draft product in the **Set product title...** input box in the top-left.

When starting a product draft, you can either:

* **Add resources:** Manually choose resources from projects, folders, or the ontology, to package them as outputs.
* **Track a folder:** The product will [track a source folder](/docs/foundry/foundry-devops/folder-tracking/). New versions of the product will automatically bring in new outputs from the folder.

In the example below, we choose to manually add resources. At any point, the draft can be [migrated to folder tracking](/docs/foundry/foundry-devops/folder-tracking/#migrating-to-track-a-source-folder).

![The Draft product creation page is displayed.](/docs/resources/foundry/foundry-devops/creation-landing-page.png)

### Add outputs

Choose **Add output** to select the outputs to include in your draft product; these outputs are the resources that Marketplace recreates when users install your product. You can choose **Add files** to select most resource types within the [Compass](/docs/foundry/compass/overview/) filesystem. If a resource is not available to select through Compass, then DevOps provides its own selection option, such as **Add ontology resources**.

<img alt="The Add outputs menu is displayed." src="./media/add-outputs-selector.png" width=500>

DevOps automatically identifies resource dependencies, so you should add the furthest downstream resources first. For example, if you want to package a [Workshop application](/docs/foundry/workshop/overview/) and four [object types](/docs/foundry/object-link-types/object-types-overview/), you should only add the Workshop application.

DevOps also enables you to add outputs in bulk. For one-time bulk addition of outputs, select **Add all files from folder**. You can also use **Add from Data Lineage** and **Add from Workflow Lineage** to add resources from a graphical dependency view. For a more automated way of tracking outputs that syncs changes with the source folder as the product evolves, consider [tracking a source folder](/docs/foundry/foundry-devops/folder-tracking/).

After you add outputs to your draft product, select a resource to launch its **Details** panel on the right side of your screen.

![A resource's Details panel is displayed.](/docs/resources/foundry/foundry-devops/output-information-panel.png)

Select the **Dependencies** tab to review the output's dependencies, which DevOps also surfaces as [inputs](#add-inputs).

### Add inputs

DevOps automatically surfaces output dependencies as **Inputs** as you add outputs to your draft product. Users who install your finished product must provide resources to satisfy each input.

When designing your product, you can promote inputs for inclusion as outputs. Select the ellipsis icon before choosing **Move to output** on the input row to promote it to an output.

![Move an input to the outputs panel by selecting Move to output.](/docs/resources/foundry/foundry-devops/move-to-output.png)

You can also move inputs to outputs in bulk by selecting multiple inputs and choosing **Move {N} to outputs** from the popup at the bottom of your screen.

![A horizontal popup enables a user to bulk add multiple inputs as outputs.](/docs/resources/foundry/foundry-devops/include-inputs.png)

As a general rule, if you want installers to provide their own version of a resource, such as their own [dataset](/docs/foundry/data-integration/datasets/) or object type, then you should list that requirement as an input. If you want your product to instead provide a resource for your installers, then you should promote the input to be an output.

If you iteratively promote all inputs to outputs, then users who install your product will not need to map anything during installation.

![A diagram of inputs and outputs is displayed.](/docs/resources/foundry/foundry-devops/inputs-and-outputs.png)

You cannot move certain input types, such as [parameters](/docs/foundry/quiver/cards-parameters/) or [groups](/docs/foundry/platform-security-management/manage-groups/), to outputs since DevOps requires their configuration for installation.

![The Inputs panel displays the inability to move to certain input types to outputs.](/docs/resources/foundry/foundry-devops/move-to-output-not-supported.png)

To view more information about a specific input, select the input to launch the **Details** panel. The **Dependents** tab includes information on which content resources require this input. From here, you can also configure [presets](/docs/foundry/foundry-devops/input-presets/) for an input, which allow you to restrict the options of an input and provide a default to installers.

![Information panel showing dependent Workshop applications, resources, and repositories.](/docs/resources/foundry/foundry-devops/input-information-panel.png)

### Manage inputs and outputs

DevOps provides multiple options to help you manage products with a large number of outputs. Use the **Group by Folder** option in the **Outputs** panel to preview outputs in their destination folders if you enable [folder structure](#folder-structure) to replicate the organization of packaged resources during installation.

![The Outputs panel displays the ability to group outputs by destination folder.](/docs/resources/foundry/foundry-devops/group-by-folder.png)

You can also select the filter icon in the ribbon of both the **Inputs** and **Outputs** panels to filter the resources they display. For example, this enables you to display only those resources that have an error message or are of a specific type.

### Preview linked products

Select the **Linked products** tab from the left panel of your product to preview all available [linked products](/docs/foundry/marketplace/linked-products/), which can provide inputs for your products.

![The Linked products tab is highlighted in the left panel of the Linked Products page.](/docs/resources/foundry/foundry-devops/linked-products-main-packaging.png)

You can also use the **Group by linked products** option in the **Inputs** table to preview the inputs provided by each of the upstream linked products.

![The Resources page displays Inputs grouped by linked products.](/docs/resources/foundry/foundry-devops/group-by-linked-products.png)

### Add product documentation

Select the **Documentation** tab from the left panel of your product to add information visible to users who are [browsing products in the storefront](/docs/foundry/marketplace/browse-products/). Use the **Description** section to write a short description of your product before adding an image to serve as its **Thumbnail**.

You can add additional **Images** as a preview of your product's content. Optionally, enter a longer **Product description** using [Markdown ↗](https://www.markdownguide.org/basic-syntax/) syntax that contains detailed product use instructions.

![The Documentation page displays options for submitting documentation information about a product.](/docs/resources/foundry/foundry-devops/documentation.png)

### Configure product settings

Select the **Settings** tab to configure additional product settings.

![The Settings page is displayed.](/docs/resources/foundry/foundry-devops/settings.png)

#### Folder structure

Enable folder structure by toggling on **Folder structure** to have DevOps create folders during installation that match the original organization.

DevOps packages folders up until the lowest common ancestor, which on installation will be replaced by the installation project.

![A folder structure diagram is displayed.](/docs/resources/foundry/foundry-devops/folder-structure.png)

#### Installation mode

Use **Installation mode** to set the default settings for any installations of your product. These settings can be changed per installation.

* **Production:** Recommended when you want to manage all installations centrally and use features such as automatic upgrades. By default, installations have automatic upgrades disabled. Installers will be given the option to lock down their project to ensure safe upgrades.
* **Singleton:** The same settings as Production mode, with the restriction that there can only be one installation of the product per space and ontology.
* **Bootstrap:** Recommended when you expect that installers will use your product as a starting point for their own custom work. By default, installations have automatic upgrades disabled and installers can install into any location where they have edit access.

#### Build settings

Use **Build settings** to determine whether or not DevOps builds datasets and models automatically during the Marketplace installation job. This ensures that DevOps hydrates all datasets across the newly deployed resources upon job completion.

### Review and publish

Once you are satisfied with your product, select **Publish** to make the product available in the storefront. This launches the **Review Changes and Publish** popup, where you can review changes in your product and add a **Changelog description**. Publishing may take up to a few minutes depending on your product's size.

![The Review Changes and Publish screen.](/docs/resources/foundry/foundry-devops/review-and-publish.png)
