---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-boolean-formula/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-boolean-formula/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "456ec66420ba2ea46b17fa69372c19d9b28588a77eb1efdb9c91373a35c530df"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Boolean formula"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Boolean formula

Create a new column in a transform table using a [formula](/docs/foundry/quiver/cards-formula-syntax/). Write a mathematical expression returning a boolean value which can reference table columns using `@` (for example, `@column > 0`). You can also use data in your analysis by referencing global identifiers using `$`. (for example, `@column > $A`, where $A is a numeric parameter in your analysis).

## Input type

Number, boolean

## Output type

Boolean

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Unsupported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
