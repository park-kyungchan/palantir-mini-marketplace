---
sourceUrl: "https://www.palantir.com/docs/foundry/object-link-types/value-type-constraints/"
canonicalUrl: "https://palantir.com/docs/foundry/object-link-types/value-type-constraints/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2787657da9efcc62f45bc6435c1312e790398543e2791259f2eaf7c40d475f3b"
product: "foundry"
docsArea: "object-link-types"
locale: "en"
upstreamTitle: "Documentation | Value types > Value type constraints"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Value type constraints

Each value type may optionally define a constraint to enforce data validation. You can configure these constraints when [creating a new value type](/docs/foundry/object-link-types/create-value-type/) in the **Value Type Manager** application. The available value type constraints, along with what base types they can be applied to, are below:

* **Enum (one of):** A constraint representing a static set of allowed values.
  * **Valid base types:** String, Boolean, Decimal, Double, Float, Integer, or Short.
  * For String properties, the enum values may optionally be case-sensitive or case-insensitive.
* **Range:** A minimum value, maximum value, or range of allowed values.
  * **Valid base types:** Decimal, Double, Float, Integer, Short, Date, Timestamp, String, or Array.
  * For String properties, the length of the string is constrained.
  * For Array properties, the size of the array is constrained.

Additionally, the following property types have additional type-specific constraints available:

* **String:**
  * **Regex:** A regex pattern that the string must match. The regex validation may optionally pass when matching only a substring of the property value.
  * **RID:** The string must be a valid rid.
  * **UUID:** The string must be a valid UUID.
* **Array:**
  * **Uniqueness:** All elements of the array must be unique.
  * **Nested:** A value type constraint can be applied to the elements of the array. For example, a regex constraint could be applied to every string in an array.
* **Struct:**
  * **Element constraints:** A mapping between a struct field identifier and a value type reference, where the struct field identifier indicates the struct component to which the referenced value type should be applied.
