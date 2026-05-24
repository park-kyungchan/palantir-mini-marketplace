---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/isValidUuidV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/isValidUuidV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "392399245468c727ae12cab960b89c90fe9b04ed99eb1bf908b83de3c74d239d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Is valid uuid"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Is valid uuid

> Supported in: Batch, Faster, Streaming

Returns true if the input is a valid uuid.

**Expression categories:** Boolean

## Declared arguments

* **Expression:** String representing a uuid.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `uuid`

| uuid | **Output** |
| ----- | ----- |
| 5c5622fe-e30e-4491-99b6-6213be506dec | true |
| 9daf08e9-d2e2-4172-86cc-9102c4c770b3 | true |
| 9DAF08E9-D2E2-4172-86CC-9102C4C770B3 | true |
| UUID with text before 9daf08e9-d2e2-4172-86cc-9102c4c770b3 | false |
| a1-a1-a1-a1-a1 | false |
| not a uuid | false |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `uuid`

| uuid | **Output** |
| ----- | ----- |
| *null* | false |

***
