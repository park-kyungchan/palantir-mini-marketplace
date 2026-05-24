---
sourceUrl: "https://www.palantir.com/docs/foundry/building-pipelines/scheduling-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/building-pipelines/scheduling-overview/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d3b2f7ce3a2a6ecaadc1e3cf88ebee7496decd2599ed458a63b3979b5060f415"
product: "foundry"
docsArea: "building-pipelines"
locale: "en"
upstreamTitle: "Documentation | Scheduling > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Scheduling

In Foundry's data integration layer, a [schedule](/docs/foundry/data-integration/schedules/) is a key concept enabling data to stay up to date for end users who rely on data in a pipeline. Foundry's scheduling capabilities are designed to support all types of data pipelines, and provide considerable flexibility when creating scheduled builds.

Scheduled builds can be configured to run:

* At certain times
* When data has been updated
* When logic has been updated
* *Any combination of the above conditions*

Scheduled builds can be configured to build:

* A single dataset
* A single dataset and all its dependencies
* All datasets that depend on a dataset
* All datasets that connect two datasets
* *Any combination of the above configurations*
