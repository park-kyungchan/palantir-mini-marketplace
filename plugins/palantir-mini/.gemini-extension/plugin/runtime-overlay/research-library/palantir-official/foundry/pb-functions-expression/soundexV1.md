---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/soundexV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/soundexV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a677bd044b1b276eb690c31ff1fcf31f989b63c89e6c9333f0afd1410c92fa87"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Soundex"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Soundex

> Supported in: Batch, Faster

Compute the soundex encoding (a phonetic representation) for a word.

**Expression categories:** String

## Declared arguments

* **Expression:** Input string (ideally a single word) to be encoded.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `input_string`

| input\_string | **Output** |
| ----- | ----- |
| cat | C300 |
| caat | C300 |
| two | T000 |
| too | T000 |
| to | T000 |
| four | F600 |
| for | F600 |
| fore | F600 |
| fur | F600 |
| meow | M000 |
| me ow | M000 |

***

### Example 2: Null case

**Argument values:**

* **Expression:** `input_string`

| input\_string | **Output** |
| ----- | ----- |
| *null* | *null* |
| *empty string* | *empty string* |

***
