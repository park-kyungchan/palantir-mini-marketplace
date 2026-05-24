---
sourceUrl: "https://www.palantir.com/docs/foundry/questions-answers/builds/"
canonicalUrl: "https://palantir.com/docs/foundry/questions-answers/builds/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b6e5da95b8f990d663adbced94c8de4bea7088d007ede60d70469b27dfda6bf5"
product: "foundry"
docsArea: "questions-answers"
locale: "en"
upstreamTitle: "Documentation | Product QAs > Builds"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Builds

### Is it possible to have two build jobs running against a single dataset at the same time?

No, you can only have one open transaction on a dataset at any given time; one job will queue behind the other.

*Timestamp:* April 10, 2024
