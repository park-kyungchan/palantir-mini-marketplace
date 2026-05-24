---
sourceUrl: "https://www.palantir.com/docs/apollo/core/plans-and-constraints/"
canonicalUrl: "https://palantir.com/docs/apollo/core/plans-and-constraints/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7b3fca96b14b17479b1a2147d3b53e29c140fbf896618cca237ce2ceecd22904"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Plans and Constraints"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
![plans overview](/docs/resources/apollo/core/header_plans.png)

# Plans and Constraints

## Plans

Plans are how Apollo delivers instructions from the Hub to [agents](/docs/apollo/core/agents/) in managed Environments. Each Plan is a unit of work, such as a configuration change or a Release upgrade, and will only be sent to an agent for execution when all relevant [constraints](#constraints) have been satisfied.

Apollo supports the following Plan types:

* [Installing a new Entity](/docs/apollo/managing-entities/add-and-edit-entities/#adding-entities).
* Modifying the [config overrides](/docs/apollo/managing-entities/set-config-overrides/) of a managed Entity.
* Modifying the version and config overrides of an existing Apollo-managed Entity. See [General guidelines for how the Orchestration Engine decides which Plan to issue](#general-guidelines-for-how-the-orchestration-engine-decides-which-plan-to-issue) for more information about why Apollo will always apply relevant config overrides in lockstep with Release upgrades.
* [Uninstalling an Entity](/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities/).
* Creating, editing, and deleting [secrets](/docs/apollo/managing-secrets/add-edit-delete-secrets/).

Plans and constraints are surfaced in the **Activity** tab of the Environment or Entity. You can also view the history of Plans that an agent performed for a given Environment or Entity, each of which has a start, an end time, and a status.

![Plans](/docs/resources/apollo/core/plans-view-environment.png)

Apollo's Plan-based paradigm is different from other "control loop" systems. Rather than directly carrying out actions in the background without a human noticing, Apollo generates a Plan, and once all constraints are satisfied, the Plan is sent to an agent for execution. This Plan-based paradigm provides more transparency and visibility to users for ongoing, upcoming, and previous changes made in the Environment.

## Plan Lifecycle

![Plan Lifecycle](/docs/resources/apollo/core/plan-lifecycle.png)

### Orchestration Engine

The Orchestration Engine in every Hub Environment:

1. Continuously evaluates all the possible Plans for each Spoke.
2. Evaluates all the constraints associated with each of the possible Plans.
3. Issues Plans, whose constraints are satisfied, to the Spoke's agents for execution.

#### General guidelines for how the Orchestration Engine decides which Plan to issue

* Plans to roll off a recalled release or to execute break-glass commands are prioritized over other Plan types.
* Apollo will aim to bring the state of Entities to the latest possible state. For example, Apollo will issue a Plan to upgrade an Entity to the latest Release that passes all relevant constraints and change the Entity's configuration to the latest configuration override that matches the version. This allows performing upgrades in lockstep with their respective configuration. For more about configuration overrides for specific versions, see the documentation on [Managing Entities](/docs/apollo/managing-entities/set-config-overrides/).

When no Plan can be issued because there is no work to be done, Apollo will display its reasoning in the **Activity** tab of the Entity. This helps you understand why no work is being done and what actions you can take to unblock work if necessary.

![No work to be done](/docs/resources/apollo/core/activity-no-work.png)

### Agents

Agents in every Spoke Environment:

1. Continuously poll the orchestration engine for new Plans and report back the state of the Environment and its Entities.
2. Execute the change(s) required in the Spoke for every issued Plan
3. Report whether Plans succeeded or failed back to the orchestration engine.

### Viewing a Plan's status

You can track the progress of a Plan in the **Plans** tab of the Entity or Environment home page. Select a Plan to view its details, metadata, the status of each task in the Plan, and the Plan spec.

![Entity plan tasks](/docs/resources/apollo/core/plan-tasks.png)

For Plans that failed, you can view an error message for each task that failed. This enables you to identify the reason that the Plan failed and resolve any issues.

### Plan failures, suppressions, and rollbacks

When Plans fail, Apollo will automatically create an Entity-level [suppression window](#suppression-window-constraint), which will prevent further work on that Entity. Apollo will continue to issue new Plans for other Entities in the Environment. If the number of Entities in an Environment that are under automated suppression windows exceeds the [configured threshold](/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/#optional-override-the-required-number-of-auto-suppressed-entities-for-environment-level-auto-suppression), Apollo will automatically create an Environment-level suppression window as this may be indicative of a system-wide problem. An Environment-level suppression will prevent further work on all Entities in the Environment. Once the number of Entities under suppression windows returns to below the threshold, Apollo will automatically remove the Environment-level suppression.

:::callout{theme="neutral"}
After a Plan had failed and an automatic suppression window was applied, Apollo will permit a “rollback” Plan to restore the old state of the world despite the automatic suppression window. This does not apply if the suppression window was created by a human - Apollo will always respect these.
:::

## What causes Apollo to invalidate and consider a new Plan for an Entity

Apollo will request a new Plan for an [Entity](/docs/apollo/core/entities/) when one of the following happens:

* Changes to the [Reported State](/docs/apollo/core/entities/#reported-state) of the relevant Entity's dependents or dependencies are observed.
* Changes to the [Entity settings](/docs/apollo/core/entities/#entity-settings) for the Entity are observed. For example, the Release Channel the Entity is tracking was changed.
* Changes to the [config overrides](/docs/apollo/managing-entities/set-config-overrides/) or [secrets](/docs/apollo/managing-secrets/add-edit-delete-secrets/) for the Entity are observed.
* A Product Release is added to the Entity's configured Release Channel.
* A Product Release that is in Entity’s configured Release Channel is recalled.
* When an existing Plan has been blocked by constraints past the four hour threshold.

Plan invalidation due to changes to the Reported State of the Environment is based on the dependency graph of Entities in the Environment. Modifying an Entity creates new a Plan request for the Entity itself as well as its neighbors in the dependency graph, meaning its dependencies and dependents. Apollo requests Plans for an Entity’s dependencies and dependents because an Entity changing versions can change the versions to which its dependencies and dependents can upgrade due to [product dependency constraints](#product-dependencies-constraint).

Consider the following example dependency graph for Entities in an Environment:

![Plan Recomputation Example](/docs/resources/apollo/core/plan-recomputation-example.png)

Service A depends on Service B, which depends on Service C. For now, assume that these are the only dependencies that these services declare.

A modification to the Service C Entity would request a new Plan for Service C and Service B because it declares a dependency on Service C.

A modification to the Service B Entity would request a new Plan for Service C as a dependency, the Service B Entity itself, and Service A as a dependent Entity.

A modification to the Service A Entity would request a new Plan for Service B as a dependency and Service A itself.

## Constraints

Constraints are conditions that Plans must satisfy before they can be executed by an agent. Apollo evaluates constraints to ensure that agents only execute Plans when it is safe and acceptable to do so.

Apollo’s constraint solving engine automates the validation that a human would have to do before performing an upgrade; for example, at the time of code review in a GitOps model.

Constraints are surfaced in an Entity's **Activity** tab and help you understand why a Plan is blocked from starting, for example, when an upgrade is not happening. They also provide enough information so that you can take an action to unblock the Plan from being carried out by an agent. Constraints can always be bypassed for break-the-glass scenarios by issuing [commands](/docs/apollo/managing-entities/user-issued-commands/).

Some example constraints are listed below.

### Maintenance window constraint

[Environment editors](/docs/apollo/core/authorization/) can define time windows during which it is acceptable for Apollo to make changes to Entities in their Environment, that is, install, upgrade, or change configuration. These are called [Environment and Entity maintenance windows](/docs/apollo/managing-environments/environment-settings/#maintenance-and-suppression-windows). Product editors can define maintenance windows for their Products that determine when Apollo can [promote a Release to a Release Channel](/docs/apollo/core/release-channels/#release-promotion-pipeline-configuration). These are called [Product maintenance windows](/docs/apollo/managing-products/product-maintenance-window/). Maintenance window constraints block Plans from making changes outside of the defined time window.

When evaluating whether a Plan can be executed, Apollo calculates the [resolved maintenance window](/docs/apollo/managing-environments/environment-settings/#entity-resolved-maintenance-window) for the Entity and the type of operation being performed ([downtime or no-downtime](/docs/apollo/managing-environments/environment-settings/#maintenance-windows-no-downtime-vs-downtime)). If the current time is outside the resolved maintenance window, Apollo will block the Plan from being executed until the next maintenance window. You can wait for the next maintenance window, or [edit the schedule](/docs/apollo/managing-environments/environment-settings/#maintenance-and-suppression-windows) if you are an Environment editor. You can also request approval for a temporary [maintenance window override](/docs/apollo/managing-environments/create-maintenance-window-overrides/) to allow Plans to proceed outside the normal maintenance window.

![Maintenance window constraint](/docs/resources/apollo/core/maintenance-window-constraint.png)

#### How Apollo calculates an Entity's [resolved maintenance window](/docs/apollo/managing-environments/environment-settings/#entity-resolved-maintenance-window)

* If the [Product maintenance windows override](/docs/apollo/managing-environments/environment-settings/#optional-override-product-maintenance-windows) is not set, which is the default behavior:
  * If the operation is no-downtime, use the Product maintenance window.
  * If the operation requires downtime, use the intersection of the Product maintenance window and the Entity’s downtime window.
* If the [Product maintenance windows override](/docs/apollo/managing-environments/environment-settings/#optional-override-product-maintenance-windows) is set or no Product maintenance window is defined for the Product:
  * If the operation is no-downtime, use the Entity’s no-downtime window
  * If the operation requires downtime, use the Entity’s downtime window.

:::callout{theme="neutral"}
By default, Apollo will ignore [no-downtime maintenance windows](/docs/apollo/managing-environments/environment-settings/#maintenance-windows-no-downtime-vs-downtime) when rolling off a recalled Release. This is not true for roll-offs that require downtime where maintenance windows are respected. To override this behavior, set the [`require-maintenance-windows-for-no-downtime-recalled-release-roll-offs`](/docs/apollo/managing-environments/environment-settings/#optional-require-maintenance-windows-for-no-downtime-recalled-release-roll-offs) field to `true` in the Environment settings.
:::

### Product dependencies constraint

When publishing a Product Release to Apollo, you can include information about which other Products are required for proper functioning in the Product Release manifest under the [`product-dependencies`](/docs/apollo/apollo-product-specification/product-dependencies/) extension. Each Product dependency must specify a permitted version range.

```yaml
extensions:
  product-dependencies:
   - product-group: com.palantir.example
     product-name: example
     minimum-version: 1.0.0
     maximum-version: 1.x.x
   - product-group: com.palantir.other
     product-name: other
     minimum-version: 2.53.1
     maximum-version: 2.x.x
```

The Product Dependencies constraint ensures that Apollo will only execute a plan when:

1. None of these dependencies would be violated by the proposed plan.
2. All dependent Entities satisfy their version constraint with the target Product Release.

Defining Product dependencies allows you to safely roll out software across many Environments, without needing to manually validate each upgrade or coordinate releases with other teams.

![Product dependencies constraint](/docs/resources/apollo/core/product-dependencies-constraint.png)

You can override a Product dependency constraint for an Entity by adding ignored dependencies in the [Entity advanced settings](/docs/apollo/managing-entities/add-and-edit-entities/#advanced-settings). This is useful when some capabilities provided by the ignored dependency are not required and thus not deployed. Only use this option if you are aware of the exact impact the ignored dependency will have on the Product.

### Suppression window constraint

Suppression windows prevent Apollo from issuing Plans during the configured time and supersede maintenance windows. Suppression windows can be set for either an Entity or the whole Environment. Suppression windows can be created in three ways:

* Manually by users. Environment editors can set suppression windows for the whole Environment or for specific Entities, while Environment or Entity operators can set suppression windows only for Entities they have the role assigned to.
* Automatically when a Plan failed for an Entity. These suppression windows are ignored when Apollo tries to rollback a failed Plan.
* Automatically during [release promotion](/docs/apollo/core/release-channels/#release-channel-promotion). This is to avoid cases where newer releases continuously supersede previous releases, preventing a promotion from reaching the target soak time. These suppression windows are ignored when rolling off a [recalled release](/docs/apollo/recalling-releases/overview/).

![Suppression window constraint](/docs/resources/apollo/core/suppression-window-constraint.png)

:::callout{theme="neutral"}
Manual suppression windows should always be applied to an Entity before performing manual changes. Otherwise, Apollo could issue Plans that conflict with the changes and could cause unexpected behavior.
:::

:::callout{theme="neutral"}
Creating an Entity-level suppression window is the only supported way to cancel an active Plan.
:::

Learn more about managing [suppressions windows](/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/) for configuration and cancelling Plans.

### Artifacts missing constraint

To execute an install or upgrade Plan, the [Apollo Agent](/docs/apollo/core/agents/) must be able to pull the Release artifacts from the Artifact Registries assigned to the Environment. Apollo blocks the Plan if any artifacts are missing.

Every Product Release declares its required artifacts in the [manifest](/docs/apollo/apollo-product-specification/container-images/#specifying-container-images-in-the-manifest-extension). When computing a Plan, Apollo:

1. Determines which artifacts the Product Release requires based on its manifest.
2. Selects the appropriate registry for each artifact from the [Artifact Registries](/docs/apollo/managing-artifact-registries/assign-artifact-registry/) assigned to the Environment.
3. Probes each registry to check if the artifact exists. Apollo skips this check for registries where **Hub access** is not expected.

If any artifact is missing, Apollo blocks the Plan until the artifacts become available. To unblock the Plan, publish the missing artifacts to the Artifact Registry.

![Artifacts missing constraint](/docs/resources/apollo/core/artifacts-missing-constraint.png)

The constraint view organizes artifacts into three categories:

* **Unavailable**: Artifacts that Apollo could not find in the selected registry. This includes artifacts where the registry request failed.
* **Available**: Artifacts that exist and can be pulled.
* **Unchecked**: Artifacts that Apollo could not verify because no registry matched the artifact URI, or the registry is not accessible by the Apollo Hub. These artifacts do not block the Plan.

:::callout{theme="neutral"}
If Apollo reports an artifact as unavailable but the artifact exists in the registry, verify that the Apollo Hub can connect to the Artifact Registry. If the Apollo Hub cannot reach the registry, set
the **Hub access** setting on the Artifact Registry to **Hub access not expected** so that Apollo skips artifact availability checks for that registry.
:::
