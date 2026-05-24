---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-release-channels/create-custom-release-channel/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-release-channels/create-custom-release-channel/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3976f0945506fbff67a281646df094e7a0dd8fd29913aae89ea9ac351ba38045"
product: "apollo"
docsArea: "managing-release-channels"
locale: "en"
upstreamTitle: "Documentation | Managing Release Channels > Create a custom Release Channel"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a custom Release Channel

In addition to the [default Release Channels](/docs/apollo/core/release-channels/#default-release-channel-promotion) in Apollo, you can optionally create custom Release Channels for more flexibility and control over Product rollout.

To create a custom Release Channel, navigate to the **Release channels** tab on the **Settings & Configuration** page. Select **Create release channel**.

![Create a custom Release Channel by selecting the Create release channel button.](/docs/resources/apollo/managing-release-channels/create-release-channel.png)

A dialog will open to input information about the Release Channel such as a name and description.

## Label requirements

The **Requirements** tab defines [label requirements](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) for Release Channels.

Learn more about [how to apply labels to Product Releases](/docs/apollo/managing-labels/product-release-labels/#apply-labels-to-product-releases).

:::callout{theme="neutral"}
Apollo enforces [label requirements](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) for both automatic and [manual promotion](/docs/apollo/managing-release-channels/manual-promotion/) to a Release Channel.
:::

To add a label requirement, select **Add label requirement** and select a label ID. You can optionally toggle on **Require value** to enforce a label ID and value pair and then enter a required value.

<img alt="Add label requirements for a new Release Channel." src="./media/label-requirements.png" width="500" />

Label requirements are enforced only at admission time to the Release Channel, meaning that a Product Release will not be removed from a Release Channel if its labels change.

:::callout{theme="neutral"}
Built-in Release Channels (RELEASE, RELEASE\_CANDIDATE, DEV) do not support label requirements because Releases are automatically added to these channels based on their version type.
:::

## Release Channel permissions

Apollo manages Release Channel permissions using [role-based access control (RBAC)](/docs/apollo/core/authorization/).

Learn more about the different [roles for Release Channels](/docs/apollo/core/authorization/#roles-for-release-channels) and how to [assign roles for a Release Channel](/docs/apollo/core/authorization/#configure-rbac-for-a-single-release-channel).
