---
sourceUrl: "https://www.palantir.com/docs/foundry/building-pipelines/logic-flows-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/building-pipelines/logic-flows-overview/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5f8249e981c58d861773454c9887d5fdf7f3794741fa96c37ef1a90be7690466"
product: "foundry"
docsArea: "building-pipelines"
locale: "en"
upstreamTitle: "Documentation | Logic Flows [Sunset] > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Logic Flows \[Sunset]

Logic Flows allow you to automate common workflows in Foundry. Logic Flows integrate with Foundry build and scheduling infrastructure to incorporate them into your data pipelines.

:::callout{theme="warning" title="Sunset"}
As of August 2024, Logic Flows is in a [sunset](/docs/foundry/platform-overview/development-life-cycle/) stage and should not be used for new development.
:::

:::callout{theme="warning" title="Sunset"}
Logic Flows is in the [sunset](/docs/foundry/platform-overview/development-life-cycle/) phase of development and will be deprecated at a future date. Full support remains available. We recommend migrating your workflows to other applications and tools to serve your use case purposes:

* **AIP Logic:** Use the power of LLMs to automate and support critical tasks, including connecting key information from unstructured inputs to your Ontology, resolving scheduling conflicts, optimizing asset performance by finding the best allocation, reacting to disruptions in your supply chain, and more.
* **Actions:** Build automated transactions to change object properties based on the logic and criteria you define.
:::

## Core concepts

An **automation** is a script interacting with Foundry service APIs using Builds intended to replace manual repeatable actions in the platform. It acts like other jobs in Foundry, except it doesn't use datasets as inputs or outputs. Palantir maintains a curated library of automations.

Automations take resources as *parameters* and a JSON *configuration*.

Specific instances of automations are called **connected flows**. A connected flow is created with a project, parameters, and configuration.

Connected flows:

* Are defined and executed on a single [project](/docs/foundry/compass/move-and-share-resources/)
* Run according to parameters and configuration, validated when a connected flow is created
* Can be run as part of a [schedule](/docs/foundry/data-integration/schedules/)
* Can be run manually through Logic Flows UI, Data Lineage or Builds application
* Do not store information between runs, therefore creating a new connected flow will not change the outcome of upcoming runs
* Cannot be edited
* Can be archived

## Available automations

* [**Compass Files Lister**](/docs/foundry/building-pipelines/compass-file-lister/)
