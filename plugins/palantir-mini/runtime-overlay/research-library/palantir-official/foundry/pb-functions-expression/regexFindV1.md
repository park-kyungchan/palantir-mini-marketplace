---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/regexFindV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/regexFindV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1f4ccd13979532e7542f84c09ea2d00ef50c026e3477920d5862cc1b2e12607e"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Regex find"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Regex find

> Supported in: Batch, Faster, Streaming

Matches an expression against a regular expression. Regular expression can match any part of the string.

**Expression categories:** Regex, String

## Declared arguments

* **Expression:** The expression to match against the regular expression.<br>*Expression\<String>*
* **Regex:** The regular expression to find.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Description:** The pattern must be in the string but does not have to match the full value.

**Argument values:**

* **Expression:** abcdefg
* **Regex:** abc

**Output:** true

***

### Example 2: Base case

**Description:** You can find regex patterns.

**Argument values:**

* **Expression:** abcdefg
* **Regex:** abc?d

**Output:** true

***

### Example 3: Base case

**Description:** Regex patterns sometimes don't match input strings.

**Argument values:**

* **Expression:** abdefg
* **Regex:** ab?d

**Output:** true

***

### Example 4: Null case

**Description:** Can match using back tracking.

**Argument values:**

* **Expression:** hello hello
* **Regex:** (hello) \1

**Output:** true

***

### Example 5: Null case

**Description:** Can match using lookahead.

**Argument values:**

* **Expression:** helloworld
* **Regex:** (\w+)(?=world)

**Output:** true

***

### Example 6: Null case

**Description:** Null pattern do not match.

**Argument values:**

* **Expression:** foo
* **Regex:** *null*

**Output:** false

***

### Example 7: Null case

**Description:** Null columns do not match.

**Argument values:**

* **Expression:** *null*
* **Regex:** ab?d.\*

**Output:** false

***

### Example 8: Null case

**Argument values:**

* **Expression:** `foo`
* **Regex:** `pattern`

| foo | pattern | **Output** |
| ----- | ----- | ----- |
| foo | ( | false |
| foo | *null* | false |
| *null* | foo | false |
| *null* | *null* | false |

***
