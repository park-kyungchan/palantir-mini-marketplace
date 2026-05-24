---
sourceUrl: "https://www.palantir.com/docs/foundry/action-types/upload-media/"
canonicalUrl: "https://palantir.com/docs/foundry/action-types/upload-media/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "92d23782cc752e14367d5c3325242830f50354ed272d410a1c847c684f2cc2b8"
product: "foundry"
docsArea: "action-types"
locale: "en"
upstreamTitle: "Documentation | Action types > Upload media"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Upload media

Actions support uploading media files using an action form or table. For most use cases in Foundry, uploading to media reference properties is the recommended method.

Media reference properties (backed by [media sets](/docs/foundry/data-integration/media-sets/)) offer several advantages over attachment properties:

* **Scalability:** Support for billions of files with efficient storage and retrieval.
* **Built-in transformations:** Many media transformations and LLM capabilities are supported and easy to use out of the box.
* **Advanced previews:** Built-in rendering and rich preview functionality for supported formats.
* **Format support:** Support for tailored workflows on both standard formats and specialized formats, such as NITF, GeoTIFF, and DICOM.

Users can upload media files via a file-picker interface, with files persisted to the media set upon successful action submission.

:::callout{theme="warning"}
[Format conversions](/docs/foundry/media-sets-advanced-formats/media-overview/#additional-input-formats) only happen after the action completes and the media file has been uploaded to the media set.
:::

## Configuration

For detailed instructions on configuring media reference properties and setting up media upload actions, see [Configure media reference properties](/docs/foundry/object-link-types/base-types/#configure-media-reference-properties) and [Upload media](/docs/foundry/media-sets-advanced-formats/upload-media/).

## Permissions

Permissions for uploading media via an action are managed by the [action submission criteria](/docs/foundry/action-types/submission-criteria/). If users satisfy the action submission criteria, they do not need any permissions on the backing media set to upload media.

:::callout{theme="neutral"}
Edit permission on a media set will be checked when it is added to an object type or referenced by an action type for the first time. Adding a media set to your ontology delegates access control from the media set to the ontology. This means that anyone who can manage actions on the object type, can control who is able to upload media to the media set.
:::
