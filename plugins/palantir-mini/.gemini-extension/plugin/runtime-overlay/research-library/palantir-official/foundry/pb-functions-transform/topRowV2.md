---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/topRowV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/topRowV2/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "669723dc2caa9260e8a363e1b8f7fb8173915e0239e572bc6f8f15906a8ee198"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Top rows"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Top rows

> Supported in: Batch, Faster

Picks the top rows in each sorted partition.

**Transform categories**: Aggregate

## Declared arguments

* **Dataset:** Input dataset.<br>*Table*
* **Partition by columns:** Set of columns to determine each partition from.<br>*Set\<Column\<AnyType>>*
* **Sort specification:** Specification for how to sort each partition. At least one specification is required.<br>*List\<Tuple\<Column\<AnyType>, Enum\<Ascending, Descending>>>*
* *optional* **Number of rows:** Number of rows to select, defaults to 1.<br>*Literal\<Integer>*

## Examples

### Example 1: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Partition by columns:** {`airline`}
* **Sort specification:** \[(`airport`, `DESCENDING`), (`miles`, `ASCENDING`)]
* **Number of rows:** *null*

**Input:**

| airline | airport | miles |
| ----- | ----- | ----- |
| foundry airways | JFK | 1002345 |
| foundry airways | LHR | 2221324 |
| new air | SFO | 21356673 |
| new air | JFK | 12323456 |
| foundry airways | LHR | 12542352 |
| new air | JFK | 12232355 |

**Output:**

| airline | airport | miles |
| ----- | ----- | ----- |
| foundry airways | LHR | 2221324 |
| new air | SFO | 21356673 |

***

### Example 2: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Partition by columns:** {}
* **Sort specification:** \[(`airline`, `DESCENDING`), (`airport`, `DESCENDING`), (`miles`, `ASCENDING`)]
* **Number of rows:** 2

**Input:**

| airline | airport | miles |
| ----- | ----- | ----- |
| foundry airways | JFK | 1002345 |
| foundry airways | LHR | 2221324 |
| new air | SFO | 21356673 |
| new air | JFK | 12323456 |
| foundry airways | LHR | 12542352 |
| new air | JFK | 12232355 |

**Output:**

| airline | airport | miles |
| ----- | ----- | ----- |
| new air | SFO | 21356673 |
| new air | JFK | 12232355 |

***

### Example 3: Base case

**Argument values:**

* **Dataset:** ri.foundry.main.dataset.a
* **Partition by columns:** {}
* **Sort specification:** \[]
* **Number of rows:** 1

**Input:**

| airline | airport | miles |
| ----- | ----- | ----- |
| foundry airways | JFK | 1002345 |
| foundry airways | LHR | 2221324 |
| new air | SFO | 21356673 |
| new air | JFK | 12323456 |
| foundry airways | LHR | 12542352 |
| new air | JFK | 12232355 |

**Output:**

| airline | airport | miles |
| ----- | ----- | ----- |
| foundry airways | JFK | 1002345 |

***
