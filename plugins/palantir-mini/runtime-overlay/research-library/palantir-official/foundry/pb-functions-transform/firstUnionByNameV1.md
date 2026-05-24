---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/firstUnionByNameV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/firstUnionByNameV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "56eace243776b191bfa6a954680c9cd0c2df768da52e417ffa58c4d8b2d1e65f"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > First union by name"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# First union by name

> Supported in: Batch, Faster

Unions a set of datasets together on columns from the first dataset, adding nulls when columns are missing. Columns that are not present in the first dataset are removed.

**Transform categories**: Join

## Declared arguments

* **Datasets to union:** The datasets being unioned together.<br>*List\<Table>*

## Examples

### Example 1: Base case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a, ri.foundry.main.dataset.b]

**Inputs:**

ri.foundry.main.dataset.a

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

ri.foundry.main.dataset.b

| recently\_serviced | tail\_number | home\_country |
| ----- | ----- | ----- |
| true | AA-200 | US |
| true | BN-435 | UK |
| true | BN-111 | UK |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |
| true | AA-200 | *null* |
| true | BN-435 | *null* |
| true | BN-111 | *null* |

***

### Example 2: Base case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a, ri.foundry.main.dataset.b, ri.foundry.main.dataset.c]

**Inputs:**

ri.foundry.main.dataset.a

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

ri.foundry.main.dataset.b

| home\_country | tail\_number | recently\_serviced |
| ----- | ----- | ----- |
| US | AA-200 | true |
| UK | BN-435 | true |
| UK | BN-111 | true |

ri.foundry.main.dataset.c

| home\_country | tail\_number |
| ----- | ----- |
| DK | SK-908 |
| CH | LX-17 |
| IN | AI-144 |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |
| true | AA-200 | *null* |
| true | BN-435 | *null* |
| true | BN-111 | *null* |
| *null* | SK-908 | *null* |
| *null* | LX-17 | *null* |
| *null* | AI-144 | *null* |

***

### Example 3: Base case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a, ri.foundry.main.dataset.b]

**Inputs:**

ri.foundry.main.dataset.a

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

ri.foundry.main.dataset.b

|
|

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

***

### Example 4: Null case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a, ri.foundry.main.dataset.b]

**Inputs:**

ri.foundry.main.dataset.a

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| *null* | *null* | *null* |

ri.foundry.main.dataset.b

| recently\_serviced | tail\_number | home\_country |
| ----- | ----- | ----- |
| *null* | *null* | *null* |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| *null* | *null* | *null* |
| *null* | *null* | *null* |

***

### Example 5: Edge case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a, ri.foundry.main.dataset.b]

**Inputs:**

ri.foundry.main.dataset.a

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |

ri.foundry.main.dataset.b

| recently\_serviced | tail\_number | home\_country |
| ----- | ----- | ----- |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |

***

### Example 6: Edge case

**Argument values:**

* **Datasets to union:** \[ri.foundry.main.dataset.a]

**Input:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

**Output:**

| recently\_serviced | tail\_number | airline\_code |
| ----- | ----- | ----- |
| true | KK-150 | KK |
| false | XB-120 | XB |
| true | MT-190 | MT |

***
