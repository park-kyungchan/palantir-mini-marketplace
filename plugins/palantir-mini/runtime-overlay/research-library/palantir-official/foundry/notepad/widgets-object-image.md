---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/widgets-object-image/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/widgets-object-image/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1b248adafd4805af18eecc9240393a946769cd4c2ad97b7ec95a31642525483b"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Widgets > Object media preview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Object media preview

The **Object media preview** widget allows you to embed and preview images, audio, video, or document files from a [supported media source](#supported-media-sources).

## Supported media sources

#### Media references

Select a [media reference](/docs/foundry/media-sets-advanced-formats/media-overview/#media-references) typed object property to preview the underlying media.

Image media references are resizable. Use the drag handle in the bottom-right corner to adjust the image size. Resizing is not supported for other media types.

![Resize media reference image.](/docs/resources/foundry/notepad/notepad_widgets_object_media_image_resize.gif)

You can configure the print settings for document media references that are applied on [Export to PDF](/docs/foundry/notepad/export-pdf/).

* **Print widget on new page if space is limited** (enabled by default): Automatically moves the widget to a new page during export if there isn’t enough space on the current page.
* **Auto-expand widget height on print:** Ensures the widget expands to display the entire document, making all content visible in the exported file. Auto-expand is limited to a maximum of 15 embedded pages.

Print settings are not supported for other media types.

#### Media strings

Media string options support media referenced in string object properties in the following formats:

* From a media set: `https://{my-foundry-url}/mio/api/media-set/{media set rid}/items/{media item rid}`.
* From a dataset: `https://{my-foundry-url}/foundry-data-proxy/api/web/dataproxy/datasets/{dataset rid}/transactions/{transaction rid}/{filename} or https://{my-foundry-url}/foundry-data-proxy/api/web/dataproxy/datasets/{dataset rid}/views/{branch name}/{filename}`.
* External media URL: Ensure access has been configured in your enrollment’s [Content Security Policy](/docs/foundry/administration/embed-foundry-externally/) settings.

#### Attachments

Select an attachment typed property to render a preview of the attachment media. For details on configuring an attachment property, see [Upload attachments](/docs/foundry/action-types/upload-attachments/).

## Widget properties

* **Object selection:** The object whose property you want to display.
* **Property to display:** The property containing or pointing to a supported media source.

## Template configuration

* **Object selection:** The object whose property you want to display.
