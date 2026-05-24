---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/export-pdf/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/export-pdf/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "552afda667da66ca8a0f139e417abc77da98a359da84c86813667500be0f1d05"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Documents > Export to PDF"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Export to PDF

Notepad documents are designed for printing and exporting with support for modifying page orientation, defining page headers and footers, and print specific settings for widgets.

## Export a document

Export a document by using the **Actions** menu on the top right, selecting **Export** and then **Export as PDF**. Notepad will save your document as a PDF once the document has been rendered.

![getting\_started\_print\_document](/docs/resources/foundry/notepad/getting_started_print_document.png)

:::callout{theme="warning" title="Render Timeout"}
The background rendering time is capped when exporting to PDF. Should the document contain many charts that require long computations, the limit may be reached and prevent your chart from fully loading. In these cases, use the **Open in print mode** option discussed below.
:::

Alternatively, you can open the document in a print-friendly view with the **Open in print mode** button. Once the page and all your charts have fully loaded, you can either use the Ctrl+P keyboard shortcut or the print button on the upper right to save as PDF or print the page.

Be sure to set the print layout to **Portrait** or **Landscape** based on the [page orientation](#page-orientation) of your document. Make sure that the page size matches your selected Notepad [page size](#page-size). Select the **default** margin options to ensure content is aligned.

## Specific print options

Notepad provides additional print options for fine-tuning your document before exporting it.

### Page orientation

By default, documents are displayed in portrait mode. To change a document to landscape mode, select **Print Options** in the Notepad toolbar and then select **Portrait** or **Landscape** under **Page Orientation**.

![print\_options\_page\_orientation](/docs/resources/foundry/notepad/print_options_page_orientation.png)

### Page headers and footers

To configure headers and footers, select **Print Options** in the Notepad toolbar. Enabling headers or footers opens an editor to add content. Note that this content will only be visible for document print or export.

![print\_options\_page\_header\_footer](/docs/resources/foundry/notepad/print_options_page_header_footer.png)

### Page size

The default page size for Notepad documents is Letter (8.5 x 11 inches). To configure the size, select **Print Options** in the Notepad toolbar and then select the page size using the dropdown.

![print\_options\_page\_size](/docs/resources/foundry/notepad/print_options_page_size.png)

The available page size options are:

* Letter
* Legal
* Tabloid
* A3
* A4
* A5

### Page break widget

Use the [page break widget](/docs/foundry/notepad/widgets-page-break/) to insert custom page breaks. Page breaks will only be shown when printing.

### Widget printing configuration

Some widgets support print-specific configuration options. When available, access these by selecting a widget, opening the **Widget Properties** panel and selecting **Print Configuration**.

Options include [zoom](#zoom), [print on new page](#print-on-new-page), and [expanding scrollbars](#expanding-scrollbars).

#### Zoom

Printing to PDF may limit the horizontal space available (even in landscape mode), which is not well-suited for some visualizations. For example, wide tables which can be scrolled horizontally on screen will need to be adjusted to fit. The **Zoom Level** config allows you to do this by scaling down the content shown.

![print\_options\_zoom\_level](/docs/resources/foundry/notepad/print_options_zoom_level.png)

#### Print on new page

By default, widgets print on a new page if space is limited. This may not be the preferred behavior for widgets that display tables or span more than a page. In these cases, you can disable printing on a new page.

#### Expanding scrollbars

Use **Auto-expand Table height on print** to fully expand scrollbars on print to ensure vertically scrolled sections are fully expanded. This feature is currently only supported for Contour tables and Quiver object and pivot tables.

![print\_options\_expand\_scrollbars](/docs/resources/foundry/notepad/print_options_expand_scrollbars.png)
