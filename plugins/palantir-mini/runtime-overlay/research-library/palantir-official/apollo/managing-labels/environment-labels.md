---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-labels/environment-labels/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-labels/environment-labels/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e479bb7016f0e7bc37b6ca709a4c8d1a1b9de5e9999384c1f4fa6099523824fc"
product: "apollo"
docsArea: "managing-labels"
locale: "en"
upstreamTitle: "Documentation | Managing Labels > Environment labels"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Environment labels

[Environment editors](/docs/apollo/core/authorization/) can use labels to describe details for an Environment in Apollo, such as the type of infrastructure or the sector in which the Environment is located. For example, you can have a label with the ID `infra` and the possible values `aws`, `azure`, `on-prem`, and more.

## Apply labels to Environments

To apply labels to an Environment, navigate to the Environment home page. Select **Edit labels...** from the **Actions** dropdown menu.

<img src="./media/add-labels-dropdown.png" alt="The Actions dropdown menu is expanded and the Edit labels option is highlighted." width="300" />

This will open a dialog where you can apply and edit labels for an Environment. Select the key-value pair for the label that you want to apply, or enter a label ID in the search bar. You can only select one value for a given label ID, so you can apply multiple labels as long as they have different label IDs.

<img src="./media/apply-labels.png" alt="Two labels are selected to apply to an Environment. These labels describe the infrastructure and the sector of the Environment." width="600" />

In the **Applied labels** section, you can edit labels that have already been applied to the Environment. Select the pencil icon on the right of the label, and then choose a different label value to apply. To delete a label, select the trash can icon on the right of the label.

<img src="./media/environment-edit-labels.png" alt="The option to edit labels is expanded, showing the possible values that you can choose for a given label ID." width="500" />

When you are finished, select **Apply** to save your changes.

## Filter Environments using labels

You can use labels to filter the list of Environments based on specific properties. Navigate to the Environment list by selecting **Environments** from the left menu panel. Then select the **Add filter** dropdown and choose **label**.

![The Add filter dropdown is expanded for the Environment list and the label option is highlighted.](/docs/resources/apollo/managing-labels/add-label-filter.png)

Select the label(s) that you want to use as filters.

<img src="./media/label-filter-list.png" alt="Selecting the label option will display the labels for Environments that you can use as filters." width="300" />

For example, to view only internal Environments with AWS infrastructure you can select the `infra:aws` and `sector:internal` labels.

![Two filters have been applied and the two resulting Environments are displayed.](/docs/resources/apollo/managing-labels/label-filter-results.png)
