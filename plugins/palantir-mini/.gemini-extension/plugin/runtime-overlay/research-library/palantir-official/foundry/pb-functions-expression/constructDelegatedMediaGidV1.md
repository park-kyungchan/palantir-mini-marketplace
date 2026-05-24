---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/constructDelegatedMediaGidV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/constructDelegatedMediaGidV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bce3fd307662c831a06e64140d8aaa4cb126bf7098d15c67e59d7299e63822e9"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Construct delegated media Gotham identifier (GID)"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Construct delegated media Gotham identifier (GID)

> Supported in: Batch, Streaming

Expression to construct a valid delegated media Gotham identifier (GID) from components. If result is more than 1024 characters, produces a null row.

**Expression categories:** Other

## Declared arguments

* **Media locator:** Nonempty locator for the delegated media. Null or empty values result in null output.<br>*Expression\<String>*
* **Media type:** Nonempty type of the delegated media. Null or empty values result in null output.<br>*Expression\<String>*
* **Producer instance:** UUID for the media producer. An invalid UUID will nullify all output.<br>*Literal\<String>*

**Output type:** *Delegated media Gotham identifier (GID)*

## Examples

### Example 1: Base case

**Argument values:**

* **Media locator:** `locator`
* **Media type:** `mediaType`
* **Producer instance:** invalidUuid

| mediaType | locator | **Output** |
| ----- | ----- | ----- |
| testaudiotype | *empty string* | *null* |

***

### Example 2: Base case

**Argument values:**

* **Media locator:** `locator`
* **Media type:** `mediaType`
* **Producer instance:** invalidUuid

| mediaType | locator | **Output** |
| ----- | ----- | ----- |
| *empty string* | testlocator | *null* |

***

### Example 3: Base case

**Argument values:**

* **Media locator:** `locator`
* **Media type:** `mediaType`
* **Producer instance:** invalidUuid

| mediaType | locator | **Output** |
| ----- | ----- | ----- |
| testaudiotype | testlocator | *null* |

***

### Example 4: Base case

**Argument values:**

* **Media locator:** `locator`
* **Media type:** `mediaType`
* **Producer instance:** 12345678-1234-1234-1234-123456789012

| mediaType | locator | **Output** |
| ----- | ----- | ----- |
| *null* | testlocator | *null* |

***

### Example 5: Base case

**Argument values:**

* **Media locator:** `locator`
* **Media type:** `mediaType`
* **Producer instance:** 12345678-1234-1234-1234-123456789012

| mediaType | locator | **Output** |
| ----- | ----- | ----- |
| testaudiotype | *null* | *null* |

***

### Example 6: Base case

**Argument values:**

* **Media locator:** `locator`
* **Media type:** `mediaType`
* **Producer instance:** 12345678-1234-1234-1234-123456789012

| mediaType | locator | **Output** |
| ----- | ----- | ----- |
| testaudiotype | testlocator | ri.gotham-delegated-media.12345678-1234-1234-1234-123456789012.testaudiotype.testlocator |

***
