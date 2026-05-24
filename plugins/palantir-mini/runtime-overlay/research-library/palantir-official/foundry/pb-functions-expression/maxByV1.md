---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/maxByV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/maxByV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "657bdc56113127ce9396399f66d0e94fb3a998844f1f8f3a1fc48ee97e1fa014"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Max by"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Max by

> Supported in: Streaming

This expression computes a max row according to the max column expression after applying the provided filter specification. If there is no maximum row, null will be returned.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** Column expression on which the max is computed. Null values are treated as if they have the smallest value.<br>*Expression\<ComparableType>*
* **Output projection expression:** Defines the projection expression that is applied on the maximum row before it is returned.<br>*Expression\<AnyType>*
* *optional* **Filter condition:** This parameter defines the filter specification that is applied on the rows contained within the window. The output of this expression will only reference rows which are not filtered by this parameter (i.e., where the condition evaluates to true). If no rows exist in state at the time of a trigger, null will be emitted.<br>*Expression\<Boolean>*

**Output type:** *AnyType*

## Examples

### Example 1: Base case

**Argument values:**

* **Expression:** `salary`
* **Output projection expression:** `salary`
* **Filter condition:** <br>lessThan(<br> left: `salary`,<br> right: 5000,<br>)

**Given input table:**

| dep\_name | salary |
| ----- | ----- |
| develop | 9900 |
| develop | 4000 |
| develop | 3000 |

**Outputs:** 4000

***

### Example 2: Base case

**Argument values:**

* **Expression:** `salary`
* **Output projection expression:** `salary`
* **Filter condition:** *null*

**Given input table:**

| dep\_name | salary |
| ----- | ----- |
| develop | 1000 |
| develop | *null* |
| develop | 4000 |

**Outputs:** 4000

***
