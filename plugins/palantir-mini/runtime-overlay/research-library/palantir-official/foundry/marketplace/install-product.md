---
sourceUrl: "https://www.palantir.com/docs/foundry/marketplace/install-product/"
canonicalUrl: "https://palantir.com/docs/foundry/marketplace/install-product/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bbf973649c0093874b9ff2ff4e169878b6a61ea53beb162db34cebf1e79d4022"
product: "foundry"
docsArea: "marketplace"
locale: "en"
upstreamTitle: "Documentation | Products > Install a product"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Install a product in Foundry Marketplace

When you have found a product you would like to install, Marketplace will guide you through the process of mapping any required inputs to create the product's output content.

## Installation guide

To begin installing a product, select the blue **Install** button in the top right corner of the Marketplace interface. If you already have access to an existing installation, this button will instead prompt you to **Open**, though you can select **Install again** if you prefer to install the product again (for instance, if you would like to create a new version with different inputs). If the product version is recalled by the publisher, the **Install** button will be disabled.

An installation draft will then be created and you will be presented with a guided installation process.

### General

![The General page of install details.](/docs/resources/foundry/marketplace/installation-general.png)

The first part of the installation process allows you to configure the name and installation location of a product.

* [**Installation mode:**](/docs/foundry/foundry-devops/create-products/#installation-mode) The default settings provided by the product builder. Products that have been created in **Production mode** are designed to be installed and upgraded without local changes to any given installation. Products that have been created in **Bootstrap mode** are designed to be installed and edited. See **Installation location** for more information on how this impacts available installation locations.
* **Installation suffix:** This is an optional configuration that enables you to customize the name of the project in which content will be installed; for instance, you might add a suffix of `test` to a product created as a test.
* **Installation location:** The following options allow you to specify where the product should be installed:
  * **Project or folder:** The project or folder in which your installed resources will live. For **Production mode** and **Singleton mode** products, locking the project is encouraged to ensure safe upgrades. When locking, you will have the opportunity to map the roles on your project to Marketplace roles. You can unlock your project in Compass by navigating to **Access > Settings > Advanced** and selecting **Unlock**. For **Bootstrap mode** products, you can select either a project or a folder where you have edit access.
  * **Ontology:** The [Ontology](/docs/foundry/ontologies/ontologies-overview/) in which any objects, links, actions, and [functions](/docs/foundry/functions/marketplace-functions/) will be created. If you do not see the Ontology you want, contact your platform administrator as this means you do not have permission to edit.

### Inputs

Inputs are entities (such as objects or pipelines) relied upon by the content of a product. Inputs can be mapped to a product manually, using [linked products](/docs/foundry/marketplace/linked-products/), or by choosing an existing folder or legacy Foundry Template.

:::callout{theme="neutral"}
[Linked products](/docs/foundry/marketplace/linked-products/) automatically fulfill inputs using the content of another product.
:::

#### Inputs overview

![The Inputs overview page for installations.](/docs/resources/foundry/marketplace/installation-inputs.png)

The **Inputs** overview page provides information about the inputs that are currently unmapped; these are referred to as "missing inputs".

You can choose content from an existing folder or a legacy Foundry Template to automap as inputs.

#### Input mapping

![The input mapping configuration page for the "players\_cleaned" dataset.](/docs/resources/foundry/marketplace/installation-input-mapping.png)

After the **Inputs** overview page, you will have a chance to select resources to fulfill each required input.

On the page for each resource, the **Configuration** tab allows you to set up each input, for instance by specifying column mappings between the input and the product.

The **Dependents** tab provides information on why an input is needed by showing what content requires this input in order to install. For example, a Workshop application may require specific object types.

![Placeholder inputs are not required for the Inventory Management Workflow installation.](/docs/resources/foundry/marketplace/installation-input-dependents.png)

##### Placeholder inputs

To deploy Marketplace products before all resources are available, you can create temporary stub resources in a specified folder to continue with the installation. Dataset inputs are currently supported, with additional input types expected to be supported in the near future.

The option to generate placeholder inputs will be visible on the **Inputs** overview page if there are any supported but not yet fulfilled inputs. Selecting **Generate placeholder inputs** will generate placeholder inputs for every suitable input.

![An input is missing from a dataset.](/docs/resources/foundry/marketplace/placeholder-inputs-button.png)

Alternatively, to generate a single placeholder input, select **...** next to the input selector, then select **Generate placeholder**.

![The option to generate a placeholder input is located next to the input selector.](/docs/resources/foundry/marketplace/placeholder-inputs-inline-button.png)

Once the actual resources become available, you can remap these inputs by navigating to the **Installation** page and selecting **Edit**.

![Select Edit in the upper right corner of the installation page to add available resources.](/docs/resources/foundry/marketplace/placeholder-inputs-edit-installation.png)

You can remap any existing placeholder input with the actual resource by selecting **Change**.

![Remap placeholder input for a dataset.](/docs/resources/foundry/marketplace/placeholder-inputs-change-input.png)

Not all products will require input mapping; for example, if a product provides only datasets as content, it may not need any inputs to be mapped. If input mapping is not required for your product, this step will be hidden.

### Content

![A view of the Content page for the Inventory Management Workflow product installation.](/docs/resources/foundry/marketplace/content.png)

The **Content** page provides a summary of all resources that will be installed, such as applications, [functions](/docs/foundry/functions/marketplace-functions/), link types, and action types.

#### Prefixing Ontology entities

![The field to add an ontology entity prefix.](/docs/resources/foundry/marketplace/ontology-prefix.png)

The **Content** page contains a toggle labeled **Prefix ontology entities**; similar to using an [installation suffix](#general) to customize the name of the project in which your content will be installed, you can use the **Prefix ontology entities** toggle to customize the names of all object types, link types, and action types with a user-specified prefix (for example, `DEV`, which would prefix ontology entities with `[DEV]`).

### New versions

When installing a **Production mode** product, you will have an additional installation step to specify release channels and maintenance windows for automatic upgrades.

![Customize options for automatic upgrades of new product version.](/docs/resources/foundry/marketplace/new-versions.png)

Read more about these settings in [upgrades](/docs/foundry/marketplace/installations/#automatic-upgrades-beta).

### Review

The **Review** page surfaces any validation errors that must be resolved before installation. For instance, the installer might need to map a missing column in the clean dataset used as a required input before the installation will succeed.

![The Review page of the Inventory Management Workflow product, showing multiple failures caused by missing inputs in datasets.](/docs/resources/foundry/marketplace/failing-validation.png)

Once all inputs have been mapped, you will be able to kick off an installation using the **Install** option. This submits the
installation draft and a job starts running to create the resources. You will then be redirected to the job page, where you can see the job's progress.

![The Review page of a product installation, showing passing validations for all datasets.](/docs/resources/foundry/marketplace/review.png)
