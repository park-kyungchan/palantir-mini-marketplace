---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/workshop-export/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/workshop-export/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "52cb48be09a02c13942c0f5ce58cd5adbd2c2d32f95270413673c52a56621e3b"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Integrate with Workshop > Export existing Notepad documents"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Export existing Notepad documents

To allow others to export existing documents as PDFs from within workshop, use the **Notepad: Export Button** widget. This can be used in conjunction with the **Notepad: Embedded Document** widget to enable edit and export workflows.

## Notepad: Export Button widget

After adding the **Notepad: Export Button** to your Workshop application, create or reference a variable containing the document RID. This variable can optionally be the output document RID of the **Notepad: Linked Documents**, **Notepad: New Notepad Button**, or **Notepad: Embedded Document** widgets.

### Options

* **Output Filename:** Define the file name of the downloaded PDF document. Defaults to the name of the Notepad document if empty.
* **Button Display:** Define layout options for the export button.
* **Button Text:** Define the text for the export button. Defaults to `Export` if empty.

### Notepad: New Notepad Button widget

The **Notepad: New Notepad Button** widget allows a user to [generate a new Notepad document and optionally export it from within Workshop](/docs/foundry/notepad/workshop-templates/).
