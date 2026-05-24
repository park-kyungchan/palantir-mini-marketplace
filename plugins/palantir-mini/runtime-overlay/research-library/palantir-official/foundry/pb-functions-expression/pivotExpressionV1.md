---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/pivotExpressionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/pivotExpressionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2886c5491e292518db8cbf5e728861b75631cff1de5de424428af6d1ef258400"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Pivot"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Pivot

> Supported in: Streaming

Apply an aggregate expression in a pivot context. The aggregation will run as a set of separate aggregations scoped to each distinct value of the pivot expression. The output is a map from pivot value to aggregate expression value.

**Expression categories:** Aggregate

## Declared arguments

* **Aggregate expression:** The aggregate expression to apply.<br>*Expression\<V>*
* **Pivot expression:** The pivot expression to apply.<br>*Expression\<K>*

**Type variable bounds:** *K accepts ComparableType\*\*V accepts AnyType*

**Output type:** *Map\<K, V>*

## Examples

### Example 1: Base case

**Argument values:**

* **Aggregate expression:** <br>sum(<br> expression: `value`,<br>)
* **Pivot expression:** `pivot`

**Given input table:**

| pivot | value |
| ----- | ----- |
| a | 1 |
| b | 2 |
| a | 3 |

**Outputs:** {<br> a -> 4,<br> b -> 2,<br>}

***

### Example 2: Base case

**Argument values:**

* **Aggregate expression:** <br>sum(<br> expression: `value`,<br>)
* **Pivot expression:** <br>cleanString(<br> cleanActions: {`trim`},<br> expression: `pivot`,<br>)

**Given input table:**

| pivot | value |
| ----- | ----- |
|  a    | 1 |
| b  | 2 |
|    a | 3 |

**Outputs:** {<br> a -> 4,<br> b -> 2,<br>}

***
