---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-command/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-command/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a9c48fc8178c4d2730071c227645088e7debca3ed9e6ca6cda516bfcfe6ec317"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Command"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Command

Use the **Command** widget to embed an inline [command](/docs/foundry/cross-app-interactivity/commands-overview/) into a Notepad document. Select **+ Widget** or type `/` in a paragraph field to add a command, enabling you to execute operations in other Palantir applications from Notepad. The **Command** widget works in tandem with [App Pairing](/docs/foundry/cross-app-interactivity/app-pairing/) to connect application state and enable cross-application workflows throughout the Palantir platform.

![The Command widget's configuration menu is displayed in Notepad.](/docs/resources/foundry/notepad/notepad_widgets_inline_command.png)

## Widget properties

* **Command:** Select a command to execute. Choose **Browse all commands...** to launch a modal containing all the available commands across Palantir applications and their supporting documentation.
* **Parameters:** Configure the command's optional and required parameters, if necessary. As an example, you can optionally configure parameters which map to object property values.
* **Display:** Customize the icon and/or text label for the widget shown within the document.

## Example: Build a briefing workflow with a paired Gaia map

:::callout{theme="neutral"}
To execute the workflow below, your enrollment must use both Foundry and Gotham. Contact Palantir Support with questions about Gotham's availability on your enrollment.
:::

Create a new Notepad document and open your Gaia map in another browser tab before following the instructions below to pair the two and use the **Command** widget's **Select clip** command to build a briefing workflow.

1. Select the App Pairing icon in the top right ribbon to pair your Notepad document with your Gaia map.
2. Insert the **Command** widget into your Notepad document by pressing `/` and selecting **Insert**.

![A new Command is inserted into a Notepad document.](/docs/resources/foundry/notepad/command-widget-configure-new-command.png)

3. Choose **Gaia** > **Clips** > **Select clip** in the configuration panel's **Add Command** dropdown menu.
4. Select **Add an optional parameter...** and choose **Clip GID**.
5. Select the existing clip on your Gaia map from the **Select from paired apps** menu.

![The Clip GID parameter displays a user selecting an existing clip on their Gaia map.](/docs/resources/foundry/notepad/command-widget-clip-gid.png)

6. Choose an **Icon** and set the **Text** that will display alongside the icon in your Notepad document.

With **Select clip** configured, you can position your Notepad document and Gaia map next to each other and select the icon you set to open the clip in Gaia.

![A clip icon is selected in a Notepad document and renders in the Gaia map's viewport.](/docs/resources/foundry/notepad/command-widget-select-clip-in-notepad.png)

Additionally, you can use the following widgets in a [Workshop](/docs/foundry/workshop/overview/) module to create a unified briefing workflow within the same window.

* [Iframe](/docs/foundry/workshop/widgets-iframe/)
* [Notepad: Embedded Document](/docs/foundry/notepad/workshop-embed/)

![A Workshop module displays a Notepad document and Gaia map.](/docs/resources/foundry/notepad/command-widget-embed-in-workshop.png)
