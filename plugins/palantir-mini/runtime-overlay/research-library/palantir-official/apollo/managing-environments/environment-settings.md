---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/environment-settings/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/environment-settings/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "82b64523b3ad905e8d8e5803f3520f6292869dfe3ebe5b58300b95463a2f32ad"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Configure Environment settings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure Environment settings

The Environment's **Settings** tab allows you to view and edit the settings for the Environment and its managed Entities.

Editing the Environment settings will create a change request. [Environment editors](/docs/apollo/core/authorization/) can approve or reject the change request.

The **General** settings enable you to:

* [Install Entities](/docs/apollo/managing-entities/add-and-edit-entities/)
* [Uninstall Entities](/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/)
* [Restore Entities](/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/#undo-uninstallation)
* Edit external dependencies

![General Environment settings.](/docs/resources/apollo/managing-environments/environment-general-settings.png)

## Artifact Registries

The **Artifact Registries** settings allow you to assign an Artifact Registry to an Environment.

![Artifact Registries settings.](/docs/resources/apollo/managing-environments/assign-artifact-registry.png)

[Learn more about assigning Artifact Registries.](/docs/apollo/managing-artifact-registries/assign-artifact-registry/)

## Maintenance and suppression windows

The **Maintenance and Suppressions** tab allows you to view and manage maintenance and suppression windows for the Environment and its Entities.

Select **Actions** to edit maintenance windows, create maintenance window overrides, and create suppression windows.

![Maintenance and suppressions tab.](/docs/resources/apollo/managing-environments/maintenance-and-suppressions.png)

The **Maintenance Overrides** table displays the maintenance window overrides for the Environment and its Entities. The table can be filtered to overrides that are on the Environment or individual Entities, and to active or historical overrides.

<img alt="The Maintenance Overrides table." src="./media/maintenance-overrides.png" width=700>

[Learn more about defining maintenance window overrides.](/docs/apollo/managing-environments/create-maintenance-window-overrides/)

The **Suppressions** table displays the active suppressions windows for the Environment and its Entities. The table can be filtered to overrides that are on the Environment or individual Entities, and to active or historical suppression windows. <img alt="Table for active suppression windows." src="./media/active-suppression-windows.png" width=800>

[Learn more about configuring suppression windows.](/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/)

## Display metadata

In the **Display metadata** tab, you can update the display name, description, and README for the Environment.

The display name will replace the Environment name in the Environment page header, as well as anywhere else in Apollo that the environment is referenced, such as dropdowns and lists.

The description should include high level information about the environment, and will be displayed under the title in the Environment page header.

<img alt="Example display name, description, and README." src="./media/display-metadata-example.png" width=700>

The README field should include detailed information about the Environment, such as migration plans or documentation. The README supports Markdown rendering, and will render external links, tables, lists, and more. You can view the README in the Environment **Overview** tab.

<img alt="Display metadata updates in Environment Overview page." src="./media/display-metadata-in-overview-tab.png" width=800>

## Edit settings manually

Apollo provides specific actions for editing the Environment settings. The actions below are not recommended and should only be used when necessary.

Select **Edit settings manually** to edit to directly edit the Environment settings YAML file.

### Set default Release Channel

:::callout{theme="neutral"}
Overriding the default Release Channel for specific Entities is not recommended and should only be used when necessary.
:::

In addition to setting the Environment's default Release Channel, you can create overrides for the Release Channels of specific Entities. To do so, add a `release-channel` field below the `entity-locator` block for the Entity. An example is shown below.

```yaml
release-channel: RELEASE
managed-helm-charts:
  - entity-locator:
      name: wordpress
    k8s-namespace: namespace2
    product: com.bitnami.repos:wordpress
  - entity-locator:
      name: keycloak
    k8s-namespace: customer-namespace
    product: com.bitnami.repos:keycloak
    release-channel: DEV
```

In the above example the default Release Channel for the Environment is set to `RELEASE`. The `wordpress` Entity will use this default, while `keycloak` has an Entity-level override that subscribes it to the `DEV` Release Channel.

### Environment and Entity maintenance windows

Environment and Entity maintenance windows are scheduled recurring time ranges during which Apollo can perform maintenance actions such as upgrading services, applying config changes, and installing new Entities within the scope of a specific Environment.

You can submit a change request to create [temporary maintenance window overrides](/docs/apollo/managing-environments/create-maintenance-window-overrides/) for Environments and Entities to create a non-recurring maintenance window.

#### Define maintenance windows

Environment editors can specify the Environment maintenance window in the Environment’s settings file under the `global-maintenance-windows` field.

<img alt="Creating a new maintenance window" src="./media/new-maintenance-window.png" width=800>

Environment editors can also submit a change request to create overrides for specific Entities’ maintenance windows in the Environment settings file like below, by populating the `maintenance-windows` field below the `entity-locator` block for that Entity. Environment editors can also specify whether to override all Product maintenance windows for all Entities in the Environment with the field `override-product-maintenance-windows: false`.

```yaml
global-maintenance-windows:
  downtime: all-time
  no-downtime: all-time
maintenance-windows:
  schedule-a:
    time-intervals:
      - WEDNESDAY/00:00-SUNDAY/23:59
    time-zone-name: US/Pacific
  schedule-b:
    time-intervals:
      - WEDNESDAY/19:00-WEDNESDAY/19:30
    time-zone-name: US/Pacific
managed-helm-charts:
  - entity-locator:
      name: wordpress
    k8s-namespace: namespace2
    product: com.bitnami.repos:wordpress
    maintenance-windows:
      downtime: schedule-a
      no-downtime: schedule-b
  - entity-locator:
      name: keycloak
    k8s-namespace: customer-namespace
    product: com.bitnami.repos:keycloak
    release-channel: DEV
    maintenance-windows:
      downtime: all-time
      no-downtime: schedule-b
```

#### Entity resolved maintenance window

An Entity resolved maintenance window is the window which will be used for [maintenance window constraint](/docs/apollo/core/plans-and-constraints/#maintenance-window-constraint) evaluation. Apollo will calculate the [resolved maintenance window](/docs/apollo/core/plans-and-constraints/#how-apollo-calculates-an-entitys-resolved-maintenance-window) for each Entity in an Environment based on the Entity's declared maintenance window and the [Product's maintenance window](/docs/apollo/managing-products/product-maintenance-window/).

#### Maintenance windows: No-downtime vs. downtime

Apollo offers two types of maintenance windows:

* Downtime maintenance windows: Allow for changes where all the nodes on that Entity may go offline
* No-downtime maintenance windows: Allow for changes that will not cause any visible downtime for end users

Changes that do not require downtime can still be performed during downtime maintenance windows, but not vice versa; changes that require downtime cannot be performed outside of downtime maintenance windows.

#### (Optional) Override Product maintenance windows

Optional flag to disable Product maintenance windows. When enabled, Apollo will disregard the Product's maintenance window and only consider the Environment's maintenance window. The default value is false. Example:

`override-product-maintenance-windows: true`

#### (Optional) Require maintenance windows for no-downtime recalled Release roll-offs

Apollo’s default behavior is to roll off recalled Releases that do not require downtime outside of maintenance windows. You can use the following optional flag to opt out all Products on a Environment from Apollo’s default recall behavior. Defaults to false. Example:

`require-maintenance-windows-for-no-downtime-recalled-release-roll-offs: true`

It is strongly recommended that this flag is not overridden to ensure there are no delays to recalls of problematic Releases. This flag should only be overridden to true in cases when there are strong reason for it.

### Ignored dependencies

Environment editors can [override Product dependency constraints](/docs/apollo/managing-entities/add-and-edit-entities/#advanced-settings) for an Entity by adding ignored dependencies. To do so, add an `ignored-dependencies` field below the `entity-locator` block for the Entity. You can list multiple Products in this field. An example is shown below.

```yaml
managed-helm-charts:
  - entity-locator:
      name: wordpress
    k8s-namespace: namespace2
    product: com.bitnami.repos:wordpress
    ignored-dependencies:
      - com.bitnami.repos:nginx
      - com.bitnami.repos:mariadb
```

### Dependency groups

Environment editors can create dependency groups to organize Entities into logical groupings.

When dependency groups are configured:

* An Entity will only consider a [Product Release dependency](/docs/apollo/apollo-product-specification/product-dependencies/) satisfied if the Entity shares at least one group with the dependent Entity
* An Entity will only consider a [Product Release incompatibility](/docs/apollo/apollo-product-specification/product-incompatibilities/) active if the Entity shares at least one group with the target Entity

#### Example use case

Consider a scenario where you have a dependency relationship `A -> B`, meaning A depends on B. You want to run two separate instances of these Products simultaneously: A1 and A2, where A1 depends on B1 and A2 depends on B2.

Initially, you have A1 and B1 installed and working together. Now you want to install A2, but you need it to depend on B2 rather than the existing B1.

With dependency groups, you can achieve this isolation by:

* Placing A1 and B1 in the same dependency group (e.g., `production`)
* Placing A2 in a separate dependency group (e.g., `staging`)

This configuration ensures that when you install A2, its dependency on B is not satisfied by the existing B1 instance. Instead, A2 will wait for B2 to be installed in the same dependency group before proceeding.

#### Configure dependency groups

To configure dependency groups for an Entity, add a `dependency-groups` field below the `entity-locator` block. You can specify multiple groups for a single Entity.

```yaml
managed-helm-charts:
  - entity-locator:
      name: wordpress
    k8s-namespace: namespace
    product: com.bitnami.repos:wordpress
    dependency-groups:
      - group-1
  - entity-locator:
      name: mariadb
    k8s-namespace: namespace
    product: com.bitnami.repos:mariadb
    dependency-groups:
      - group-1
```

#### Override dependency group behavior

You can override the default dependency group behavior for specific dependencies using `dependency-group-overrides`. This allows you to specify which groups to search when resolving dependencies for particular Products.

```yaml
managed-helm-charts:
  - entity-locator:
      name: wordpress
    k8s-namespace: namespace
    product: com.bitnami.repos:wordpress
    dependency-groups:
      - group-1
    dependency-group-overrides:
      com.bitnami.repos:shared-database:
        - default
        - shared-services
```

#### Wildcard overrides

Use the wildcard `"*"` to allow an Entity to satisfy dependencies from any group:

```yaml
managed-helm-charts:
  - entity-locator:
      name: shared-service
    k8s-namespace: shared
    product: com.example:shared-service
    dependency-groups:
      - shared-services
    dependency-group-overrides:
      com.example:monitoring:
        - "*"
```

### Default behavior

* **No groups specified:** Entities without explicit `dependency-groups` are assigned to the `default` group.
* **Empty groups:** An empty `dependency-groups` list is treated as `["default"]`.
* **No overrides:** Dependencies are resolved within the Entity's own groups when no overrides are specified.
