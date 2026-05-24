---
sourceUrl: "https://www.palantir.com/docs/foundry/object-link-types/value-types-versions/"
canonicalUrl: "https://palantir.com/docs/foundry/object-link-types/value-types-versions/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b386af6202ae1ba66cacf4a15651382f3d120a57e641ea411c2835e658db80d1"
product: "foundry"
docsArea: "object-link-types"
locale: "en"
upstreamTitle: "Documentation | Value types > Value type versions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Value type versions

Value types are versioned to handle breaking and non-breaking edits. Value type versions include two parts: metadata and constraints. The metadata values for name, description, and apiName can be changed whenever necessary. The base type metadata and the constraints that define the validation rules for the type are immutable.

If you choose to update the constraints of a value type, a new version of the value type is created. If your value type has no consumers, you can freely change these constraints. However, if you make breaking changes to the constraints and your value type has consumers, we recommend deprecating the current value type and creating a new one instead. This approach avoids potential runtime errors and data inconsistencies.

<img src="./media/value-type-versioning.png" alt="Constraint update warning" width="500" />

When you make non-breaking changes to a value type, a new version is also created. This new version will automatically propagate to the Ontology, ensuring that all uses of the value type across the Ontology are updated to the latest version.
