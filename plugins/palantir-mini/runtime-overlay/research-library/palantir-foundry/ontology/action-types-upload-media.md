---
source: https://www.palantir.com/docs/foundry/action-types/upload-media/
fetched: 2026-04-20
section: ontology-deep
doc_title: Upload media
---

# Upload media

Actions support uploading media files using an action form or table. Media reference properties (backed by media sets) are recommended over attachment properties for most use cases.

## Advantages of media reference properties

- **Scalability** — supports billions of files with efficient storage and retrieval.
- **Built-in transformations** — many media transformations and LLM capabilities out of the box.
- **Advanced previews** — built-in rendering and rich preview for supported formats.
- **Format support** — NITF, GeoTIFF, DICOM, and other specialized formats.

Format conversions only happen after the action completes and the media file has been uploaded to the media set.

## Configuration

See [Configure media reference properties](https://www.palantir.com/docs/foundry/object-link-types/base-types/#configure-media-reference-properties) and the [Upload media](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/upload-media/) page for setup instructions.

## Permissions

Permissions for uploading media are governed by the action's submission criteria. If a user satisfies submission criteria, they do not need direct permissions on the backing media set. Adding a media set to an object type delegates access control from the media set to the Ontology.
