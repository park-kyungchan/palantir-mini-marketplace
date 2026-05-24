---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7a566be09054bb37453b1eb6e1012c9d4a16a2d877a90dba2fecfaa9aaa8ce1d"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Carbon > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

:::callout{theme="warning" title="Carbon Permissions"}
To configure a Carbon Workspace, a Foundry developer will need the [correct permissions](/docs/foundry/carbon/permissions-configure/#configure-workspace-editor-permissions).
:::

This guide demonstrates the creation of a simple Carbon workspace using resources from the **Foundry Training and Resources** Project, which is included as part of the Foundry platform. The end result is an aviation workspace designed for an airline analyst to review alerts related to the performance of particular flight routes. This workspace includes quick links to relevant applications and data, along with access to the analyst's favorite individual objects.

![Example Aviation Workspace](/docs/resources/foundry/carbon/getting-started-end-state.png)

The example Aviation Workspace represents a bare minimum of Carbon configuration and is intended for use as a simple reference. The remainder of the Carbon documentation contains complete descriptions of available configuration options.

## Create a new workspace

To configure a new Carbon workspace, first open **Carbon workspaces** from the Application Portal. Then, follow the instructions to [create a new Carbon workspace](/docs/foundry/carbon/workspaces-create/).

![Open Carbon from the Application Portal.](/docs/resources/foundry/carbon/application-portal-carbon.png)

## Edit Mode Orientation

Each Carbon workspace has a set of four configuration tabs in the right sidebar:

1. **[General](/docs/foundry/carbon/configuration-general/):** Control the metadata and global configurations for the workspace.
2. **[Home](/docs/foundry/carbon/configuration-home/):** Manage the content of the landing page, including the logo, search, and column contents, or replace the home page with a custom resource.
3. **[Menu](/docs/foundry/carbon/configuration-menu-bar/):** Choose the resources and links to populate the menu bar at the top of the Workspace.
4. **[Access](/docs/foundry/carbon/configuration-access/):** Determine the workspace visibility from the launcher, the location where the workspace is stored, and default workspaces for user groups.

To begin, add a **Name** and **Description** in the `General` tab.

![Starting state of workspace creation](/docs/resources/foundry/carbon/getting-started-zero-state.png)

## Update the home page

The default home page presents a three-column layout, where each column is populated with one or more blocks of [featured items](/docs/foundry/carbon/configuration-home/#featured-items). Above the columns are an optional logo and the Object Explorer search bar.

Before turning to the contents of the columns, let's restrict the object types that are searched from the search bar. If there are [object type groups](/docs/foundry/object-explorer/configure/#customizable-object-type-groupings-on-home-page) configured, choose from these in the **Groups** list or change to the **object types** list and choose one or more object types to restrict the search results.

![Configuration of search](/docs/resources/foundry/carbon/getting-started-search-config.png)

To turn to the home page content, in **Column A**, let's add a list of the relevant object types for this workspace, adding a new block for `Object types (prominent & selected)` and choosing the `List` option, which allows selecting each object type displayed automatically.

![Object type list](/docs/resources/foundry/carbon/getting-started-object-type-list.png)

## Update the Menu Bar

The [Menu Bar](/docs/foundry/carbon/configuration-menu-bar/) holds links to Foundry resources that open within the context of the workspace. In this example, we add two Workshop modules, the **Route Alert Inbox** and the **Flight Command Center**. These **Anchored Modules** will be permanent tabs in the workspace. Additional resources can be added as **New-Tab Modules**, which will be available in a dropdown and open in a new tab when selected.

![Update the menu bar](/docs/resources/foundry/carbon/getting-started-top-bar.png)

After updating the menu bar, return to the home page configuration and add a new block in **Column B** with the `All menu bar items` contents, which will automatically populate with any resources configured in the menu bar. These will populate *after* the workspace is saved.

## Save the Workspace

In the upper right corner of the edit interface, click the **Save** button to save a new version of the workspace then click the **x** icon to leave edit mode and review the workspace as it will appear to users.

## What's Next?

We now have a simple but functioning Carbon workspace. You can continue customizing this example workspace, manage its access controls, or connect it to other applications with the information in the links below:

* Customize the [logo](/docs/foundry/carbon/configuration-home/#logo).
* Review the workspace [visibility and permissions](/docs/foundry/carbon/configuration-access/).
* Learn how to wire together [navigation between resources](/docs/foundry/carbon/modules-navigation/) for multi-app workflows.
