---
sourceUrl: "https://www.palantir.com/docs/foundry/walkthroughs/workshop-integration/"
canonicalUrl: "https://palantir.com/docs/foundry/walkthroughs/workshop-integration/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "202f52a1e91cad493061cbb68da1a98011dc80a5f73e16d8f8bc89393d27fc5d"
product: "foundry"
docsArea: "walkthroughs"
locale: "en"
upstreamTitle: "Documentation | Walkthroughs > Workshop integration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Workshop integration

You can integrate Walkthroughs with Workshop modules to enable more interactivity for end users.

## Use Workshop modules in Walkthroughs

1. In a Walkthrough module, navigate to the step that will include a Walkthrough.

![Navigate to step](/docs/resources/foundry/walkthroughs/navigate-to-step.png)

2. Add a resource to this step and select a Workshop module to add.

![Add resource to step](/docs/resources/foundry/walkthroughs/add-resource.png)

3. Once the Workshop module is added, a **Configure module state** button will appear on the Workshop card. This button will take you to the Workshop configuration dialog.

![Workshop linked in step](/docs/resources/foundry/walkthroughs/workshop-linked-in-step.png)

## Highlight Workshop widgets

Walkthrough builders can highlight specific parts of a Workshop module when an end user is in a walkthrough. By highlighting Workshop widgets, end users can easily identify and focus on key elements of the Workshop module.

1. Open the Workshop configuration dialog of the step's linked Workshop module to be highlighted.
2. Use the **Select widgets** button to enter widget selection mode.

![Workshop configuration dialog](/docs/resources/foundry/walkthroughs/workshop-configuration-dialog.png)

3. While in widget selection mode, select the widgets to highlight in the walkthrough. Widgets can be deselected by clicking on them again or by using the **Clear all** button.

![Widget selection mode](/docs/resources/foundry/walkthroughs/widget-selection-mode.png)

4. When a user is in the walkthrough, the selected widgets will now be highlighted on that step.

![Navigate to step](/docs/resources/foundry/walkthroughs/view-highlighted-walkthrough.png)

:::callout{theme="neutral"}
Only top-level widget highlighting is currently supported. This means that sections or subcomponents (such as individual buttons or tabs) cannot be directly highlighted.
:::
