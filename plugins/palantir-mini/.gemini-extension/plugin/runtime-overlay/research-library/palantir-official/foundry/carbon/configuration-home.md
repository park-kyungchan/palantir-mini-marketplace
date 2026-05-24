---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/configuration-home/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/configuration-home/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3580d07dc05b511afcf1410e76a13009195ae240afe2816246cdd35966ea40c0"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Configuration reference > Home configuration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Home configuration

Switch to the **Home** configuration tab to configure the home page of your workspace. In the **Home** configuration tab (shown below), you can configure the [logo](#logo), [subtitle](#subtitle), and [featured items](#featured-items) for a workspace.

<img src="./media/configure-workspace-home-tab.png" alt="Home tab" width="300" />

## Logo

By default, your workspace will have a Palantir logo featured in the top-middle of the Carbon home page. You can display a custom logo that has been uploaded to Foundry by navigating to the **Logo** section and clicking on **Select logo**.

<img src="./media/configure-workspace-select-logo.png" alt="Select logo" width="300" />

Continue by selecting your image file in a Project. This image file will now replace the default logo in your Carbon workspace.

To adjust the size of the logo, expand the **Dimensions** section, where you can set a maximum width and/or height.

<img src="./media/configure-workspace-dimensions.png" alt="Logo dimensions" width="300" />

To remove a custom logo, you can hover over the logo preview and select the **x** icon.

<img src="./media/configure-workspace-delete-logo.png" alt="Delete logo" width="300" />

## Subtitle

In the **Subtitle** section, you can add a subtitle to be displayed under the logo on the home page. For instance, you could provide a welcome message or description of the workspace.

<img src="./media/configure-workspace-subtitle.png" alt="Subtitle" width="300" />

## Featured items

The Carbon workspace can prominently display three columns (labeled A, B, and C) that can contain **Featured items**. There are various types of **Featured items** that can be displayed, including objects, object types, saved explorations, and more. We recommend curating the home page to ensure that the workspace features the most useful resources for a user’s work.

![Featured items](/docs/resources/foundry/carbon/configure-workspace-featured-items.png)

Optionally, columns A, B, and C can contain widgets that group resources together. A widget can be custom configured, or you can select from a list of default options, such as a user's favorite objects or saved explorations.

<img src="./media/configure-workspace-select-widget-type.png" alt="Widget type" width="300" />

In a custom configurable widget, each item's appearance can be customized by hovering over the item and selecting the edit icon, which will open an edit dialog.

<img src="./media/configure-workspace-edit-featured-item.png" alt="Edit featured item" width="300" />

A widget's display can be further configured by adding a title and description and by choosing whether to display the items as a list or as cards. A **List** display is compact and shows the resource icons along with the name for each element. A **Cards** display is larger and can include a custom thumbnail image for each element. Cards are generally more useful when there are a small number of items. These options can be configured by expanding the **Metadata & Display** section in the widget editor.

<img src="./media/configure-workspace-widget-metadata-and-display.png" alt="Widget metadata and display" width="300" />

In the following example, columns A and B each contain one widget displayed as cards, and column C contains two widgets each displayed as a list.

![Cards and lists](/docs/resources/foundry/carbon/configure-workspace-cards-and-lists.png)

## Module-backed home pages

Builders can also configure a module to act as the home page for a workspace. Selecting **Replace Home with Compass Resource** on the home configuration tab will open a dialog to allow the selection of a module and parameters.

![Replacing home page with Module](/docs/resources/foundry/carbon/configure-workspace-replace-home-page.png)

If a module is in use for the home page, builders can reset the workspace to the last configured default home page.

![Using last default home page](/docs/resources/foundry/carbon/configure-workspace-revert-home-page.png)
