---
sourceUrl: "https://www.palantir.com/docs/foundry/insight/save-and-share/"
canonicalUrl: "https://palantir.com/docs/foundry/insight/save-and-share/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "614528b77fc191bb5d0b6a87c290b15d4aeca194a884beacde517873d068215a"
product: "foundry"
docsArea: "insight"
locale: "en"
upstreamTitle: "Documentation | Guides > Save and share a workbook"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Save and share a workbook

Saving in Insight is flexible; you can work without saving at all, or save and share workbooks for ongoing use.

Insight does not require you to save a workbook to view your analysis, making it easy to run quick, unplanned analyses without any setup. If you do not need to keep the analysis results,  close the tab when done. If you have unsaved work, Insight displays an orange banner and an `Unsaved` tag at the top left of the screen as a reminder.

## Save an Insight workbook

Follow the steps below to save an Insight workbook:

1. Select **Save as** in the top right corner of your screen. <br><br>
   ![The Save as dialog prompts you to enter a name and location for the workbook.](/docs/resources/foundry/insight/save-insight-share.png) <br><br>

2. Choose a name and save location for the workbook and optionally add a description.

3. Select **Save**.

4. A confirmation message appears at the top of the screen, and the workbook name and save location appear in the top left.

A saved workbook includes all configurations, including the analysis paths, column and chart layouts, and maps.

## Publish an object set

Any path in a saved workbook can be published as an object set. Publishing an object set allows the path to be searchable and used in other applications, including [Quiver](/docs/foundry/quiver/objects-overview/#import-a-saved-object-set) and [Vertex](/docs/foundry/vertex/explore-object-relationships/). Object sets can also be referenced by other Insight users. Since published object sets can be used in other workflows, changes made to the backing path of the object set will directly impact all users of the object set.

Follow the steps below to publish an object set:

1. Select the **Save** dropdown arrow in the top right corner of a saved workbook, then choose **Publish object sets**. <br><br>
   ![The Publish object sets option in the Save menu of a workbook.](/docs/resources/foundry/insight/publish-object-set.png) <br><br>
2. Select the paths to publish. Once published, the object set will be discoverable throughout the platform, and the backing path will display a `Published` tag. <br><br>
   ![Select paths to publish in the pop-up modal.](/docs/resources/foundry/insight/paths-to-publish.png) <br><br>

The backing path of a published object set displays a lock icon, indicating the path is read-only by default. To modify the published object set, you must have `Edit` access to the workbook to unlock the path. Unlocking requires confirmation to ensure edits are intentional, as changes will propagate to all instances of the object set.

![The path that backs a published object set is locked, as indicated by a lock icon.](/docs/resources/foundry/insight/locked-path.png)

## Share a workbook

You can share an Insight workbook to specific users through link sharing or access grants. Follow the steps below to open the available sharing options:

1. Select **Share** in the top right corner of the saved workbook. <br><br>
   ![The Share button in a saved workbook.](/docs/resources/foundry/insight/insight-click-share.png) <br><br>
2. In the **Access** panel, directly grant roles to specific users or groups, or toggle on **Link sharing**. <br><br>
   ![The Access panel shows options for managing workbook permissions and link sharing.](/docs/resources/foundry/insight/insight-share-access-panel.png) <br><br>

### Option 1: Share with specific users

1. Under **Manage roles**, select the **Add a user or group** search field and enter a user or group name. <br><br>
   ![Search for users and groups to directly grant access to your workbook.](/docs/resources/foundry/insight/share-to-user.png) <br><br>
2. Find the user or group from the **Search results** dropdown list and select **+ Add**.
3. Assign an [access role](#access-roles) to the user or group, then select **Save**.

Added users and groups will receive a notification when access is granted.

### Option 2: Enable link sharing

1. At the bottom of the **Access** panel, toggle on **Link sharing**.

2. From the dropdown menu in the lower right corner, choose the [access role](#access-roles) for the users who access the workbook from a shared link. <br><br>
   ![Choose the access role for link-sharing users.](/docs/resources/foundry/insight/link-share-panel.png) <br><br>

3. Select the clipboard icon to copy and share the workbook link.

#### Turn off link sharing

To disable link sharing, toggle off **Link sharing**.

### Access roles

When sharing your workbook with other users or groups, assign them one of the following access roles:

* `Discoverer`: Users can only see that the workbook exists and view its metadata, but cannot access its contents.
* `Viewer`: Users can view workbook contents but cannot save edits to the original. Edits can be saved to a copy of the workbook.
* `Editor`: Users can edit the workbook, save changes, and modify sharing settings.
* `Owner`: Users have full control over the workbook, including sharing and security settings.

:::callout{theme="neutral"}
For simple read-only sharing, `Viewer` is the recommended role. Users can view the analysis and save a copy if needed.
:::
