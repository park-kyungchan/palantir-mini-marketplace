---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/imageLayoutAwareContentExtractionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/imageLayoutAwareContentExtractionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "863bc351696883becaf512d41655a7a66510cca15c82c122d4bea48d2f4a4396"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Extract layout-aware content from images"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract layout-aware content from images

> Supported in: Batch, Faster

Extracts content from images, while preserving the original layout.

**Expression categories:** Media

## Declared arguments

* **Languages to detect:** Languages to detect in the input files.<br>*Set\<Enum\<Afrikaans, Albanian, Amharic, Arabic, Armenian, Assamese, Azerbaijani, Azerbaijani - Cyrilic, Basque, Belarusian, and more ...>>*
* **Media reference:** The image to extract content from.<br>*Expression\<Media reference>*
* **Output format:** Output will be a string.<br>*Enum\<Full extract, Text and tables>*
* *optional* **Error handling:** Determines the behavior of the pipeline for inputs that fail to process.<br>*Enum\<FAIL, NULL>*

**Output type:** *Array\<Struct\<block\_index:Integer, block\_id:String, block\_type:String, content:String, bounding\_box:String, languages:Array\<String>, confidence:Double>> | String*

## Examples

### Example 1: Base case

**Argument values:**

* **Languages to detect:** {`ENG`}
* **Media reference:** `mediaReference`
* **Output format:** `TEXT`
* **Error handling:** `FAIL_FAST`

| mediaReference | **Output** |
| ----- | ----- |
| {"mimeType":"image/png","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.main.media-set.a", "mediaItemRid":"ri.mio.main.media-item.a"}}} | extracted content |

***
