---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/permissions-configure/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/permissions-configure/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "580348159ab2aff22a352f1880b93fe6a990ca7d5803b33e767c8a62c9c9c8df"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Permissions and access > Configure permissions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure permissions

There are three main types of permissions in Carbon:

* [Administrator permissions](#configure-administrator-permissions), which permit promotion of Carbon workspaces and configuration of organization-wide Carbon settings
* [Editor permissions](#configure-workspace-editor-permissions), which permit editing of a specific Carbon workspace
* [Viewer permissions](#configure-workspace-viewer-permissions), which permit the viewing and use of specific Carbon workspaces

## Configure administrator permissions

Carbon administrator permissions are required in order to configure organization-wide settings in Carbon. This includes choosing which workspaces are promoted, customizing the appearance of the Navigation Menu, and enabling or disabling dark mode. Carbon administrator permissions are granted in [Control Panel](/docs/foundry/administration/overview/) and can be configured independently for each [Organization](/docs/foundry/administration/enrollments-and-organizations/).

To grant Carbon administrator permissions to a group of users:

1. Navigate to Control Panel (`workspace/control-panel`), and select an enrollment to configure, if multiple enrollments are available.
2. Under **Setting Up an Organization**, select **Assign organization permissions**.
3. Configure permissions with **one** of the following options:
   * Search for the `User experience administrator` role and configure which groups and users should have this role. This will also grant permission for related admin workflows.
   * For more granular permissions, select **New role**, fill out the name and description, and add the `Manage Carbon workspaces` workflow.

## Configure workspace editor permissions

To edit a Carbon workspace, a user must have at least edit access to the resource. You can locate, view, and manage permissions for the workspace resource in a Project; the workspace file location is selected when creating a new workspace, but you can also move an existing workspace to a different Project.

Editors can create and edit the home page and header menu bar for specific workspaces they have editor permissions on. Editing a Carbon workspace without promoting it enables iterating on a draft workspace.

Only a Carbon administrator can promote workspaces. Non-admin editors cannot determine which workspaces are displayed in the Navigation Menu, and even if a workspace is configured as the default workspace for a user group, it will not be displayed in the Navigation Menu if it is not promoted by an administrator.

## Configure workspace viewer permissions

Users must meet the following requirements to be able to view a specific Carbon workspace:

* The user has at least view access to the workspace file.
  * You can locate, view, and manage permissions for the workspace resource in a Project. The workspace file can be found in the location in which it was stored when it was created, or opened via the **Access** tab in the editor side bar.
* The workspace is [promoted by a Carbon administrator](/docs/foundry/carbon/workspaces-navigation/#promote-and-hide-workspaces) for the organization to which the user belongs.
  * Users with view permissions can still view the workspace if they have the exact URL to navigate to it, even if the workspace is not promoted.

:::callout{theme="neutral"}
Note that providing access to a Carbon workspace is not equivalent to providing access to all the Workshop modules, objects, applications, and other resources displayed in the Carbon workspace. Access to these resources is determined independently from access to the Carbon workspace.
:::
