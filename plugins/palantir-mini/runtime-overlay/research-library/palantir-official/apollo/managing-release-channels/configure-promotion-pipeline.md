---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-release-channels/configure-promotion-pipeline/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-release-channels/configure-promotion-pipeline/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4cc647d6f46aa89c1072df1b73663801c342ef03d604cdfccf6459c5e8f3a99f"
product: "apollo"
docsArea: "managing-release-channels"
locale: "en"
upstreamTitle: "Documentation | Managing Release Channels > Configure a Release promotion pipeline"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure a Release promotion pipeline

This page will walk through how to set up a Release promotion pipeline to begin managing Product upgrades in Apollo.

## Prerequisites

Before configuring the Release promotion pipeline, you should [create any custom Release Channels](/docs/apollo/managing-release-channels/create-custom-release-channel/) that you would like to include in your promotion pipeline.

## Define rollout criteria

You can define requirements for promotion by selecting **Edit product settings** from the **Actions** dropdown on the Product home page.

![The Actions dropdown is expanded and the Edit product settings option is highlighted.](/docs/resources/apollo/managing-release-channels/edit-product-settings.png)

<img alt="You can define the healthy and unhealthy thresholds in the Rollout criteria section of the Upgrades form." src="./media/product-upgrade-settings.png" width="600" />

