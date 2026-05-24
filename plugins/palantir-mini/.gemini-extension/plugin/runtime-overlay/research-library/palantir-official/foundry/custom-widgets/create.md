---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/create/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/create/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8f676f872179f54e510dcba63e74de28fc9ab73152ecbefd56058cf80818e4cc"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Create a widget set"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a widget set

To create a new widget set, follow the instructions below:

1. Select **Files** from the workspace navigation bar and find your desired project or folder.
2. Select **New > Widget set** in the top right to create a new widget set within the current project or folder. The new widget set will inherit the permission of the project or folder.

<img src="./media/create-from-compass.png" alt="Create a new widget set." width=500 />

3. In the create new widget set wizard, configure the name of your widget set and select whether you will be developing in or outside of Foundry. Developing in Foundry is the easiest way to get started, as it automatically bootstraps a code repository with built-in CI/CD for creating, testing, and publishing your widget set. Alternatively, you can host your code in your own repository (such as GitHub) and use our CLI to manage version control and publish the widget set yourself.

![Create new widget set wizard.](/docs/resources/foundry/custom-widgets/creation-wizard.png)

## Enabling Ontology SDK (OSDK)

To access the ontology from your widget set in code, configure an OSDK using the creation wizard (optional during setup). You can add or configure an OSDK for your widget set at any time.

If you choose to configure an Ontology SDK, you must also enable the Ontology APIs for your widget set, which can be done by any user with the Information Security Officer role. Otherwise, API calls made from the OSDK will fail. Review [Using Ontology SDK (OSDK) in a widget set](/docs/foundry/custom-widgets/use-osdk/) documentation for further details.

![Configuring the OSDK screen.](/docs/resources/foundry/custom-widgets/enabling-osdk.png)

## First release

If you chose to develop in Foundry, the widget release will be started automatically and should complete within a few minutes.
To check the status of your custom widget:

* Select the **Edit in Code Workspaces** option.
* Select **Tags** in the top bar of Code Workspaces and then into the listed tag's check page.

If you opted to develop outside of Foundry, refer to the instructions provided on [publishing a widget set](/docs/foundry/custom-widgets/publish/) documentation.

## Previewing widgets

After the first version of your widget has been released, refresh the widget set's overview page to show a new widget. Select the widget will allow you to preview it.

![Widget set overview page.](/docs/resources/foundry/custom-widgets/widget-set-overview.png)

![Preview your widget.](/docs/resources/foundry/custom-widgets/widget-preview.png)
