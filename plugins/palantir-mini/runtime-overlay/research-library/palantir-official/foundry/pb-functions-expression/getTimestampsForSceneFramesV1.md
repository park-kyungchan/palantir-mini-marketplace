---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/getTimestampsForSceneFramesV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/getTimestampsForSceneFramesV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "97c39f2d6979c12639b1e8e4a551b2ff16c2c7f796aee12f6e17ee55fba5d429"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Get timestamps for scene frames"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Get timestamps for scene frames

> Supported in: Batch

Get the timestamps and scene scores for detected scene frame transitions in the video.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The video from which scene frame timestamps are extracted.<br>*Expression\<Media reference>*
* *optional* **Scene sensitivity:** Controls how easily scene changes are detected. Higher sensitivity detects more subtle transitions.<br>*Enum\<Less sensitive, More sensitive, Standard>*

**Output type:** *Array\<Struct\<timestamp:String, scene\_score:String>>*
