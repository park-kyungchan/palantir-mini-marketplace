---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2831d7c597f2e714f5f6ed566065ffd2776184904edbe63754ab890b54a4779f"
product: "apollo"
docsArea: "managing-entities"
locale: "en"
upstreamTitle: "Documentation | Managing Entities > Uninstalling and unmanaging Entities"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Uninstalling and unmanaging Entities

This section will walk through how to uninstall an Entity from an Environment in Apollo.

**Uninstalling** a [managed Entity](/docs/apollo/core/entities/#managed-and-unmanaged-entities) means that Apollo will remove the underlying Kubernetes resources from the Spoke Environment.

**Unmanaging** an Entity means that Apollo will remove the Entity from its [Environment settings](/docs/apollo/managing-environments/environment-settings/) and stop issuing Plans for it. If the Entity was not uninstalled prior to unmanaging it, the underlying Kubernetes resources will remain in the Environment"

## Uninstalling an Entity

To uninstall an Entity from a connected Environment, navigate to the **Settings** tab of the Environment page and select **Uninstall entities**.

![The Uninstall entities option is highlighted.](/docs/resources/apollo/managing-entities/uninstall-entities.png)

You can also select **Uninstall entities** from the **Actions** dropdown on the Environment or Entity page. Entering the workflow from the Entity page will pre-populate the Entity in the list of Entities to uninstall.

<img alt="The Uninstall entities option in the Actions dropdown is highlighted." src="./media/uninstall-entities-dropdown.png" width=300>

First, you can select one or more Entities to uninstall.

<img alt="The Configure details tab of the Entity uninstallation form." src="./media/uninstall-entities-configure-details.png" width=600>

By default, Apollo will automatically unmanage the Entity after uninstalling it. You can change this by selecting **Unmanage only** in the **Advanced settings** section. If enabled, Apollo will remove the Entity from the Environment settings, but the Entity will remain installed in the Environment.

<img alt="The Advanced settings section." src="./media/unmanage-only.png" width=500>

:::callout{theme="warning"}
We do not recommend only unmanaging an Entity. Only select this option if you are aware of the consequences.
:::

Next, Apollo will display all the Entities in the Environment that depend on the Entity you want to uninstall.

<img alt="The Check dependencies tab of the Entity uninstallation form." src="./media/check-dependencies.png" width=600>

Before uninstalling Entities, any dependent Entities must be uninstalled to prevent potential breaking of dependency constraints within the environment.

:::callout{theme="neutral"}
You can submit the form without resolving required dependencies. However, Apollo will not execute the Plan to uninstall the Entity until the required dependencies are resolved.
:::

Entities that have optional dependencies on one of the Entities you are uninstalling do not have to be uninstalled before Apollo can uninstall Entities.

Lastly, you can review the steps that Apollo will take to uninstall and unmanage the Entity. Select **Uninstall and unmanage entity** to uninstall the Entity.

<img alt="The Review impact tab of the Entity uninstallation form." src="./media/review-impact.png" width=600>

Once the change request has been approved, Apollo will issue a [Plan](/docs/apollo/core/plans-and-constraints/#plans) to uninstall the Entity when there are no blocking constraints. For example, Apollo will not uninstall an Entity while another Entity which [depends](/docs/apollo/apollo-product-specification/product-dependencies/) on it is installed. Note that Apollo may execute other Plans on the Entity before this Plan.

After the Entity is uninstalled, Apollo will unmanage the Entity by removing it from the Environment settings.

## Undo uninstallation

You can undo the uninstallation of any Entity that is marked for uninstallation or has been uninstalled, but not yet unmanaged.

Navigate to the Entity page and hover over the `Uninstall pending` or `Uninstalled` status. Then select **Undo**.

<img alt="The undo uninstallation button." src="./media/undo-uninstallation.png" width=600>

:::callout{theme="neutral"}
If the Entity has not yet been uninstalled, possibly due to some [constraints](/docs/apollo/core/plans-and-constraints/#constraints), then Apollo will simply stop trying to uninstall the Entity.
:::
