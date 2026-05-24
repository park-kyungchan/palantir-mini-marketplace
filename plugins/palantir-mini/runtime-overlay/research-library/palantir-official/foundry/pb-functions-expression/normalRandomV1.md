---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/normalRandomV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/normalRandomV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "da5b14f965927ac35e3037b5cc92e6f311f82e26588bf2ef20102bfc3bcbefb7"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Normal random number"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Normal random number

> Supported in: Batch, Faster, Streaming

Returns a column of normally distributed random numbers with zero mean and unit variance. This is not deterministic and will not produce the same result on repeated builds, even when using a seed.

**Expression categories:** Numeric

## Declared arguments

* *optional* **Seed:** Adding a seed means that the random numbers will be generated from same sequence at each build. If you want true random numbers this should not be supplied. A seed will not produce fully deterministic results since compute may run distributed and the order in which random numbers are pulled for rows is not guaranteed.<br>*Literal\<Long>*

**Output type:** *Double*
