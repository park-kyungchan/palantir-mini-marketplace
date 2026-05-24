---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-object-property-markdown-editor/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-object-property-markdown-editor/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e2e30c078734af54b19ecf598cd7d12d97200ae165d6243f92c3b77093299ca0"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Object property Markdown editor"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Object property Markdown editor

The **Object property Markdown editor** widget allows you to display and edit a Markdown-formatted object property in your Notepad document. Select **+ Widget** or press `/` in a paragraph field to open the [widget insertion menu](/docs/foundry/notepad/embed-widgets/#from-a-document) and add the **Object property Markdown editor** widget to your document.

The widget supports the [CommonMark ↗](https://commonmark.org/) specification, with the following exceptions:

* Images
* HTML
* Link references
* Lists that are nested within, but are not direct children of, another list (such as a list containing a blockquote that contains another list).

## Widget properties

* **Object selection:** Object with property to display.
* **Property:** Define which object property to display.
* **Allow editing:** Denote whether or not users are able to edit the property. If disabled, users will not be able to make changes regardless of whether or not there is an inline edit configured.

## Editing

You can use the widget to edit properties with a corresponding [action-backed inline edit](/docs/foundry/action-types/inline-edits/). Once you configure the inline edit, select the widget from your document to open the Markdown editor. Enter your edits and save your changes in the toolbar to update the property in the ontology.

![The Object property Markdown editor widget on a Notepad document displays the ability to change text and save to your ontology.](/docs/resources/foundry/notepad/notepad_widgets_edit_markdown.png)

You can also use the toolbar to view and edit the raw Markdown.

![The Object property Markdown editor widget on a Notepad document displays rich text to edit.](/docs/resources/foundry/notepad/notepad_widgets_edit_raw_markdown.png)

To block conflicting changes, Notepad prevents other users from editing the widget when you or another user select it in the document.
