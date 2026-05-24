---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-products/ramped-rollouts/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-products/ramped-rollouts/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "89761f661fdd21d32be2d0bc1bb1734e1f1441d5d96081fe9a4acd7270ae7a17"
product: "apollo"
docsArea: "managing-products"
locale: "en"
upstreamTitle: "Documentation | Managing Products > Ramped rollouts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ramped rollouts

A ramped rollout is a rate-limiting mechanism that staggers Product upgrades within a Release Channel across a fleet of Entities. This reduces the risk of widespread incidents and enables earlier detection of issues. When a new Release is promoted to a Release Channel, ramped rollouts prevent all Entities from upgrading simultaneously. Instead, upgrades are distributed gradually over a configured time window.

Without ramped rollouts, all Entities on a channel can upgrade at once when a Release is promoted. If issues were not caught in earlier testing stages, this could quickly impact a large portion of the fleet, causing major incidents. Ramped rollouts mitigate this risk by ensuring upgrades happen gradually.

![Diagram showing installation behavior without ramped rollouts (all entities upgrading simultaneously) vs with ramped rollouts (entities upgrading gradually over time).](/docs/resources/apollo/managing-products/ramped-rollout-stagger.svg)

Ramped rollouts *only* apply to upgrade Plans. They do *not* affect:

* Rollbacks
* Installs
* Uninstalls
* Recall roll-offs
* Configuration changes
* Commands

## Configuring rollout windows

You can configure rollout windows in the Product upgrade settings. Navigate to **Edit product settings** from the **Actions** dropdown on the Product home page, then select the **Upgrades** tab.

![You can define the rollout window in the Ramped rollout section of the Upgrades form.](/docs/resources/apollo/managing-products/edit-product-settings-ramped-rollout.png)

For each Release Channel, you can define a **rollout window**. This is the time period over which upgrades should be distributed. For example, setting a three hour rollout window for the `STABLE_2` channel means upgrades will be spread out over approximately three hours. The actual rollout duration may vary based on the [agent](/docs/apollo/core/agents/) and maintenance window constraints. Rollouts pause during maintenance window closures and resume when the window reopens.

:::callout{theme="neutral"}
Ramped rollout configuration is exported and imported with Product Bundles. Imported configurations will overwrite any manual changes made in the target Environment.
:::

## How ramped rollouts work

When a new Release is promoted to a Release Channel with a ramped rollout configured, upgrades are rate-limited over the configured time window. Entities are upgraded on a first-come, first-served basis in a non-deterministic order.

When an upgrade is blocked by the rate limit, the Entity's **Activity** tab displays a [constraint](/docs/apollo/core/plans-and-constraints/#constraints). The Entity will upgrade once the rate limit allows.

![Screenshot of Entity Activity tab showing a ramped rollout constraint.](/docs/resources/apollo/managing-products/ramped-rollout-constraint.png)

:::callout{theme="warning"}
There is no specific upgrade time for any individual Entity during a ramped rollout, Apollo only ensures that upgrades are distributed across the time window.
To bypass the ramped rollout and force a specific Entity to upgrade immediately, you can issue a [command](/docs/apollo/managing-entities/user-issued-commands/#enforce-config-and-version).
This command is safe to issue if the upgrade is *only* blocked by the ramped rollout constraint.
:::

You can track the progress of an active ramped rollout in the promotion pipeline. The Release page displays the percentage of Entities that have started upgrading.

![Screenshot of promotion pipeline card showing ramped rollout status with progress indicator.](/docs/resources/apollo/managing-products/ramped-rollout-release-status.png)

## Modifying ramped rollout configuration during an active rollout

You can enable or disable ramped rollouts while a rollout is already in progress, and the change will take effect immediately:

* **Disabling ramped rollouts** (removing the time window for the channel) will immediately remove the rate-limiting constraint, allowing all remaining Entities to upgrade without delay.
* **Enabling ramped rollouts** (adding a time window for the channel) will immediately apply the rate-limiting constraint to any Entities that have not yet upgraded.

:::callout{theme="neutral"}
Changing the rollout window duration during an active rollout does *not* affect that rollout. The rollout will complete using the original window duration. The updated duration applies to subsequent releases.
:::

## Considerations for canary stages and Hub configuration

**[Canary](/docs/apollo/managing-release-channels/configure-promotion-pipeline/#canary-promotion-stage) Entities:** Ramped rollouts treat all Entities on a Release Channel equally. Canary Entities designated in your promotion pipeline are not prioritized. They may upgrade at any point during the rollout window due to non-deterministic ordering. This means canaries could potentially be upgraded last. This could delay the promotion of the release to the next stage. When configuring your rollout window, consider how this might affect your promotion pipeline timing.

**Hub-specific behavior:** Each Apollo Hub calculates ramped rollout rates independently based on the number of Entities connected to that Hub. Even with the same configured rollout window, different Hubs will experience different upgrade pacing depending on their fleet size.

## Best practices for ramped rollouts

When choosing a rollout window duration, consider:

* **Fleet size:** Larger fleets benefit from longer windows to ensure gradual rollout. Smaller fleets may use shorter windows.
* **Risk tolerance:** Higher-risk changes warrant longer windows to provide more time to detect and respond to issues.
* **Maintenance windows:** Ensure your ramped rollout window fits comfortably within your [Product maintenance windows](/docs/apollo/managing-products/product-maintenance-window/). If the rollout window extends beyond the maintenance window, upgrades will pause until the next maintenance window opens.
* **[Promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/) timing:** Account for ramped rollout duration when planning canary stage soak times and overall promotion timelines.
