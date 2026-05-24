---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-transform/computeExpressionIfAbsentV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-transform/computeExpressionIfAbsentV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c57f01e36d2d8ea719ee01be2f52773e65eb936975a31ea3bfddc3b591bdb6a4"
product: "foundry"
docsArea: "pb-functions-transform"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Transforms > Compute if expression absent"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Compute if expression absent

> Supported in: Batch

Computes the expression for new rows, the value for a given key will only ever be computed once, even across builds.

**Transform categories**: Other

## Declared arguments

* **Dataset:** Dataset to apply expression to.<br>*Table*
* **Expression:** Expression to compute when no result exists for key.<br>*Expression\<AnyType>*
* **Key:** Results are stored under this key. For a given key, a result will never be computed twice.<br>*List\<Expression\<Array\<Binary | Boolean | Byte | Date | Integer | Long | Short | String | Timestamp> | Binary | Boolean | Byte | Date | Integer | Long | Short | String | Timestamp>>*
* **Store id:** The id for the store to store results under. If this id is changed, all results will be invalidated. The same id cannot be used twice in the same pipeline.<br>*Literal\<String>*
* *optional* **Always recompute null results:** If true, any null results in the store will always be recomputed even if the result passes the user-provided store condition. This applies to both simple values as well as {ok, error} structs. Note that in order to maintain store invariants, the store must be reset whenever this value changes.<br>*Literal\<Boolean>*
* *optional* **Disable store:** If true, the store is fully disabled and all store parameters are ignored. At this point the transform will operate like a regular apply expression.<br>*Literal\<Boolean>*
* *optional* **Do not store results when:** Some results may not be desired to store. For example, an error result or null result. Given the result, choose what values should not be stored. By default, null results are not stored.<br>*Expression\<Boolean>*
