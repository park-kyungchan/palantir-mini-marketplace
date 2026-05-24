---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-labels/create-labels/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-labels/create-labels/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "077fd8b85ccff71a766121f212a5458690c1e4591680819e5243fbe59c818f2a"
product: "apollo"
docsArea: "managing-labels"
locale: "en"
upstreamTitle: "Documentation | Managing Labels > Create labels"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create labels

This section will walk through how to create a label. You can then apply that label to an Entity, Environment, Product Release, or Team.

To create a label, navigate to the **Labels** tab of the **Settings & Configuration** page, and select **+ Create Label** on the top right.

![The Create label button on the label settings page is highlighted.](/docs/resources/apollo/managing-labels/label-settings-page.png)

This will open a menu where you can create new labels.

In the **Details** tab you can configure the following fields:

* **Label ID**: A unique identifier that Apollo will use to reference the label. This cannot be changed later.
* **Description**: An explanation of how the label is going to be used in Apollo.
* **Suggested resource types**: The resource type that the label will be applied to. You can choose from `entity`, `environment`, and `team`, or enter another resource type like `product-release`.
* **Accepted values**: The possible values for the label. Enter a value, then select the option below to add the value.

<img src="./media/create-label-details.png" alt="The Details tab of the label creation menu." width=500>

Apollo manages permissions for labels using [role-based access control (RBAC)](/docs/apollo/core/authorization/). You can [configure RBAC for a label](/docs/apollo/core/authorization/#configure-rbac-for-a-single-label) in the **Permissions** tab.

<img src="./media/create-label-permissions.png" alt="The Permissions tab of the label creation menu" width=500>

Learn more about the [possible roles for labels](/docs/apollo/core/authorization/#roles-for-labels).
