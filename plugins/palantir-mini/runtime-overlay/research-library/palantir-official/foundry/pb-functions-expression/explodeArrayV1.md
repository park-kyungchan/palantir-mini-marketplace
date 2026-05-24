---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/explodeArrayV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/explodeArrayV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "21cd682b560d4f8624035cfa60f799df1ac267719e1b5922cd876dd13ef9c13d"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Explode array"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Explode array

> Supported in: Batch, Faster, Streaming

Explode array into a row per value.

**Expression categories:** Array

## Declared arguments

* **Expression:** The array to explode.<br>*Expression\<Array\<T>>*
* *optional* **Keep empty / null arrays:** If true, empty arrays and nulls will be kept as nulls in the output, otherwise they will be filtered.<br>*Literal\<Boolean>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *T*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `array`
* **Keep empty / null arrays:** false

**Given input table:**

| array |
| ----- |
| \[ 1, 2 ] |

**Expected output table:** | array |
| ----- |
| 1 |
| 2 |

***

### Example 2: Base case

**Argument values:**

* **Expression:** `array`
* **Keep empty / null arrays:** false

**Given input table:**

| array |
| ----- |
| \[ 1, 2 ] |
| \[  ] |

**Expected output table:** | array |
| ----- |
| 1 |
| 2 |

***

### Example 3: Base case

**Argument values:**

* **Expression:** `array`
* **Keep empty / null arrays:** true

**Given input table:**

| array |
| ----- |
| \[ 1, 2 ] |
| \[  ] |

**Expected output table:** | array |
| ----- |
| 1 |
| 2 |
| *null* |

***

### Example 4: Base case

**Argument values:**

* **Expression:** `array`
* **Keep empty / null arrays:** true

**Given input table:**

| array |
| ----- |
| \[ 1, 2 ] |
| \[ *null* ] |

**Expected output table:** | array |
| ----- |
| 1 |
| 2 |
| *null* |

***
