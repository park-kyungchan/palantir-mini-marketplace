---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-modules/update-module-installation/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-modules/update-module-installation/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a6a0b56579aa691e7126f6cf84de3709a9ac2103cfff463d0c21d2c42e08dcfc"
product: "apollo"
docsArea: "managing-modules"
locale: "en"
upstreamTitle: "Documentation | Managing Modules > Update a Module installation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Updating a Module installation

## Automatic updates

Module installations track [Release Channels](/docs/apollo/core/release-channels/). When a new Module Release is promoted to a Release Channel, Apollo will propose an update for all installations of the Module that track that channel.

Depending on the compliance regime of the Environment, the update change request may be automatically approved or require manual approval. You can also enable [automatic approvals](#automatic-approvals) for all compliance regimes. You can view the available updates for each installation of the Module in the **Installations** tab of the Module overview.

![A valid update.](/docs/resources/apollo/managing-modules/module-update.png)

Hover over **New update** and select the arrow icon to view and approve the automatically generated change request.

![View a link to an automatically generate change request.](/docs/resources/apollo/managing-modules/view-module-update-change-request.png)

Apollo will display a message at the top of the change request indicating it was automatically generated from a Module update.

![Automatically generated change request.](/docs/resources/apollo/managing-modules/module-change-request.png)

In the event that Apollo is unable to automatically update an installation of a Module, Apollo will display a blocked update with a reason. For example, if the new Module version includes a new variable with no default value, Apollo is unable to infer what the value should be. To resolve the blocked update, an [Environment editor](/docs/apollo/core/authorization/) can either update the Module definition to correct any backward compatibility issues or manually update the installation.

![A blocked update.](/docs/resources/apollo/managing-modules/blocked-module-update.png)

Hover over **Update Blocked** to view the reason that the update is blocked. Select **Update manually** to resolve the blocked update.

![View the reason that a Module update is blocked and resolve the blocked update.](/docs/resources/apollo/managing-modules/module-update-blocked-description.png)

### Automatic approvals

You can configure Apollo to automatically approve change requests for Module updates.

Apollo can automatically approve Module updates such as marking Entities for uninstallation, adding a new Entity, and more. Apollo cannot automatically approve Module installations or Module updates that edit the configuration overrides for an Entity.

:::callout{theme="neutral"}
Users with the Change Manager role for Modules can enable automatic approvals. You should only grant this role to Hub Administrators or teams that manage compliance requirements for your environment.
:::

You can enable automatic approvals by navigating to the Software Catalog, selecting a Module, and selecting **Edit** from the **Auto-update** section of the right sidebar.

![Enable](/docs/resources/apollo/managing-modules/module-auto-update.png)

Then, toggle on **Auto-update** and enter a reason. Select **Confirm** when you are finished editing.

<img alt="Form to enable automatic approvals for a Module." src="./media/enable-auto-approval.png" width=500>

Apollo will automatically generate and approve a change request.

![Automatically approved change request.](/docs/resources/apollo/managing-modules/module-auto-approval.png)

## Manual updates

To update a Module installation manually, follow the same steps as when [installing a Module](/docs/apollo/managing-modules/install-module/).

When a Module is already installed in an Environment, Apollo will update the existing installation instead of creating a new one. This is because there can only be one installation of a Module in an Environment at a time.
