---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/workshop-objects/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/workshop-objects/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "04a35b909c45d212f4c57e1796c84b09ed6cce23d2872ffbf3da133aece976e7"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Integrate with Workshop > Show documents linked to objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Show documents linked to objects

Whenever objects are embedded in a document (e.g., as an [object card](/docs/foundry/notepad/widgets-object-card/) or [object property](/docs/foundry/notepad/widgets-object-property/)), Notepad keeps track of these links. This allows you to display all documents that have a link to a specific object.

## Notepad: Linked documents widget

Use the **Notepad: Linked documents** widget in Workshop to display all documents that include a link to a selected object.

![workshop\_notepad\_references\_example](/docs/resources/foundry/notepad/workshop_notepad_references_example.png)

You can adjust the widget content display style, which fields are shown, and the display order. You can also define default sorting options for the document, such as sort by author. See examples below.

![workshop\_notepad\_references\_display\_modes](/docs/resources/foundry/notepad/workshop_notepad_references_display_modes.png)

The **Notepad: Linked documents** widget automatically exposes the **Active Notepad** variable. This variable references the resource identifier (`rid`) of the currently selected document and automatically updates when the selection changes. For example, you can use it to configure the [Notepad: Embedded document](/docs/foundry/notepad/workshop-embed/) widget to display the currently selected document directly in Workshop.
