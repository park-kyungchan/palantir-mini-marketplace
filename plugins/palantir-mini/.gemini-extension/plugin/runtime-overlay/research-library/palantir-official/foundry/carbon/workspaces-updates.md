---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/workspaces-updates/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/workspaces-updates/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3c6558643f836dda30a0a14e64bd426c7d0e5baf3b5d1ca5c44876de33d56b38"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Workspaces > Configure workspace updates"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure workspace updates

The entry point for configuring workspace updates is in the workspace editor view. This opens up a dialog in which the updates are configured (the update dialog). It is important to note that the workspace updates are saved separately from the workspace configuration itself; to persist any workspace updates, you need only save in the update dialog and do not need to save the workspace configuration as well (unless there are other changes beyond updates).

<img src="./media/workspace-updates-entry-point.png" alt="Entry Point" height="330"/>

You can then preview the current walkthrough and edit the latest walkthrough by re-ordering, archiving, creating new, or editing existing walkthrough pages.

<img src="./media/workspace-updates-walkthrough-overview.png" alt="Walkthrough Overview" height="600"/>
<img src="./media/workspace-updates-walkthrough-edit.png" alt="Walkthrough Edit" height="600"/>

When you edit a walkthrough page, you can customize the following options:

* Title (required)
* Description
* Media
* Documentation

A live-updating side-by-side preview will be displayed while editing, as shown in the screenshot below.

<img src="./media/workspace-updates-open-update-edit-pane.png" alt="Content Edit" height="400"/>

## Archiving and deleting updates permanently

Workspace updates may become outdated as the configuration and composition of the workspace change. For example, an update might refer to a Carbon module which is no longer present in the workspace, or to module content which might have changed with a newer version of the module. To address this, you can temporarily archive an update (retaining the ability to unarchive the update later) or permanently delete an update.

Once the **Archive** button is clicked, the update will be moved to the bottom of the list, where it can be unarchived or deleted. This will take effect once the changes are saved. Content deleted permanently cannot be retrieved and will no longer be viewable by any user.

<img src="./media/workspace-updates-archive-update.png" alt="Archive Content" height="600"/>
<img src="./media/workspace-updates-archived-before-save.png" alt="Archived Content before saving" height="600"/>

### All archived updates

You can browse all archived (but not deleted) updates in the **All archived updates** tab of the editor. Any update from the list can be unarchived and restored to the list, or deleted permanently. When selecting the delete action, you will receive a confirmation dialog to check whether deletion is the intended action; after confirmation, deletion from the **All archived updates** list occurs immediately.

<img src="./media/workspace-updates-all-archived.png" alt="All Archived Updates" height="600"/>
<img src="./media/workspace-updates-deletion-are-you-sure.png" alt="Are you sure you want to delete the update" height="600"/>

## View

The user will see any steps in the latest set of configured workspace updates which they have not previously seen. These updates will be shown to them when they land on the workspace.

<img src="./media/workspace-updates-claims-portal.png" alt="Claims Portal" height="350"/>
<img src="./media/workspace-updates-external-documentation.png" alt="External Documentation" height="140"/>

If the user exits the workspace updates early, they can see the updates (and all historic updates) in the **What's New** sidebar.

<img src="./media/workspace-updates-whats-new-sidebar.png" alt="What's New Sidebar" height="500"/>
