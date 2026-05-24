---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-entities/add-and-edit-entities/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-entities/add-and-edit-entities/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cabaeac714fa4bafc0531b9271d3c0691a807de7c7117ef9eaf3619ddd3fff73"
product: "apollo"
docsArea: "managing-entities"
locale: "en"
upstreamTitle: "Documentation | Managing Entities > Adding and Managing Entities"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Adding and managing Entities

## Adding Entities

The **Add Entities** workflows provide forms to specify the required [settings](/docs/apollo/core/entities/#entity-settings) for managing a new Entity of the selected type with Apollo. If a corresponding [unmanaged Entity](/docs/apollo/core/entities/#managed-and-unmanaged-entities) already exists, Apollo will start managing it. If no Entity exists, Apollo will create one.

:::callout{theme="warning"}
You cannot add an Entity that is already [managed](/docs/apollo/core/entities/#managed-and-unmanaged-entities) by Apollo, including managed Entities that have been uninstalled. To add an Entity that has been previously uninstalled, you can either wait for Apollo to [unmanage](/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/) the Entity first and then add it or [undo](/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/#undo-uninstallation) the uninstallation.
:::

To add an Entity, navigate to the **Settings** tab of the Environment page and select **Install entities**.

![Manage environment settings](/docs/resources/apollo/managing-entities/install-entities.png)

## Set Entity Configuration

Some information must be provided to get the Entity definition set up properly.

![The Add Entity settings.](/docs/resources/apollo/managing-entities/install-helm-chart-configuration.png)

* **Product:** The Product that you want to install in the Environment.
* **Name:** After you select a Product, Apollo will enter the name for the Product. The name must be unique in the Environment. Apollo allows installing the same Product as multiple Entities so if the Product you select already exists in the Environment, then you should edit this field so the name is unique.
* **K8s namespace:** The Kubernetes namespace that Apollo will install the Product in. Learn more about [installing an Entity in a Kubernetes namespace](/docs/apollo/managing-k8s-namespaces/install-entity-in-k8s-namespace/).
* **Release channel subscription:** The Release Channel that the Entity should follow. If you do not enter a Release Channel, then the Entity will follow the Environment's default Release Channel.
* **Supported versions:** The major versions of the Product that Apollo can install in the Environment. For example, if `9.3.7` is a supported version, then Apollo can install any Release that is greater than or equal to `9.3.7` up to, but not inclusive, to `10.0.0`. Note, that a `Manual overrides` config block will be automatically created for each version you choose so that Apollo can set that configuration for the corresponding versions.  You can list multiple major versions for a Product.
* **Manual overrides:** Here you can define any [config overrides](/docs/apollo/managing-entities/set-config-overrides/) for the Entity. You can leave the overrides block empty as in the example above but the block is required.

### Secrets

You can optionally specify secrets to be created in the Environment during the installation of the Entity. To do this, expand the **Add secrets** menu and select **Add new secret**. Then enter a secret name, description, and one or more key-value pairs.

[Learn more about defining secrets.](/docs/apollo/managing-secrets/add-edit-delete-secrets/)

![The Add secrets options for an Entity.](/docs/resources/apollo/managing-entities/add-secrets.png)

### Advanced settings

You can optionally complete the **Advanced settings** for an Entity.

![The Advanced settings for an Entity.](/docs/resources/apollo/managing-entities/advanced-settings.png)

* **Helm release name:** The name that will be used by Apollo during the Helm install process. The default value is the `Name` field that you define in the Entity settings above.
* **Ignored dependencies:** Apollo will ignore any [Product dependency constraints](/docs/apollo/core/plans-and-constraints/#product-dependencies-constraint) for the Products you list in this field.
* **Dependency stack overrides:** If this Entity will have dependencies on a different stack, you can list the stack in this section. Apollo only considers Entities installed to the same stack by default when checking the [Product dependency constraint](/docs/apollo/core/plans-and-constraints/#product-dependencies-constraint) unless a stack override is configured.

You can select **Add entity** to add another Entity in the Environment.

When you are finished, select **Submit for approval**. Apollo will submit a change request to add the Entity to the Environment. After that change request has been approved and merged, Apollo will automatically install the appropriate Product Release within the Spoke Environment and manage upgrades and other operations for the Entity going forward.

## Entity installation requirements

The following requirements must be satisfied for Apollo to successfully install your Entity.

* The Release Channel that the Entity follows must contain at least one Release, otherwise Apollo will not recommend a Plan to install the Entity. A Release of the Entity's Product must be promoted to the Entity's Release Channel either through the Product's [promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/) or by [manual promotion](/docs/apollo/managing-release-channels/manual-promotion/).
* [Maintenance window constraints](/docs/apollo/core/plans-and-constraints/#maintenance-window-constraint), [suppression window constraints](/docs/apollo/core/plans-and-constraints/#suppression-window-constraint), and [Product dependencies constraints](/docs/apollo/core/plans-and-constraints/#product-dependencies-constraint) must be satisfied. Note that the Product dependencies constraint will not be satisfied if the Entity's [ignored dependencies](#advanced-settings) and [dependency stack overrides](#advanced-settings) are not configured properly.
* Product dependencies are able to install and upgrade correctly.

## Entity upgrade requirements

The following requirements must be met for Apollo to successfully upgrade your Entity.

* The Release Channel that the Entity follows must contain a newer Release, otherwise Apollo will not recommend a Plan to upgrade the Entity. A Release of the Entity's Product must be promoted to the Entity's Release Channel either through the Product's [promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/) or by [manual promotion](/docs/apollo/managing-release-channels/manual-promotion/).
* [Maintenance window constraints](/docs/apollo/core/plans-and-constraints/#maintenance-window-constraint), [suppression window constraints](/docs/apollo/core/plans-and-constraints/#suppression-window-constraint), and [Product dependencies constraints](/docs/apollo/core/plans-and-constraints/#product-dependencies-constraint) must be satisfied. You should check for any new Product dependencies that may have been introduced in new Releases.
* There are no recalls on your Entity's current Release with a [freeze version changes roll-off strategy](/docs/apollo/recalling-releases/roll-off-strategies/#freeze-all-version-changes).

## Editing existing Entities

For information on how to configure the Declared State for existing managed Entities, see [Managing Environments - Configuring Environment settings](/docs/apollo/managing-environments/environment-settings/)
