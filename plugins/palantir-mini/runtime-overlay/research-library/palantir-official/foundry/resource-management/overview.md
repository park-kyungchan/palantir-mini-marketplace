---
sourceUrl: "https://www.palantir.com/docs/foundry/resource-management/overview/"
canonicalUrl: "https://palantir.com/docs/foundry/resource-management/overview/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bed0a5b4b2643e64c76c9ffb0a6c0f81058cafd0d06d7a5698dde121d6facef4"
product: "foundry"
docsArea: "resource-management"
locale: "en"
upstreamTitle: "Documentation | Resource Management > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Resource Management

**Resource Management** helps users understand the following:

* Shared Foundry compute usage
* The cost of Foundry compute usage
* Billing

![Overview tab of Resource Management application](/docs/resources/foundry/resource-management/overview.png)

The application targets two primary workflows:

* [Usage visibility](#usage-visibility) workflows allow users to see an overview of how Foundry usage resources are spent across their Projects.
* Resource allocation workflows allow administrators to define how Projects should consume shared resources and, if desired, to place limits on that consumption.

## Usage visibility

Users can monitor and analyze resource usage using visibility tooling in Resource Management.

In Foundry, all items that can consume discretionary resources are created in a Project. Resource usage for each of these items is accrued to its parent Project. In turn, Projects belong to a usage account.

Usage accounts are a way of grouping related Projects into semantically meaningful groups for better analysis and usage monitoring. By default, enrollments have two usage accounts:

* The *default* account contains all regular Projects.
* The *user folders* account contains all user home folders and cannot be modified.

Administrators are free to create new usage accounts and triage Projects in any way that helps them reason about resource consumption. For example, it may be helpful to categorize Projects in terms of department, business unit, or Organization. The usage account of a Project is specified at Project creation time but can always be changed later by an administrator.

Foundry usage is accrued in different ways depending on the workload or application. For example, running a data transformation incurs a *compute* cost (the cost of servers doing a distributed computation) and a *storage* cost (the long-term storage cost for the resulting data).

### Conceptual hierarchy

![A diagram showing the conceptual hierarchy of resource usage. ](/docs/resources/foundry/resource-management/conceptual-hierarchy.png)
