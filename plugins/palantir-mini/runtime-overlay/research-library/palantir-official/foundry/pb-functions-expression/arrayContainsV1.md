---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arrayContainsV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arrayContainsV1/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "acf2a51dd583563a28c0282093d33f500c0ddeea6e909450dbbbb2bd69acdaae"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array contains"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array contains

> Supported in: Batch, Faster, Streaming

Returns true if the array contains the value.

**Expression categories:** Array, Boolean

## Declared arguments

* **Array:** The array to search within.<br>*Expression\<Array\<ComparableType>>*
* **Value:** The value to search for within the array.<br>*Expression\<ComparableType>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Argument values:**

* **Array:** `part_ids`
* **Value:** BRR-123

| part\_ids | **Output** |
| ----- | ----- |
| \[ AWE-112, BRR-123 ] | true |
| \[ AWE-222, ABC-543 ] | false |

***

### Example 2: Base case

**Description:** Comparisons between different numeric types is allowed.

**Argument values:**

* **Array:** `ids`
* **Value:** 1

| ids | **Output** |
| ----- | ----- |
| \[ 1, 2 ] | true |
| \[ 2, 3 ] | false |

***

### Example 3: Null case

**Argument values:**

* **Array:** `array`
* **Value:** `value`

| array | value | **Output** |
| ----- | ----- | ----- |
| \[ 1, 2, 3 ] | *null* | false |
| *null* | 1 | false |
| *null* | *null* | false |
| \[ 1, 2, 3, *null* ] | *null* | true |

***

### Example 4: Edge case

**Description:** Float types should be cast to integers when checking for equality.

**Argument values:**

* **Array:** `ids`
* **Value:** 1.0

| ids | **Output** |
| ----- | ----- |
| \[ 1, 2 ] | true |

***

### Example 5: Edge case

**Description:** Float types should not be rounded when checking for equality.

**Argument values:**

* **Array:** `ids`
* **Value:** 1.2

| ids | **Output** |
| ----- | ----- |
| \[ 1, 2 ] | false |

***
