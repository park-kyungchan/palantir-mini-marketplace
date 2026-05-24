---
sourceUrl: "https://www.palantir.com/docs/foundry/object-link-types/use-value-type/"
canonicalUrl: "https://palantir.com/docs/foundry/object-link-types/use-value-type/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "694ab43734520c15b19aede500eb1a59ab2b2e498c21ad1d209bdfe7a3636e35"
product: "foundry"
docsArea: "object-link-types"
locale: "en"
upstreamTitle: "Documentation | Value types > Use value types"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use value types

Once you have [created a value type](/docs/foundry/object-link-types/create-value-type/), you can use it in as a data type across Foundry. Value types can be supported for the use cases listed below.

* Assigning a value type to an object type property.
* Assigning a value type to a shared property.
* Assigning a value type to a Pipeline Builder pipeline property as a logical type using the `logical type cast` expression and selecting the value type on the property when you write to the objects target.

To assign a value type to a property, select the value type from the dropdown menu during property configuration.

<img src="./media/value-type-use.png" alt="Constraint update warning" width="500" />

:::callout{theme="warning"}
If you apply a value type to an object property that contains property values that fail validation, that object type will fail to index. You can view such index failures in the object type health status in Ontology Manager, where you can correct your data or update your value type to fix the issue.
:::
