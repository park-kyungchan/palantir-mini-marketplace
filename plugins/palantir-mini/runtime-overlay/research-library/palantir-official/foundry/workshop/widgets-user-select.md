---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-user-select/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-user-select/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "326740a4bdc99121f2d521daf33db8cbd57076fa4af6e105431e77682c7dfcb0"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Filtering widgets > User Select"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# User Select

Use the **User Select** widget for selection of user(s) through a single or multi-select dropdown menu.

\<img src=./media/widgets-user-select.png alt="User Select widget example" width=300>

## Configuration options

* **Label:** Set an optional label for the widget to display text above the dropdown menu.
* **Placeholder:** Set optional placeholder text to display in the widget’s empty selection state
* **Selected user(s):**
  * If the selection is set to ‘Single’, the widget will be displayed as a single-select dropdown menu.
    * **Output variable:** The output variable of the widget that stores the user’s selected option. If the selection is set to ‘Single’, the output variable will be a string variable containing the ID of the selected user.
    * **Allow clear:** Toggle to enable/disable clearing of the selected dropdown menu option.
  * If the selection is set to ‘Multiple’, the widget will display as a multi-select dropdown menu.
    * **Output variable:** The output variable of the widget that stores the user’s selected option(s). If the selection is set to ‘Multiple’, the output variable will be a string array variable containing the ID(s) of the selected user(s).
  * **Specify Multipass group IDs:** Provide a string array variable of group IDs to filter users displayed in the dropdown to users in the specified groups. Users must have the `View group membership` role on the organization for configured groups or else they will see a permission error, see [below](#multipass-group-ids-permission).

## Multipass group IDs permission

If multipass group IDs are provided, users need to have the `View group membership` permission on the group's Organization, or else they will see a permission error for this widget. This permission can be granted from **Settings > Platform Settings > Organizations** by selecting the Organization of interest and then choosing **Manage** for **Organization permissions**. Read more about [managing groups here](/docs/foundry/platform-security-management/manage-groups/).
