---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/leadV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/leadV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "91d1a7fcebc02abe00f1f3f48a10977ecbd942776d712f96515050eb9c699e63"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Lead"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Lead

> Supported in: Batch, Faster

Returns the value of the input at 'lead' after the current row in the window.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** Expression to lead.<br>*Expression\<T>*
* *optional* **Default value:** Default value if there is less than offset rows before the current row.<br>*Literal\<T>*
* *optional* **Lead:** Number of rows to lead.<br>*Literal\<Integer>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *T*
