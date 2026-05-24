---
sourceUrl: "https://www.palantir.com/docs/foundry/object-link-types/create-value-type/"
canonicalUrl: "https://palantir.com/docs/foundry/object-link-types/create-value-type/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "db2deb6b7d02b37ab9be33d40854bf437a227cc0b50b97b33e8f6a80222658ba"
product: "foundry"
docsArea: "object-link-types"
locale: "en"
upstreamTitle: "Documentation | Value types > Create a value type"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a value type

Follow the steps below to create a value type to use across your platform [space](/docs/foundry/security/orgs-and-spaces/#spaces).

1. Navigate to the **Value Types Manager** application from the platform sidebar.
2. From the top left corner, use the dropdown menu to select the space in which you would like to create a value type.
3. Select **Create New Value Type** from the upper right corner.
4. Provide a clear name, description, and unique API name for your value type.

<img src="./media/value-type-create-metadata.png" alt="Value type metadata creation" width="500" />

5. Choose a [base type](/docs/foundry/object-link-types/base-types/) for your value type.
6. (Optional) Define a constraint for your value type. Validators can be regular expressions for `String` types, enums, ranges, or other validation methods depending on the base type.
   For a full list of constraints supported by base type, review our [value type constraints](/docs/foundry/object-link-types/value-type-constraints/) documentation.

<img src="./media/value-type-create-constraint.png" alt="Value type constraint creation" width="500" />

7. (Optional but recommended) Provide an example preview value for your value type.

<img src="./media/value-type-create-preview.png" alt="Value type preview creation" width="500" />

8. Save your value type.
