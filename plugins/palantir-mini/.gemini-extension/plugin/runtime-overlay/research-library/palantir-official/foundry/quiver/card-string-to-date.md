---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-string-to-date/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-string-to-date/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8771b48576309029cc9d7dfb66a2e7df1b6a5e9bccf8017d9f3a9a6a2b20d1d4"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > String to date"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# String to date

Convert a string into a date; for example, `18/07/2023` or `July 18, 2023` into a time type. Set the timezone to be used to a custom timezone, local time, or UTC. Optionally, also provide the date format for parsing in [Day.js ↗](https://day.js.org/docs/en/display/format) format. American date format is used by default (`mm/dd/yyyy`). Will return `Invalid timezone or date` for invalid values.

## Input type

String

## Output type

Time

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
