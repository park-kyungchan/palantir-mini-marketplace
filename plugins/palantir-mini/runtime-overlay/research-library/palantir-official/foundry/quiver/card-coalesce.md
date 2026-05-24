---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-coalesce/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-coalesce/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0c50cb06ea133624b2ce3a4ae2ff00f3e8fffd209ef06340685cbb16cfacb169"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Coalesce"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Coalesce

Returns the first input value that is not null, or null if all inputs are null. Can be useful to cast potential null values to a defined value. To do this, select **Manually input (string/number/date/boolean)** as the input array configuration. As the first array value, use a variable input to select a card or column value that is potentially null.  As the second array value, use a static input to manually define a non-null "fallback" value for cases when the first value is null.

## Input type

Number, string, time, boolean, number array, string array, time array,

## Output type

Number, string, time, boolean

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
