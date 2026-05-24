---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-materialization-sql/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-materialization-sql/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9541ab0f23e1a54b0b2818cd31552c57dc374685916995422b7beee0e7d0a0f2"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Materialization SQL"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Materialization SQL

The Materialization SQL card allows you to write SQL queries against materialization datasets in your analysis. The card uses SparkSQL syntax, functions, and operators.

The Materialization SQL card accepts any materialization card as input. You can also pass scalar values such as dates, numbers, strings, and booleans as inputs to parameterize your queries.

The Materialization SQL card also supports AIP-powered SQL generation. You can describe the analysis you want to perform in natural language, and the card will generate a SQL query for you.

## Input type

Materialization, date, number, string, boolean

## Output type

Materialization

## Usage information

| Functionality                                           | Availability |
| ------------------------------------------------------- | ------------ |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards)        | Supported    |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Unsupported  |
