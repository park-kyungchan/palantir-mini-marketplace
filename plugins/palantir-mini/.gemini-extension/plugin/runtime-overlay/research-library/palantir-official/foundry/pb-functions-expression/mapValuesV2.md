---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/mapValuesV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/mapValuesV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d526bf6fb688e5749bd581acb4d0030ca7de44030262400fe3648e946005fe65"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Map values"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Map values

> Supported in: Batch, Faster, Streaming

Changes the values of the input column to new values based on a map of key-value pairs. If the input value is not found in the map, the default value is used.

**Expression categories:** Data preparation

## Declared arguments

* **Column to replace values in:** Column containing the initial values to be mapped to new values.<br>*Expression\<T1>*
* **Default value:** The default value to be added to the output column if the input value is not found in the map.<br>*Expression\<T2>*
* **Values map:** Map consisting of key-value pairs. The key of the map is the original value found in the input to be mapped to a new one, whereas the value of the map represents the new value to be replaced with.<br>*Expression\<Map\<T1, T2>>*

**Type variable bounds:** *T1 accepts ComparableType\*\*T2 accepts AnyType*

**Output type:** *T2*

## Examples

### Example 1: Base case

**Argument values:**

* **Column to replace values in:** `country`
* **Default value:** <br>cast(<br> expression: *null*,<br> type: String,<br>)
* **Values map:** {<br> Denmark -> DNK,<br> United Kingdom -> UK,<br>}

| country | **Output** |
| ----- | ----- |
| United Kingdom | UK |
| Denmark | DNK |
| United States of America | *null* |

***

### Example 2: Base case

**Argument values:**

* **Column to replace values in:** `country`
* **Default value:** `country`
* **Values map:** {<br> United Kingdom -> *null*,<br>}

| country | **Output** |
| ----- | ----- |
| United Kingdom | *null* |
| *null* | *null* |

***

### Example 3: Base case

**Argument values:**

* **Column to replace values in:** `country`
* **Default value:** `country`
* **Values map:** {<br> Denmark -> DNK,<br> United Kingdom -> *null*,<br>}

| country | **Output** |
| ----- | ----- |
| United Kingdom | *null* |
| *null* | *null* |

***

### Example 4: Null case

**Argument values:**

* **Column to replace values in:** `country`
* **Default value:** `country`
* **Values map:** {<br> United Kingdom -> UK,<br>}

| country | **Output** |
| ----- | ----- |
| United Kingdom | UK |
| *null* | *null* |

***
