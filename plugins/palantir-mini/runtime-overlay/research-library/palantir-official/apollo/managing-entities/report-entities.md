---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-entities/report-entities/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-entities/report-entities/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c6a1451e11f710ee95e6e2e4eb650e993846a946c5471cbb038d9daf3ea0af9c"
product: "apollo"
docsArea: "managing-entities"
locale: "en"
upstreamTitle: "Documentation | Managing Entities > Reporting Entities"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Reporting Entities

Apollo provides the ability to track the state of deployed Entities across your Spoke Environments. Entities added through the method described in [Adding Entities](/docs/apollo/managing-entities/add-and-edit-entities/#adding-entities) are referred to as “managed" Entities.

Non-managed Entities can also be tracked and reported through Apollo. The Apollo CLI command `add-unmanaged-service [MavenCoordinate] --environment=[env-id] --stack=[stack] --service=[service-id]` can be run with the coordinates of the deployed software to add it as a non-managed Entity or update an existing one. The Entity will then show up as an Entity in the Apollo Control Center, along with the deployed version at the time the CLI command was run.

Since the Entity is not managed by Apollo, the deployed version in the Apollo Control Center will not automatically update to reflect newly deployed versions of the software. We recommend setting up a process that can scan the non-managed Entities and report their latest versions to Apollo. This process can be set up to run on a schedule and report the latest versions via the CLI. This will ensure that the displayed version in the Apollo Control Center is not falling behind.
