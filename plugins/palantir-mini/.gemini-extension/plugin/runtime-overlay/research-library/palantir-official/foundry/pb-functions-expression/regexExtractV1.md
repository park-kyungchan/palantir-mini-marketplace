---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/regexExtractV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/regexExtractV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "31105bb8490cdd997d3ce8def6934ea09f16595d136988cef32dc19716f8da35"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Regex extract"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Regex extract

> Supported in: Batch, Faster, Streaming

Extracts the specified group from a regex. Returns empty string when no match is found.

**Expression categories:** Regex, String

## Declared arguments

* **Expression:** The expression to extract from.<br>*Expression\<String>*
* **Group:** The group to extract from the regex match.<br>*Literal\<Integer>*
* **Pattern:** The regex pattern to match.<br>*Expression\<String>*

**Output type:** *String*

## Examples

### Example 1: Base case

**Description:** Extract the first two initials from the first match.

**Argument values:**

* **Expression:** MT-112, XB-967
* **Group:** 1
* **Pattern:** (\w\w)(-)

**Output:** MT

***

### Example 2: Base case

**Argument values:**

* **Expression:** MT-112, XB-967
* **Group:** 0
* **Pattern:** NOT\_FOUND

**Output:** *empty string*

***

### Example 3: Base case

**Argument values:**

* **Expression:** zzzzhello hellozzzz
* **Group:** 1
* **Pattern:** (hello) \1

**Output:** hello

***

### Example 4: Base case

**Argument values:**

* **Expression:** helloworld
* **Group:** 1
* **Pattern:** (\w+)(?=world)

**Output:** hello

***

### Example 5: Null case

**Description:** Null inputs give null outputs.

**Argument values:**

* **Expression:** *null*
* **Group:** 1
* **Pattern:** (\w\w)(-)

**Output:** *null*

***
