---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/markdown-features/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/markdown-features/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "09a3047097515129346d88bd8d7ef17d60d28e1c4d0df4c871d1c4ae11488cdf"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Notepad > Markdown features"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Markdown features in Notepad \[Beta]

Notepad supports various features that parse Markdown into rich text.

This includes:

* **[Functions on objects](/docs/foundry/notepad/widgets-functions/#widget-properties):** Function outputs can be parsed as Markdown.
* **[Custom functions](/docs/foundry/notepad/custom-functions/):** Notepad contents parsed as Markdown can be used as function inputs, and function outputs can be parsed as Markdown.
* **[Object property Markdown editor](/docs/foundry/notepad/widgets-object-property-markdown-editor/):** Markdown-formatted object properties can be displayed and edited as rich text. This widget follows the [CommonMark ↗](https://commonmark.org/) specification, which may differ from the [supported elements](#supported-markdown-elements) available in other Notepad widgets.

## Supported Markdown elements

When parsing function outputs as Markdown, we support the following:

* Block quotes
* Breaks
* Code blocks
* Headings
* Horizontal rules
* Links
* Lists
  * Bullet lists
  * Numbered lists
  * Check lists
* Paragraphs
* Tables
* Text formatting
  * Bold
  * Italic
  * Inline code formatting

:::callout{theme="neutral"}
If the Markdown element structure or element type does not conform to the supported structure or elements in Notepad, the Markdown contents may fail to be parsed. Unsupported Markdown elements may be dropped during conversion.
:::
