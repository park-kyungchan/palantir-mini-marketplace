---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/uuidV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/uuidV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b2d5ce14fe9bdf61caa9e362a10c7fe8fab79e09edd70962a458ef0189387fd6"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Universally unique identifier (uuid) (unstable)"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Universally unique identifier (uuid) (unstable)

> Supported in: Batch, Faster, Streaming

Returns a column of UUID. This is not deterministic and will not produce the same result on repeated builds. This is not the preferred way to build an id column and users should look into SHA-256 or others that are deterministic, for example UUID v5.

**Expression categories:** String

## Declared arguments

This function does not take any arguments.

**Output type:** *String*

## Examples

### Example 1: Base case

**Description:** Generate a column of UUID values (V4).

**Argument values:**

**Output:** 5c5622fe-e30e-4491-99b6-6213be506dec

***
