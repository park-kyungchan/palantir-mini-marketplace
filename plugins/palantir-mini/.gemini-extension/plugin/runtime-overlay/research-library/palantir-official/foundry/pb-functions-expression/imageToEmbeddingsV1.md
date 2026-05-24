---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/imageToEmbeddingsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/imageToEmbeddingsV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "06d76e24615733e1c38088113e8baa7aea63f2988d566ce1894731ce1eae6fc7"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Image to embeddings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Image to embeddings

> Supported in: Batch

Converts images into embeddings using the provided model.

**Expression categories:** Media

## Declared arguments

* **Media reference:** Column containing media references (images) to convert to embeddings.<br>*Expression\<Media reference>*
* **Model:** The embedding model to use for the conversion. Must support vision capabilities.<br>*Model*
* *optional* **Output mode:** Choose between simply returning the output or returning a struct, containing either the output in a field named 'ok', or any errors in a field named 'errors'.<br>*Enum\<Simple, With errors>*

**Output type:** *Embedded vector*

## Examples

### Example 1: Base case

**Description:** Example embeddings for an image.

**Argument values:**

* **Media reference:** `mediaRef`
* **Model:** <br>googleSiglip2Embedding(<br><br>)
* **Output mode:** *null*

| mediaRef | **Output** |
| ----- | ----- |
| {<br>  "mimeType": "image/jpeg",<br>  "reference": {<br> "type": "mediaSetViewItem",<br> "... | embeddings-result |

***

### Example 2: Null case

**Description:** Null input should have a null output.

**Argument values:**

* **Media reference:** `mediaRef`
* **Model:** <br>googleSiglip2Embedding(<br><br>)
* **Output mode:** *null*

| mediaRef | **Output** |
| ----- | ----- |
| *null* | *null* |

***