Navigate to the **Upgrades** tab to specify [health requirements](#health-requirements-for-release-promotion), [rollout pacing](/docs/apollo/managing-products/ramped-rollouts/), and [maintenance windows](/docs/apollo/managing-products/product-maintenance-window/).

### Health requirements for Release promotion

:::callout{theme="warning"}
For the unhealthy threshold to be relevant for promotion and automatic recall, your Helm chart must [produce health](/docs/apollo/apollo-product-specification/health/). For Entities not producing health, Apollo will consider only liveness and the promotion will be time based only. This means that the promotion time periods where all pods are live will be considered "healthy", and other periods will be considered neither "healthy" nor "unhealthy". As a consequence, promotion can succeed or continue evaluating without health but never fail.
:::

Apollo computes two durations during promotion evaluation:

* **Healthy duration:** The amount of time that a promotion is considered healthy. A time period is considered healthy when all the nodes are live and their health states are either `HEALTHY` or `DEFERRING`.
* **Unhealthy duration:** The amount of time that a promotion is considered unhealthy. A time period is considered unhealthy when at least one of the live nodes has an `ERROR` health state.

:::callout{theme="neutral"}
Note:

* `WARNING`, `REPAIRING`, `SUSPENDED`, and `TERMINAL` health states do not contribute to either the healthy or unhealthy duration. This means that the total duration healthy plus unhealthy duration might be lower than the total soak time.
* The duration for both healthy and unhealthy periods does not include weekends.
:::

You can define two threshold values based on the healthy and unhealthy durations. The values for these thresholds must be between zero and one.

* **Healthy threshold:** The minimum percentage of time that an Entity must be healthy for Apollo to consider a rollout successful. The default value for this threshold is 0.95.
* **Unhealthy threshold:** The maximum percentage of time that an Entity can be unhealthy for Apollo to consider a rollout unsuccessful or as having problems that must be addressed before further roll out. The default value for this threshold is 0.05.

## Configure a promotion pipeline

To configure a promotion pipeline, navigate to the **Releases** tab of the Product home page and select **Edit** from the **Promotion pipeline** box.

![The Edit button in the Promotion pipeline box is highlighted.](/docs/resources/apollo/managing-release-channels/edit-promotion-pipeline.png)

You can also select **Edit promotion pipeline** from the **Actions** dropdown.

![The Actions dropdown is expanded and the Edit promotion pipeline option is highlighted.](/docs/resources/apollo/managing-release-channels/edit-promotion-pipeline-actions-dropdown.png)

This will open the promotion pipeline configuration window.

![The promotion pipeline configuration window.](/docs/resources/apollo/managing-release-channels/edit-promotion-pipeline-window.png)

A **promotion stage** refers to the transition between two Release Channels. Select **Add stage** to add a pipeline stage and the cross to the right of a stage to remove a promotion stage.

For each promotion stage you will define the following Release Channels:

* **Source channel:** The Release Channel that Apollo will promote the Release from.
* **Target channel:** The Release Channel that Apollo will promote the Release to. This can be any Release Channel that has been created in Apollo, but not the default Release Channels (`RELEASE`, `RELEASE_CANDIDATE`, and `DEV`).

Two types of promotion are available:

* [**Timed promotion:**](#timed-promotion-stage) The Release is promoted to the target channel after a defined period of time.
* [**Canary promotion:**](#canary-promotion-stage) The Release is promoted to the target channel based on criteria evaluated on a chosen set of test Environments.

:::callout{theme="neutral"}
In addition to satisfying the promotion requirements specified by each stage, the Release will only be promoted during the [Product's maintenance window](/docs/apollo/managing-products/product-maintenance-window/).
:::

Changes to a Product's promotion pipeline take effect at the next evaluation, which happens every minute.

### Timed promotion stage

When you select **Timed promotion**, Apollo will use time-based promotion evaluation. You can define the following parameters for time-based promotion:

* **Duration:** The amount of time that a Release must spend on the source Release Channel before being promoted to the target Release Channel. The duration can be set to any value between *0 seconds* and *31 days*.
* **Product Release label requirements:** Promote only if the Release satisfies the label requirements.
  * The label must be present on the Release with one of the specified values.

![The configuration form a time-based promotion stage.](/docs/resources/apollo/managing-release-channels/time-based-promotion-stage.png)

### Canary promotion stage

When you select **Canary promotion**, Apollo will use canary-based promotion evaluation. During canary-based promotion evaluation, Apollo will select test Environments using configured [**Entity filters**](#entity-filters). It will evaluate the Release on these test Environment based on the [**conditions**](#conditions) that you define. The Release is promoted to the target Release Channel when all conditions are satisfied.

![The configuration for a canary-based promotion stage.](/docs/resources/apollo/managing-release-channels/dynamic-promotion-stage.png)

#### Entity filters

**Entity filters** define the pool of Entities from which Apollo will choose test Environments. The available filters are:

* **Environments with Label:** Choose Entities on Environments with the specified label.
  * The label must be present on the Environment.
  * If no label values are specified, Apollo will check for the existence of the label on the Environment.
  * If label values are specified, Apollo will check for the existence of the label and its value on the Environment.
* **Environments without Label:** Choose Entities on Environments without the specified label.
  * The label must be absent on the Environment.
  * If no label values are specified, Apollo will check for the absence of the label on the Environment.
  * If label values are specified, Apollo will check for the absence of the label and its value on the Environment.
* **Choose Environments:** Choose Entities from a discrete set of environments.
* **Exclude Environments:** Choose Entities that are not in the discrete set of environments.

#### Conditions

**Conditions** define the requirements that Releases must satisfy before being promoted to the target Release Channel.

* **Promote when healthy:** Promote the Release once the specified number of Entities have soaked for at least the specified duration and satisfy the [healthy threshold](#health-requirements-for-release-promotion) from the rollout criteria defined in the **Upgrades** tab.
  * The number of Entities can be defined as a count or as a percentage of the selected Entities.
  * The duration can be set to any duration between *0 seconds* and *13 days*.
* **Recall when unhealthy:** Recall the Release if the specified number of Entities have soaked for at least the specified duration and satisfy the [unhealthy threshold](#health-requirements-for-release-promotion) from the rollout criteria defined in the **Upgrades** tab.
  * The number of Entities can be defined as a count or as a percentage of the selected Entities.
  * The duration can be set to any duration between *0 seconds* and *13 days*.
* **Minimum entity count:** Promote only if the number of selected Entities is above the specified count.
* **Require Product Release label:** Promote only if the Release satisfies the label requirement.
  * The label must be present on the Release.
  * If no label values are specified, Apollo will check for the existence of the label on the Release.
  * If label values are specified, Apollo will check for the existence of the label and its value on the Release.

Select **Confirm** when you are finished editing the promotion pipeline.

## Explore the Release promotion pipeline

You can view the Release promotion pipeline that you configured on the Product overview page.

![View the Release promotion pipeline that all Product Releases will follow on the Product overview page.](/docs/resources/apollo/managing-release-channels/release-promotion-pipeline.png)

In the example above, all Releases of the `helm-chart-operator` Product will follow this promotion pipeline once they are published.

You can also view a Release promotion pipeline graph for each Product release by selecting a Release from the **Releases** tab of the Product overview page. This graph includes details on the promotion evaluation status and promotion results at each pipeline stage.

![View the Release promotion evaluation status and results on the release page.](/docs/resources/apollo/managing-release-channels/promotion-summary.png)

:::callout{theme="neutral"}
If you do not have any Releases of your Product yet, you can [publish an initial Product Release to Apollo](/docs/apollo/apollo-cli/apollo-cli_product-release_create/).
:::

Learn more about [tracking Product Releases](/docs/apollo/managing-products/tracking-product-releases/).
