---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-sample/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-sample/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d611c56895b763162f1e72cd26d8b04fdf2e7a177664aabce1fb4a6bcc723d3e"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Sample"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Sample

Sample is used to resample an existing series at a constant frequency. This can be used in two primary scenarios:

* Data is coming in at a constant rate (such as daily), but some days no data was recorded. Rather than having gaps in the data, you can use Sample to resample at a daily rate to produce a complete series.
* Data is coming in at a constant rate (such as daily), but you would like a series that has data at a different rate (such as hourly or weekly).

Sample calculates its new points by using [interpolation](/docs/foundry/quiver/cards-interpolation-usage/#sample) between the existing data.

## Input type

Time series

## Output type

Time series

### Example

![Sample example](/docs/resources/foundry/quiver/card-sample.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
