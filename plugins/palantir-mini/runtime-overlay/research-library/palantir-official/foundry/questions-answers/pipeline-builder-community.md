---
sourceUrl: "https://www.palantir.com/docs/foundry/questions-answers/pipeline-builder-community/"
canonicalUrl: "https://palantir.com/docs/foundry/questions-answers/pipeline-builder-community/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ca4c61e0aac091990df6819bb7786edbfa175e67d2fe18652ef33f89deae917f"
product: "foundry"
docsArea: "questions-answers"
locale: "en"
upstreamTitle: "Documentation | Product QAs > Pipeline Builder (Community)"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Pipeline Builder (Community)

### Is it possible to use relative date in Pipeline Builder?

You can use the "Current Date" option (under the `Expression` tab) and then add or subtract from that as needed.

*Topic Link:* [https://community.palantir.com/t/pipeline-builder-relative-date/810 ↗](https://community.palantir.com/t/pipeline-builder-relative-date/810)

*Timestamp:* October 10, 2024

### In Pipeline Builder, what is the recommended approach to collect an array of values where the order is defined by a field?

By default, the order in a `Collect Array` expression is not deterministic. A possible workaround is to use an `Ordered Window` expression with `Collect Array` and then sort on the required field.

*Topic Link:* [https://community.palantir.com/t/ordered-collect-array-in-pipeline-builder/423 ↗](https://community.palantir.com/t/ordered-collect-array-in-pipeline-builder/423)

*Timestamp:* October 10, 2024
