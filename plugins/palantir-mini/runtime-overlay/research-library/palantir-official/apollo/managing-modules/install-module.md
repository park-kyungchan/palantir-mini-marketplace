---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-modules/install-module/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-modules/install-module/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e53df821aa9b74517afa29e8dd9a496ebd7f5544eace2861ff3b5b759a53b28c"
product: "apollo"
docsArea: "managing-modules"
locale: "en"
upstreamTitle: "Documentation | Managing Modules > Install a Module"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Install a Module

Navigate to the **Software Catalog** and select the Module that you want to install. Then select **Install module** from the **Actions** dropdown.

![The Install module button in the Software Catalog is highlighted.](/docs/resources/apollo/managing-modules/install-module-catalog.png)

You can also select **Install module** from the **Actions** dropdown on the Environment page.

<img src="./media/install-module-environment-page.png" alt="The Install module option in the Actions dropdown is highlighted.">

First, select the Module to install and the Environment that you want to install the Module in. Optionally, define a custom display name for this specific installation. This is useful if you plan to install the same Module multiple times in the same Environment. Then select **Next**.

![The first step of Module installation.](/docs/resources/apollo/managing-modules/install-module-step-1.png)

Now you can define any specific configuration for this installation of the Module. If there are any [variables](/docs/apollo/core/modules/#variables) you will be able to define values in this step. Secret requirements by the Module will be listed here as well. Select **Edit Secrets** to provide the required values and [fulfill the secret requirements](#fulfilling-secret-requirements-during-module-installation).

![The second step of Module installation.](/docs/resources/apollo/managing-modules/install-module-step-2.png)

You can select **Preview module contents** to view the configuration for each Entity in the Module.

![The View entities option is expanded and the configuration for an Entity is displayed.](/docs/resources/apollo/managing-modules/view-entities.png)

Select **Install** to create a [change request](/docs/apollo/managing-changes/change-requests/) to install the Module in the Environment.

After the Module is installed, you can view the Entities that were created in the **Entities** tab of the Environment page. The **Modules** column specifies the Module that the Entity is part of.

![Entities tab of the Environment page](/docs/resources/apollo/managing-modules/entities-tab.png)

## Fulfilling secret requirements during Module installation

During Module installation, you will be prompted to input any secrets required by the [Module definition](/docs/apollo/managing-modules/create-module/#entities). If the secrets already exist, there is no additional work required at this step.

![Secret Requirements during Module Installation](/docs/resources/apollo/managing-modules/module-installation-secret-requirements.png)

## Managing existing Entities using a Module

To begin managing existing Entities with a Module, you can [install the Module](#install-a-module) in the Environment. The Module will take over managing the existing Entities rather than creating new Entities.

:::callout{theme="neutral"}
You should verify that the Entity declared in the Module has the same Entity ID as the Entity in the Environment.
:::

For example, if a Module has 31 Entities and 30 of them are already installed in the Environment, you can install the Module in the Environment. Apollo will install the one Entity that was not already installed and will also begin managing the 30 existing Entities with the Module.

## Unlinking a Module

Unlinking a Module from an Environment will remove the Module installation from the Environment. The Entities that were part of the Module will remain in the Environment after the Module is unlinked but will no longer be managed by the Module. To unlink a Module from an Environment, navigate to the **Installations** tab of the Module page and select the Module installation that you want to unlink. Then select **Unlink module** from the dropdown.

![Unlinking a Module.](/docs/resources/apollo/managing-modules/unlink-module.png)
