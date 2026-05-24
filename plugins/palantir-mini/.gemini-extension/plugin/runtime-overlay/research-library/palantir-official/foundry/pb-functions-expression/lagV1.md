---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/lagV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/lagV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "894b7a1a66d3877cda3cb7bb782a4db778f13dfd8da348ce0e3fe0d54bdcbb73"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Lag"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Lag

> Supported in: Batch, Faster

Returns the value of the input at 'lag' before the current row in the window.

**Expression categories:** Aggregate

## Declared arguments

* **Expression:** Expression to lag.<br>*Expression\<T>*
* *optional* **Default value:** Default value if there is less than offset rows before the current row.<br>*Literal\<T>*
* *optional* **Lag:** Number of rows to lag.<br>*Literal\<Integer>*

**Type variable bounds:** *T accepts AnyType*

**Output type:** *T*
