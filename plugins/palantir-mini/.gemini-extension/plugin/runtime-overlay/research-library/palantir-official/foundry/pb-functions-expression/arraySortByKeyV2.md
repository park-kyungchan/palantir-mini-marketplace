---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/arraySortByKeyV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/arraySortByKeyV2/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9d0abf770ce1fc29ea9338d1bdd227b8c59af4712270875c947f37c59f655a75"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Array sort by struct key"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Array sort by struct key

> Supported in: Batch, Streaming

Returns a sorted array of the given input array of structs sorted by the values of the given struct keys.

**Expression categories:** Array

## Declared arguments

* **Input array:** Input array of structs to be sorted.<br>*Expression\<Array\<Struct>>*
* **Sort keys:** Struct keys to sort array by in order of sort priority. Sort nested struct elements with multiple entries like \['author', 'age'].<br>*List\<Tuple\<StructLocator, Enum\<Ascending, Descending>>>*

**Output type:** *Array\<Struct>*

## Examples

### Example 1: Base case

**Argument values:**

* **Input array:** \[ {<br> **age**: 20,<br>}, {<br> **age**: 10,<br>}, {<br> **age**: 30,<br>} ]
* **Sort keys:** \[(age, `ASCENDING`)]

**Output:** \[ {<br> **age**: 10,<br>}, {<br> **age**: 20,<br>}, {<br> **age**: 30,<br>} ]

***

### Example 2: Base case

**Argument values:**

* **Input array:** \[ {<br> **age**: 20,<br>}, {<br> **age**: 10,<br>}, {<br> **age**: 30,<br>} ]
* **Sort keys:** \[(age, `DESCENDING`)]

**Output:** \[ {<br> **age**: 30,<br>}, {<br> **age**: 20,<br>}, {<br> **age**: 10,<br>} ]

***

### Example 3: Base case

**Argument values:**

* **Input array:** \[ {<br> **age**: 20,<br> **height**: 77,<br>}, {<br> **age**: 20,<br> **height**...
* **Sort keys:** \[(age, `ASCENDING`), (height, `DESCENDING`)]

**Output:** \[ {<br> **age**: 10,<br> **height**: 80,<br>}, {<br> **age**: 10,<br> **height**...

***

### Example 4: Base case

**Argument values:**

* **Input array:** \[ {<br> **age**: 20,<br> **height**: 77,<br>}, {<br> **age**: 20,<br> **height**...
* **Sort keys:** \[(age, `ASCENDING`), (height, `ASCENDING`)]

**Output:** \[ {<br> **age**: 10,<br> **height**: 65,<br>}, {<br> **age**: 10,<br> **height**...

***

### Example 5: Base case

**Argument values:**

* **Input array:** \[ {<br> **subStructKey**: {<br> **age**: 20,<br>},<br>}, {<br> **subStructKey**: {<br> **age**: 10,<br>},<br>}, {<br> **subStructKey**: {<br> **age**: 30,<br>},<br>} ]
* **Sort keys:** \[(subStructKey.age, `ASCENDING`)]

**Output:** \[ {<br> **subStructKey**: {<br> **age**: 10,<br>},<br>}, {<br> **subStructKey**: {<br> **age**: 20,<br>},<br>}, {<br> **subStructKey**: {<br> **age**: 30,<br>},<br>} ]

***

### Example 6: Null case

**Argument values:**

* **Input array:** \[ {<br> **age**: *null*,<br> **height**: 77,<br>}, {<br> **age**: *null*,<br> \*\*...
* **Sort keys:** \[(age, `ASCENDING`)]

**Output:** \[ {<br> **age**: *null*,<br> **height**: 77,<br>}, {<br> **age**: *null*,<br> \*\*...

***

### Example 7: Null case

**Argument values:**

* **Input array:** \[ {<br> **age**: 10,<br>}, {<br> **age**: *null*,<br>}, {<br> **age**: 30,<br>} ]
* **Sort keys:** \[(age, `ASCENDING`)]

**Output:** \[ {<br> **age**: *null*,<br>}, {<br> **age**: 10,<br>}, {<br> **age**: 30,<br>} ]

***

### Example 8: Null case

**Argument values:**

* **Input array:** \[ {<br> **age**: 10,<br>}, {<br> **age**: *null*,<br>}, {<br> **age**: 30,<br>} ]
* **Sort keys:** \[(age, `DESCENDING`)]

**Output:** \[ {<br> **age**: 30,<br>}, {<br> **age**: 10,<br>}, {<br> **age**: *null*,<br>} ]

***
