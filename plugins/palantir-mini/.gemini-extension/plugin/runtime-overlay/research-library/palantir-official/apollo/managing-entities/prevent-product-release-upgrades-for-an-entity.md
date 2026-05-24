---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-entities/prevent-product-release-upgrades-for-an-entity/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-entities/prevent-product-release-upgrades-for-an-entity/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3494372cb01a7f3fdf302414618da18ddd207b2aa0a484aa9fc87870f1b81d0a"
product: "apollo"
docsArea: "managing-entities"
locale: "en"
upstreamTitle: "Documentation | Managing Entities > Prevent Product Release upgrades for an Entity"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Prevent Product Release upgrades for an Entity

In some cases, you may want to “freeze” upgrades for one or more Entities, or have better control over which Releases it upgrades to. For example, when testing a Release Candidate, you do not want Apollo to automatically upgrade Entities off the Release Candidate.

To prevent automated upgrades:

1. [Create a new custom Release Channel](/docs/apollo/managing-release-channels/create-custom-release-channel/) that is not part of the Product’s promotion pipeline.
2. [Configure Entities to follow the new Release Channel](/docs/apollo/managing-environments/environment-settings/#set-default-release-channel), which will prevent further upgrades until a new Release is manually added to the new Release Channel.

:::callout{theme="warning"}
You can also prevent unwanted upgrades by [issuing a command](/docs/apollo/managing-entities/user-issued-commands/) to install the specific Release and creating a [suppression window](/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/) to prevent Apollo from changing the Entity's running version. However, this approach has three drawbacks:

1. When executing commands, Apollo ignores [Product dependencies](/docs/apollo/core/plans-and-constraints/#product-dependencies-constraint). Therefore, this method should be used only when you are certain it will not cause any issues.
2. Suppression windows can expire or be accidentally removed, allowing Apollo to upgrade the Entity.
3. A suppression window will also block other changes to the Entity. For example, new config overrides will not be applied.
:::

## Create a custom Release Channel

You can [create a new Release Channel](/docs/apollo/managing-release-channels/create-custom-release-channel/), for example, `FREEZE_VERSIONS_FOR_DEMO`, by navigating to the **Release channels** tab of the **Settings & Configuration** page and selecting **Create release channel**. You can also use an existing custom Release Channel.

![Create Release Channel](/docs/resources/apollo/managing-entities/create-release-channel.png)

## Configure Entities to follow the new Release Channel

For each Entity you want to prevent Release upgrades on, you can edit the Entity settings to track the dedicated Release Channel you created. Navigate to the **Settings** tab of the Environment page, and then select **Edit settings manually**.

![Edit settings](/docs/resources/apollo/managing-entities/edit-settings-manually.png)

Select **Edit** to begin editing the Environment settings. Then, for each relevant Entity, change the value of the `release-channel` field to the Release Channel that you created. In this example, you would add  `release-channel: FREEZE_VERSIONS_FOR_DEMO` to the Entity’s configuration overrides.

![How to change release channel](/docs/resources/apollo/managing-entities/how-to-change-release-channel-for-entity.png)

When done, select **Review** to review your changes. Then select **Submit** to submit a [change request](/docs/apollo/managing-changes/change-requests/) to update the Environment settings.

:::callout{theme="warning"}
When you are ready for the Entity to resume automatic upgrades, you can [edit the Environment settings](/docs/apollo/managing-environments/environment-settings/#set-default-release-channel) to change back the Release Channel the Entity is subscribed to.
:::

While subscribed to the custom Release Channel, Apollo will continue issuing Plans for the Entity and upgrade it to other Releases which are added to the custom Release Channel. This can be done either [manually](/docs/apollo/managing-release-channels/manual-promotion/) or through automated promotion. Apollo will also adhere to recalls as usual.

:::callout{theme="warning"}
If the Entity is running a [recalled Release](/docs/apollo/recalling-releases/overview/) and there is no Release that satisfies the [roll-off strategy](/docs/apollo/recalling-releases/roll-off-strategies/) in the subscribed Release Channel, the Entity will remain on the recalled Release until a suitable Release is added to the Release Channel.
:::
