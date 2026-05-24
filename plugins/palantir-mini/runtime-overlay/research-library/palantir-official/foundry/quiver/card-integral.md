---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-integral/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-integral/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2a280b1efec209ba949cd1c60eb91761fbedd7886e3ce7ef6b228ea2e1aaf0e0"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Integral"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Integral

The Integral transformation is the inverse of the [derivative](/docs/foundry/quiver/card-derivative/). Rather than calculating rate of change, it calculates the area under the curve.

* As with derivatives, you can calculate the rate over several different time units.
* In addition to linear integration, you can also perform LHS and RHS integration using the **Integration Method** option.
* There is an **only accumulate over view range** toggle. By default, integrals will calculate over the entire range of the series. If you are zoomed in and only want to integrate over the time range displayed, switch this toggle to true.

## Input type

Time series

## Output type

Time series

### Example

![Integral example](/docs/resources/foundry/quiver/card-integral.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
