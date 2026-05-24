---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/mappingJoinV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/mappingJoinV1/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d6d1d7e132e8939517253f00eff61479e8d859d25cdfbff6e28995a8d1a6fa97"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Mapping join"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Mapping join

> Supported in: Batch, Faster

Replaces values from the target columns in the source dataset with values in the mapping dataset.

**Transform categories**: Join

## Declared arguments

* **Input dataset:** Source dataset containing columns to be mapped.<br>*Table*
* **Key column for mapping values:** Key column for mapping values.<br>*Column\<T1>*
* **Mapping dataset:** Dataset containing values to use for mapping.<br>*Table*
* **Target columns:** List of columns from left that will have values replaced.<br>*List\<Column\<T1>>*
* **Values to use for mapping:** Values to use for mapping.<br>*Column\<T2>*
* *optional* **Assume unique mappings:** If true, a distinct operation will be applied to the key column of the mapping table. If false, and the mapping table contains duplicate keys, the resulting dataset will contain duplicate rows based on each mapping. By default, this operation is applied. Note: setting this to false may result in better performance.<br>*Literal\<Boolean>*
* *optional* **Default value:** If empty, values from the target columns will remain unchanged if no mapping is found in the mapping table. By default, this is empty.<br>*Expression\<T2>*

**Type variable bounds:** *T1 accepts AnyType\*\*T2 accepts AnyType*

## Examples

### Example 1: Base case

**Argument values:**

* **Input dataset:** ri.foundry.main.dataset.input
* **Key column for mapping values:** `flight_code`
* **Mapping dataset:** ri.foundry.main.dataset.mapping
* **Target columns:** \[`flight_no`, `next_flight`]
* **Values to use for mapping:** `flight_number`
* **Assume unique mappings:** *null*
* **Default value:** unknown

**Inputs:**

ri.foundry.main.dataset.input

| flight\_no | next\_flight | departure\_time |
| ----- | ----- | ----- |
| 533 | 112 | 2022-01-20T10:45:00Z |
| 934 | 533 | 2022-01-20T11:20:00Z |
| 222 | 934 | 2022-01-20T11:20:00Z |

ri.foundry.main.dataset.mapping

| flight\_code | flight\_number | airline |
| ----- | ----- | ----- |
| 112 | XB-123 | foundry airlines |
| 533 | MT-444 | foundry airlines |
| 934 | KK-123 | new air |

**Output:**

| flight\_no | next\_flight | departure\_time |
| ----- | ----- | ----- |
| MT-444 | XB-123 | 2022-01-20T10:45:00Z |
| KK-123 | MT-444 | 2022-01-20T11:20:00Z |
| unknown | KK-123 | 2022-01-20T11:20:00Z |

***
