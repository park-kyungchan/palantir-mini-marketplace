---
sourceUrl: "https://www.palantir.com/docs/foundry/logic/execution-mode-settings/"
canonicalUrl: "https://palantir.com/docs/foundry/logic/execution-mode-settings/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bf4ab9d77455983455ead1c9891e0f34796639fa12dc2027ae6a8431e73a2c31"
product: "foundry"
docsArea: "logic"
locale: "en"
upstreamTitle: "Documentation | AIP Logic > Execution mode settings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Execution mode settings

You can choose between two execution modes for a Logic function: *user-scoped* execution and *project-scoped* execution. User-scoped execution is the default mode.

## User-scoped execution

When configured in user-scoped mode, the Logic function will run using the permissions of the user running the Logic function.

In user-scoped mode, each user can only see their own execution logs, and not the logs of other users running the Logic function. Execution logs are persisted for 24 hours.

## Project-scoped execution

When configured in project-scoped mode, the Logic function will run using the permissions of the project containing the Logic function. In project-scoped mode, execution logs are visible to everyone with project access.

Project-scoped execution requires that all resources which are used by the Logic function must also be imported into the same project as the Logic function. Users will additionally require access to the markings on these resources.

You can check if all required resources are imported in the execution mode settings; if a resource is missing, you will be able to import it directly from the configuration.

<img src="./media/execution-dataset.png" alt="Execution dataset" width="500" />

### Run history dataset

When using project-scoped execution, you can configure a dataset where all run histories will be logged. Each execution is recorded as a new row in this dataset, and the past 10000 runs are preserved.
