---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-release-channels/manual-promotion/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-release-channels/manual-promotion/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5d0ac2fe26b75bd4aaac13979219995f4e216422a6913b0724d35b20e9e471d5"
product: "apollo"
docsArea: "managing-release-channels"
locale: "en"
upstreamTitle: "Documentation | Managing Release Channels > Manual promotion"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manual promotion

In certain cases [Contributors and Restricted Contributors](/docs/apollo/core/authorization/#roles-for-release-channels) need to manually add a [Release](/docs/apollo/core/products-releases-versions/#product-releases) to a Release Channel. For example, a Release that requires validation through manual QA testing cannot be automatically promoted. It can also be necessary as a break-glass mechanism to fast track Release promotion in cases where an urgent bug fix is required.

In this section we will consider version 14.3.8 of a Product that has already been published to Apollo.

## Prerequisites

### Publish a Release to Apollo

Before manually promoting a Release, you need to publish the Release to Apollo.

Learn more about [publishing Releases to Apollo](/docs/apollo/apollo-cli/apollo-cli_product-release_create/).

### Ensure label requirements are satisfied

Apollo enforces [label requirements](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) for manual promotion in addition to automatic promotion. You cannot manually promote a Release to a Release Channel if it does not satisfy the Release Channel's label requirements.

Learn more about how to [add labels to a Release](/docs/apollo/managing-labels/product-release-labels/).

### Configure a Release promotion pipeline (Optional)

We recommend that you set up a [Release promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/) before manually promoting a Release.

## Enter the manual promotion workflow

To manually promote a Release, you can select the **Promote release to channel** option from the **Actions** dropdown menu in the Product Release overview.

<img alt="Use the Actions dropdown menu to select the Add to release channel option to manually promote a Product Release." src="./media/manual-promotion-dropdown.png" width="300" />

You can also hover over a [Release Channel node](/docs/apollo/managing-products/tracking-product-releases/#release-channel-nodes) [Release promotion pipeline graph](/docs/apollo/managing-products/tracking-product-releases/#promotion-pipeline) and select **Manually promote to this channel**.

<img alt="You can manually promote a Product Release that is being evaluated for promotion by hovering over the Release Channel node and selecting Manually promote to this channel." src="./media/manual-promotion-hover.png" width="300" />

The third way to enter the manual promotion workflow is by navigating to the **Releases** tab of the Product overview page. Select the fast-forward icon on the right of the Release's row in the list of Releases.

<img alt="The fast-forward icon is highlighted in a row of the Product Release list. This is an entry point to the manual promotion workflow." src="./media/enter-manual-promotion-product-list.png" width="1000" />

## Define the manual promotion strategy

Once you enter the manual promotion page, you can view your configured promotion pipeline and define the Release Channels that will be manually promoted to the selected Release.

![The manual promotion page displays six Release Channels in the promotion pipeline and three Release Channels that have version 14.3.8 that are not in the pipeline.](/docs/resources/apollo/managing-release-channels/manual-promotion-menu.png)

### Copy an existing release

This promotion strategy allows you to add a Release to all the Release Channels that have a different Release. Select this option and then choose the Release to copy using the **Target release to follow** dropdown.

For example, we can use this option to promote version 14.3.8 to all the Release Channels that have version 14.3.7.

![The Release Channels that have version 14.3.7 are highlighted. These will be manually promoted to version 14.3.8.](/docs/resources/apollo/managing-release-channels/copy-existing-release.png)

### Fast track to channel

You can use this promotion strategy to promote a Release up to a specific Release Channel on the promotion pipeline. This is useful in cases where it is necessary to urgently add a Release to a Release Channel toward the end of the pipeline. Select this option and then use the **Target release channel** selection to define the Release Channel in the pipeline to which you want to fast track promotion.

In our example, we can use this option to promote version 14.3.8 all the way up to the `STABLE_3` Release Channel. All of the highlighted Release Channels will be promoted.

![You can fast track a Release to a Release Channel that is further in the promotion pipeline. All of the Release Channels along the way to the target will also be promoted.](/docs/resources/apollo/managing-release-channels/promote-up-to.png)

### All release channels

Use this promotion strategy to promote a Release to all the Release Channels in the promotion pipeline that do not already have the selected Release.

In our example we will promote version 14.3.8 to every Release Channel in the pipeline.

![All Release Channels are highlighted, since they will all be promoted with the All pipeline channels strategy.](/docs/resources/apollo/managing-release-channels/all-release-channels.png)

### Custom channels

This promotion strategy allows you to choose any Release Channels to manually promote, as long as [label requirements](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) are satisfied. You can select Release Channels that are not in the configured promotion pipeline as well as Releases Channels that are in the pipeline. Select this option and then search for one or more Release Channels that you want to promote in the **Target release channels** search bar.

In this example, we want to add version 14.3.8 to `PRE_STABLE`, which is in the promotion pipeline, and to `ANOTHER_CHANNEL` and `PILOT`, which are not in the pipeline.

![The PRE\_STABLE, ANOTHER\_CHANNEL, and PILOT Release Channels are highlighted since these have been defined as the custom Release Channels to manually promote to version 14.3.8.](/docs/resources/apollo/managing-release-channels/custom-channels.png)

## Review manual promotion

Once you have configured the promotion strategy, select **Next**. The next step is confirming that the Release satisfies the label requirements for the target Release Channel(s), entering a reason for the manual promotion, and reviewing the number of [Entities](/docs/apollo/core/entities/) that will be impacted by the manual promotion.

:::callout{theme="neutral"}
Apollo will consider upgrading Entities that are running an older version than the selected Release. For example, when we manually promote a Release with version 14.3.8, only Entities that are running versions below 14.3.8 can be upgraded when all constraints are satisfied.
:::

![After selecting a manual promotion strategy and target Release Channel(s), a sidebar will display the label requirements and the number of Entities affected, as well as prompt you to enter a reason for manual promotion.](/docs/resources/apollo/managing-release-channels/review-manual-promotion.png)

You can also view a summary of the label requirements for selected Release Channels that are missing or mismatched.

<img alt="Version 14.3.8 does not satisfy three label requirements for Release Channels that have been selected for manual promotion." src="./media/label-requirements-impact.png" width="400" />

When you are finished, select **Promote release**.

On the promotion pipeline you can hover over the transition node before the selected target Release Channel to view the status of the manual promotion.

<img alt="After a manual promotion the transition node leading to target Release Channel will display a status message stating that a manual promotion occurred." src="./media/manual-promotion-transition-node.png" width="300" />

## Resume promotion evaluation

If there are Release Channels in the pipeline that were not promoted manually, Apollo will proceed with [promotion evaluation](/docs/apollo/managing-products/tracking-product-releases/) if all constraints are satisfied.

In the example below, after the manual promotion is complete Apollo will evaluate version 14.3.8 for promotion to `STABLE_7` if the Release satisfies the label requirements, health criteria, and maintenance windows for `STABLE_7`.

![A pipeline that has some Release Channels highlighted. Apollo will evaluate promoting the Release to the unhighlighted Release Channels.](/docs/resources/apollo/managing-release-channels/continue-promotion-evaluation.png)
