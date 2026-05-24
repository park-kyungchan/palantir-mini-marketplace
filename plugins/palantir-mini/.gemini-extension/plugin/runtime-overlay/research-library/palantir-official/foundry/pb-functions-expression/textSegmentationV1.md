---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/textSegmentationV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/textSegmentationV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d75a46481cb1511bb1106e1c9698f3d979a68b3aef8d3c23e5fe68115297a405"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Text segmentation"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Text segmentation

> Supported in: Batch, Faster, Streaming

Extract a series of text segments using sliding window segmentation.

**Expression categories:** String

## Declared arguments

* **Expression:** The body of text that is to be segmented.<br>*Expression\<String>*
* **Length:** The length in terms of words for the segments that the text will be broken into.<br>*Expression\<Integer>*
* *optional* **Overflow:** The number of words a segment can share with another segment.<br>*Expression\<Integer>*

**Output type:** *Array\<String>*

## Examples

### Example 1: Base case

**Description:** This test shows the abilty of the tranform to properly segment asmall set of text where the end will be its own segment as well.

**Argument values:**

* **Expression:** `string`
* **Length:** 3
* **Overflow:** 1

| string | **Output** |
| ----- | ----- |
| hello world this is a test string | \[ hello world this, this is a, a test string, string ] |

***

### Example 2: Base case

**Description:** Test with negative overflow.

**Argument values:**

* **Expression:** `string`
* **Length:** `length`
* **Overflow:** `overflow`

| string | length | overflow | **Output** |
| ----- | ----- | ----- | ----- |
| She sells sea shells by | 2 | -1 | \[ She sells, shells by ] |

***

### Example 3: Base case

**Description:** A larger test with overflow and a smaller segment at the end.

**Argument values:**

* **Expression:** `string`
* **Length:** `length`
* **Overflow:** `overflow`

| string | length | overflow | **Output** |
| ----- | ----- | ----- | ----- |
| hello world this is a larger test with overlap, the nature of the human spirit is strange as such i ... | 10 | 3 | \[ hello world this is a larger test with overlap, the, with overlap, the nature of the human spirit ... |

***

### Example 4: Base case

**Description:** Test a string where overflow is set to 0and the last segment is smaller than a full length.

**Argument values:**

* **Expression:** `string`
* **Length:** 3
* **Overflow:** *null*

| string | **Output** |
| ----- | ----- |
| hello world this is a test string | \[ hello world this, is a test, string ] |

***

### Example 5: Base case

**Description:** Test with no overflow where the segments are perfectly divided by length.

**Argument values:**

* **Expression:** `string`
* **Length:** `length`
* **Overflow:** `overflow`

| string | length | overflow | **Output** |
| ----- | ----- | ----- | ----- |
| hello world this is a test string without overlap | 3 | 0 | \[ hello world this, is a test, string without overlap ] |

***

### Example 6: Null case

**Description:** Test with no overflow where the segments are perfectly divided by length.

**Argument values:**

* **Expression:** `string`
* **Length:** `length`
* **Overflow:** `overflow`

| string | length | overflow | **Output** |
| ----- | ----- | ----- | ----- |
| *null* | *null* | *null* | *null* |

***

### Example 7: Null case

**Description:** Test with no overflow where the segments are perfectly divided by length.

**Argument values:**

* **Expression:** `string`
* **Length:** `length`
* **Overflow:** `overflow`

| string | length | overflow | **Output** |
| ----- | ----- | ----- | ----- |
| *null* | 1 | *null* | *null* |

***

### Example 8: Null case

**Description:** Test with no overflow where the segments are perfectly divided by length.

**Argument values:**

* **Expression:** `string`
* **Length:** `length`
* **Overflow:** `overflow`

| string | length | overflow | **Output** |
| ----- | ----- | ----- | ----- |
| Hello world | *null* | *null* | *null* |

***
