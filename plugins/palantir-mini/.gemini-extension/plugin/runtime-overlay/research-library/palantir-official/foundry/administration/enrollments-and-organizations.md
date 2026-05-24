---
sourceUrl: "https://www.palantir.com/docs/foundry/administration/enrollments-and-organizations/"
canonicalUrl: "https://palantir.com/docs/foundry/administration/enrollments-and-organizations/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "67136d64969d1252ced3b03773c513445774cb470329afde536639fc7af6e331"
product: "foundry"
docsArea: "administration"
locale: "en"
upstreamTitle: "Documentation | Enrollments and organizations > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Enrollments and Organizations

*Organizations* are access requirements applied to *Projects* that enforce strict silos between groups of users and resources. Every user is a member of only one Organization but can be a guest member of multiple Organizations. [Learn more about Organizations](/docs/foundry/security/orgs-and-spaces/#organizations).

An **enrollment** represents an instance of the Foundry platform and is made up of one or more Organizations. In most cases, a company will have a single Organization—with all its users—in its enrollment. Some enrollments have multiple Organizations to enforce strict silos between groups of users, such as when multiple companies collaborate in the same Foundry platform.

Most settings in Control Panel are administered at an Organization level to allow for granularity in configuration and delegation of administration, but some are global to the entire enrollment, like [Resource Management](/docs/foundry/resource-management/overview/).
