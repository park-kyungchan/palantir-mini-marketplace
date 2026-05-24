---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/create-maintenance-window-overrides/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/create-maintenance-window-overrides/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d8e195de0c459f0c61356b2bf2962a7309ee8105d5cc8b625a00afd3d151dd35"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Create maintenance window overrides"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create maintenance window overrides

Maintenance window overrides in Apollo provide the flexibility to issue Plans outside of the regular maintenance windows for Environments or specific Entities. This is useful for handling urgent changes or exceptional circumstances that require immediate action. Overrides can be applied at the Environment level or Entity level.

You can view maintenance window overrides for an Environment or Entity by navigating to the **Settings** tab for the Environment and selecting **Maintenance and Suppressions**.

<img alt="Maintenance window overrides" src="./media/maintenance-overrides-environment-settings.png" width=800>

You can view maintenance window overrides for a specific Entity by navigating to the Entity page and selecting **Overrides and Suppressions** from the **Activity** tab.

<img alt="Entity maintenance window overrides" src="./media/entity-maintenance-override.png" width=800>

After you create a maintenance window override for an Environment or Entity, banners at the top of the Environment page and the Entity pages will display the active maintenance window overrides for the Environment or Entity. The banner includes a popover that you can select to view details about active maintenance window overrides. The popover also includes an action to [remove each maintenance window override](#remove-a-maintenance-window-override).

<img alt="Maintenance window details in banner." src="./media/maintenance-details-banner.png" width=800>

## Create Environment-level maintenance window overrides

[Environment editors](/docs/apollo/core/authorization/) can create Environment-level maintenance window overrides. To create a maintenance window override, navigate to the Environment **Settings** tab and select **Create maintenance override** from the dropdown.

<img alt="Create maintenance window override" src="./media/create-maintenance-override.png" width=800>

This will open the maintenance window override creation form.

<img alt="Maintenance window override form" src="./media/maintenance-override-form.png" width=600>

First, you will specify the [type of maintenance window override](/docs/apollo/managing-environments/environment-settings/#maintenance-windows-no-downtime-vs-downtime):

* **No downtime required:** Select for changes that will not require visible downtime for users.
* **Downtime required:** Select for changes that will require visible downtime for users.

Next, you will define the time range for the override. You can select a specific time range or a relative time range.

Last, you will specify the reason for the override. This will be visible to other users and operators.

## Create Entity-level maintenance window overrides

Any user with access to the Environment can submit a change request for a temporary Entity-level maintenance window. Approvers for such change requests depend on the type of maintenance window:

* Downtime maintenance windows: Only Environment editors can approve.
* No-downtime maintenance windows: Environment operators can approve.

You can create a temporary Entity-level maintenance window by navigating to the Entity home page and selecting **Create maintenance override** from the **Actions** dropdown.

This will open the maintenance window override creation form. Configuring the maintenance window override from here is identical to Environment-level maintenance windows.

## Remove a maintenance window override

To remove any maintenance window override, navigate to the **Maintenance Overrides** table for the Environment or Entity and select the delete icon to the right of the maintenance window override.

<img alt="Remove maintenance window override." src="./media/remove-maintenance-window-override.png" width=800>

Note that removing an Environment-level maintenance window override from one Entity will remove it from all Entities.

You can also select the banner for the maintenance window override at the top of the Environment or Entity page and then select the delete icon.

<img alt="Remove maintenance window override." src="./media/remove-maintenance-window-override-from-banner.png" width=300>
