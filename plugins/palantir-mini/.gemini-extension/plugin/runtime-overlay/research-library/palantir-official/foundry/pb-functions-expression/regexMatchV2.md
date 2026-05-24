---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/regexMatchV2/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/regexMatchV2/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5aa03fd85655ccd8754b0cd7b1b49f9575b852e6e3e7b4e4ab535db632001c57"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Regex match"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Regex match

> Supported in: Batch, Faster, Streaming

Matches an expression against a regular expression. Regular expression must match the whole string.

**Expression categories:** Regex, String

## Declared arguments

* **Expression:** The expression to match against the regular expression.<br>*Expression\<String>*
* **Regex:** The regular expression to match against.<br>*Expression\<String>*

**Output type:** *Boolean*

## Examples

### Example 1: Base case

**Description:** Regex must match the entire string

**Argument values:**

* **Expression:** (
* **Regex:** abc

**Output:** false

***

### Example 2: Base case

**Description:** Regex must match the entire string

**Argument values:**

* **Expression:** abcdefg
* **Regex:** abc

**Output:** false

***

### Example 3: Base case

**Description:** You can match regex patterns

**Argument values:**

* **Expression:** abcdefg
* **Regex:** abc?d.+

**Output:** true

***

### Example 4: Base case

**Description:** Regex patterns sometimes don't match input strings

**Argument values:**

* **Expression:** abdefg
* **Regex:** ab?d.\*

**Output:** true

***

### Example 5: Null case

**Description:** Null pattern do not match

**Argument values:**

* **Expression:** foo
* **Regex:** *null*

**Output:** false

***

### Example 6: Null case

**Description:** Null columns do not match

**Argument values:**

* **Expression:** *null*
* **Regex:** ab?d.\*

**Output:** false

***

### Example 7: Null case

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
