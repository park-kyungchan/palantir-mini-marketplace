---
sourceUrl: "https://www.palantir.com/docs/foundry/data-integration/health-checks/"
canonicalUrl: "https://palantir.com/docs/foundry/data-integration/health-checks/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "88bc9cb9b594c132c5e8e0ac04b4fff8c4003da7d3d80b3b01f1949ca7118812"
product: "foundry"
docsArea: "data-integration"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Health checks"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Health checks

Once data is synced into Foundry, has been transformed in a pipeline, and is running regularly using [schedules](/docs/foundry/data-integration/schedules/), **health checks** can be used to validate data quality throughout the pipeline. This is necessary to ensure that the data flowing through the pipeline remains reliable and maintains expected structure over time. Health checks are commonly used in [pipeline maintenance](/docs/foundry/maintaining-pipelines/overview/).

Several types of health checks are available in Foundry:

* *Job-level checks* validate that the job corresponding to an output dataset is completing successfully.
* *Build-level checks* validate that builds are completing successfully, and are completing within an expected duration.
* *Freshness checks* validate that data is being kept up-to-date.

To learn more, refer to these resources:

* Explore the [Health checks](/docs/foundry/health-checks/overview/) service to learn how to define health checks.
* Read the [checks reference](/docs/foundry/health-checks/checks-reference/) to learn about the range of available checks.
* Learn about which [health checks are recommended](/docs/foundry/maintaining-pipelines/recommended-health-checks/).
