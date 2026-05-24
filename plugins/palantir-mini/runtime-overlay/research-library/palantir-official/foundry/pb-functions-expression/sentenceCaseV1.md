---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/sentenceCaseV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/sentenceCaseV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "92654155f175e32d2df4f3beaaa6f07d53fdb85b8dabb460981ae3fd39ea2b2a"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Sentence case"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sentence case

> Supported in: Batch, Faster, Streaming

Converts the first character of the first word to be uppercase.

**Expression categories:** String

## Declared arguments

* **Expression:** String expression to apply sentence case to.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** hello world

**Output:** Hello world

***

### Example 2: Base case

**Argument values:**

* **Expression:** this is a test. another test? yes, another test!

**Output:** This is a test. Another test? Yes, another test!

***

### Example 3: Base case

**Argument values:**

* **Expression:** *empty string*

**Output:** *empty string*

***

### Example 4: Base case

**Argument values:**

* **Expression:** hello world! how are you? have a nice day.

**Output:** Hello world! How are you? Have a nice day.

***

### Example 5: Base case

**Argument values:**

* **Expression:** hELLO WORLD

**Output:** HELLO WORLD

***

### Example 6: Base case

**Argument values:**

* **Expression:** how many people? 100 people!

**Output:** How many people? 100 people!

***

### Example 7: Base case

**Argument values:**

* **Expression:** no punctuation

**Output:** No punctuation

***

### Example 8: Null case

**Argument values:**

* **Expression:** *null*

**Output:** *null*

***
