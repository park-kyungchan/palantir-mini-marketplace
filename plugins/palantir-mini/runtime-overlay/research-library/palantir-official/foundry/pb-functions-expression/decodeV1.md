---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/decodeV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/decodeV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "54f5546f15a4ca6d7965f0a22bf2e461870886004c1ac8dcde3f4160bd8c63b3"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Decode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Decode

> Supported in: Batch, Faster, Streaming

Decode the given expression using the specified charset.

**Expression categories:** Binary, Cast

## Declared arguments

* **Charset:** Charset used for decoding.<br>*Enum\<ISO\_8859\_1, US\_ASCII, UTF\_16, UTF\_16BE, UTF\_16LE, UTF\_8, Windows-31J>*
* **Expression:** Expression to decode.<br>*Expression\<Binary>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Charset:** `UTF_16`
* **Expression:** `city`

| city | **Output** |
| ----- | ----- |
| /v8ATABvAG4AZABvAG4= | London |
| /v8AQwBvAHAAZQBuAGgAYQBnAGUAbg== | Copenhagen |
| /v8ATgBlAHcAIABZAG8AcgBr | New York |

***

### Example 2: Base case

**Argument values:**

* **Charset:** `UTF_8`
* **Expression:** `city`

| city | **Output** |
| ----- | ----- |
| TG9uZG9u | London |
| Q29wZW5oYWdlbg== | Copenhagen |
| TmV3IFlvcms= | New York |

***

### Example 3: Null case

**Argument values:**

* **Charset:** `UTF_8`
* **Expression:** `city`

| city | **Output** |
| ----- | ----- |
| *null* | *null* |

***
