---
sourceUrl: "https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-row-level-interactions-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/dynamic-scheduling/scheduling-row-level-interactions-overview/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "253842c0052534f0cb74b7117d7bb8e41bd7a71c812a4a5309d9eb7a8291422e"
product: "foundry"
docsArea: "dynamic-scheduling"
locale: "en"
upstreamTitle: "Documentation | Row-level interactions > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Row-level interactions

Each row on the Scheduling Gantt chart represents a `Resource` object. Your `Resource` can for example, represent:

* Technicians for task assignment
* Vehicles being scheduled for maintenance
* Crew allocation for trips

You can use row-level interactions to enable users to modify certain properties of your row objects, create objects, or trigger events in your Workshop module.

![Example of row-level interactions.](/docs/resources/foundry/dynamic-scheduling/row-level-interactions.gif)
