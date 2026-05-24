---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/embed-widgets/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/embed-widgets/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bc4636a241a491060018ab1a63d7132cec83c4649ccb4a2a7a0a713ef8a25552"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Documents > Embed widgets"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Embed widgets

Widgets in Notepad allow you to add content such as images, charts, tables, styling elements, links, and connections to other Foundry applications to your Notepad document.

## Supported integrations

Notepad supports embedding widgets such as charts or tables from several other Foundry applications. The following integrations are supported:

* [Code Workbook chart](/docs/foundry/notepad/widgets-code-workbook-chart/)
* [Command](/docs/foundry/notepad/widgets-command/)
* [Contour chart](/docs/foundry/notepad/widgets-contour-chart/)
* [Functions](/docs/foundry/notepad/widgets-functions/)
* [Map](/docs/foundry/notepad/widgets-map/)
* [Object card](/docs/foundry/notepad/widgets-object-card/)
* [Object media preview](/docs/foundry/notepad/widgets-object-image/)
* [Object property Markdown editor](/docs/foundry/notepad/widgets-object-property-markdown-editor/)
* [Quiver chart](/docs/foundry/notepad/widgets-quiver-chart/)
* [Quiver dashboard](/docs/foundry/notepad/widgets-quiver-dashboard/)
* [Solution Designer diagram](/docs/foundry/notepad/widgets-solution-designer-diagram/)
* [Vertex graph](/docs/foundry/notepad/widgets-vertex-graph/)

Additionally, Notepad has as a number of native widgets:

* [Anchor link](/docs/foundry/notepad/widgets-anchor-link/)
* [Current date](/docs/foundry/notepad/widgets-current-date/)
* [Horizontal rule](/docs/foundry/notepad/widgets-horizontal-rule/)
* [Image](/docs/foundry/notepad/widgets-image/)
* [LaTeX](/docs/foundry/notepad/widgets-latex/)
* [Page break](/docs/foundry/notepad/widgets-page-break/)
* [Resource link](/docs/foundry/notepad/widgets-resource-link/)
* [Table](/docs/foundry/notepad/widgets-table/)
* [User mention](/docs/foundry/notepad/widgets-user-mention/)
* [Value embed](/docs/foundry/notepad/widgets-value-embed/)

The widget references provide a detailed description of the configuration options and capabilities. Notepad does not currently support embedding widgets with views from Workshop modules or Slate applications.

## Add a widget

You can add widgets within a document or directly from the source application.

### From a document

1. Use the **/** keyboard shortcut in a paragraph or click **+ Widget** to open the insertion menu.
2. Select the embed type.
3. Click **Insert** to add the new widget.

Integrations from other Foundry applications may need additional configuration to show data or visualizations. Use the **Widget Properties** panel located on the right to configure.

![add\_widget](/docs/resources/foundry/notepad/add_widget.png)

### From a resource

The **Copy for Notepad** button is available in all [embeddable Foundry applications](#supported-integrations). Clicking this will copy content to your clipboard, which you can then paste into a document.

![copy\_for\_notepad\_contour\_example](/docs/resources/foundry/notepad/copy_for_notepad_contour_example.png)

## Widget links

All objects, object sets, and Foundry resources that are referenced in a document are automatically linked to the document. Use the **View document links** button in the top right **Actions** menu to view document links.

Links to objects are used in [Workshop's](/docs/foundry/workshop/overview/) **Notepad: Linked Documents** widget to display all documents that reference a particular object. See [Show documents linked to objects](/docs/foundry/notepad/workshop-objects/) for more details.
