---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-cumulative-aggregate/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-cumulative-aggregate/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6b9b642534507d37d467727b1b1d8b30170cc300375800f12f6e88f3df093982"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Cumulative aggregate"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Cumulative aggregate

Cumulative aggregates allow you to display the cumulative value of a series, either over the entire length of the series or over a specific period of time.For example, if we had a series representing the dividend payout of Disney stock over time, we could use a Cumulative aggregate sum to see the running total of dividend payout as it grows with time.

* There is an **only accumulate over view range** toggle. By default, Cumulative aggregates will only calculate over the display range. If you would like to calculate the cumulative aggregate for the entire range of the series, switch this toggle to false.

## Input type

Time series

## Output type

Time series

## Examples

![Cumulative aggregate example](/docs/resources/foundry/quiver/card-cumulative-agg.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |

## See also

[Integral](/docs/foundry/quiver/card-integral/)
