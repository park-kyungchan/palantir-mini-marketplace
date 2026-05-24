---
sourceUrl: "https://www.palantir.com/docs/foundry/questions-answers/contour-community/"
canonicalUrl: "https://palantir.com/docs/foundry/questions-answers/contour-community/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "82b4a509c97d3e582a19485a3d89107a874723c3b5876fdd8fa32248583e31f8"
product: "foundry"
docsArea: "questions-answers"
locale: "en"
upstreamTitle: "Documentation | Product QAs > Contour (Community)"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Contour (Community)

### What set of operations are required to export a Contour dashboard to a PDF?

Users should be able to download a Contour dashboard as PDF as long as they have `read` permissions on the dashboard and underlying datasets. The specific operations are `export-dashboard-data` and `export-data`.

*Topic Link:* [https://community.palantir.com/t/permissions-required-for-export-of-contour-dashboard-to-pdf/177 ↗](https://community.palantir.com/t/permissions-required-for-export-of-contour-dashboard-to-pdf/177)

*Timestamp:* October 17, 2024

### What could cause different row counts between different widgets in Contour when using the same data and path?

The difference could be due to inherent non-determinism in certain functions. Please refer to the [documentation](/docs/foundry/contour/correctness-non-determinism/) to check if you have any of the operations mentioned that could lead to non-deterministic behavior.

*Topic Link:* [https://community.palantir.com/t/specifications-for-row-counts-in-contour/514 ↗](https://community.palantir.com/t/specifications-for-row-counts-in-contour/514)

*Timestamp:* October 17, 2024
