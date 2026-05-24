---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/workshop-embed/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/workshop-embed/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6f0119f6542ab97cd763b6a77282d99ec8eb4b00d81a707a0ab6808a8b7c5c14"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Integrate with Workshop > Embed a document"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Embed a document

You may want to allow users to read or edit a document without opening the Notepad application. To enable this, use the **Notepad: Embedded Document** widget in Workshop.

## Notepad: Embedded document widget

This widget renders a document in embed mode. To configure, you need to provide the resource identifier (`rid`) of the document. This `rid` should look something like `ri.notepad.main.notepad.aaaaaaaa-1234-bbb-5678-cccccccccccc` and needs to be passed as a Workshop variable.

By default, the document will be displayed as read-only. Toggle the **Allow Editing** option to allow users to edit it.

![workshop\_embedded\_notepad](/docs/resources/foundry/notepad/workshop_embedded_notepad.png)

:::callout{theme="neutral"}
The edit mode of an embedded document exposes a reduced version of the Notepad application and does not offer all available edit functionality. Use the Notepad application for access to all operations.
:::

To export an embedded document from within Workshop, use the [**Notepad: Export Button**](/docs/foundry/notepad/workshop-export/).
