---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-labels/entity-labels/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-labels/entity-labels/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "744d6fc36d8c088dfc58458e768e4a05878681ac2561cb330a3811f690967306"
product: "apollo"
docsArea: "managing-labels"
locale: "en"
upstreamTitle: "Documentation | Managing Labels > Entity labels"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Entity labels

Labels allow you to tag Entities with relevant information, such as the Entity's component in your application. For example, you can create a label with the ID `module` and the possible values `control-plane`, `observability`, `storage`, and more.

## Apply labels to Entities

To apply a label to an Entity, navigate to the Entity's overview page. Then select **Edit labels...** from the **Actions** dropdown menu.

<img src="./media/label-dropdown-option.png" alt="The Actions dropdown menu is expanded to display the Edit labels option." width="300" />

This will open a dialog where you can apply and edit labels for Entities.

<img src="./media/entity-label-dialog.png" alt="The Edit labels dialog displays the possible labels that you can apply, as well as the labels that have already been applied to an Entity." width="600" />

To apply a label to an Entity, select the label ID and value that you want to apply. You can also enter a label ID in the search bar.

<img src="./media/apply-label.png" alt="A key-value pair is selected to apply to the Entity. It is displayed under the Applied labels section." width="600" />

Under the **Applied labels** section of the **Edit labels** dialog, you can view the labels that have been applied to an Entity. To edit labels, select the pencil icon on the right of a label. You can then choose another value to apply that corresponds with the same label ID. To remove labels, select the trash can icon on the right of a label.

<img src="./media/entity-labels.png" alt="The options to edit a label are expanded. Apollo will display all possible label values that correspond with the selected label ID." width="500" />

When you are finished, select **Apply** to save your changes.

### Bulk apply labels to Entities

You can apply labels to multiple Entities at once from the **Entities** tab of the Environment overview page. For each Entity that you want to apply labels to, select the check box on the left of the Entity's name. Then select **Apply labels** from the **Actions** dropdown on the top of the Entity list.

![Three Entities are selected to have labels bulk applied to them.](/docs/resources/apollo/managing-labels/bulk-add-labels.png)

This will open a dialog for bulk applying labels. Choose the label you want to apply to the selected Entities, then select **Apply**.

<img src="./media/bulk-apply-labels.png" alt="A label key-value pair is selected to bulk apply to Entities." width="600" />

## Filter Entities using labels

You can use Entity labels to filter the list of Entities to only show those with specific properties. First, select the label ID from the **Label Ids** section of the left sidebar. The **Label Values** section will appear in the sidebar and contains the values that correspond with the selected label ID. Choose a label value to view Entities that have the selected key-value pair.

For example, to view Entities that are associated with observability, you can select the `module` label ID, then choose the `observability` label value.

![The module label ID and observability label value are selected. There are four Entities displayed that have this key-value pair.](/docs/resources/apollo/managing-labels/filter-entities.png)
