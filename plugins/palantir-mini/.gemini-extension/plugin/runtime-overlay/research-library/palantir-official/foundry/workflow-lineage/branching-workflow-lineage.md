---
sourceUrl: "https://www.palantir.com/docs/foundry/workflow-lineage/branching-workflow-lineage/"
canonicalUrl: "https://palantir.com/docs/foundry/workflow-lineage/branching-workflow-lineage/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ce5d40e0a5f0583074272fc3d4396ce493940c7910510a299b71e6c6e4bfaf5d"
product: "foundry"
docsArea: "workflow-lineage"
locale: "en"
upstreamTitle: "Documentation | Workflow Lineage > Branching support"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Branching in Workflow Lineage

Workflow Lineage supports Global Branching, allowing you to inspect, edit, and validate workflow resources on a branch before merging changes into `main`. This makes it easier to develop and test end-to-end workflow changes in an isolated branch context before promoting them to production.

For general information on Global Branching concepts and workflows, refer to the [Global Branching documentation](/docs/foundry/global-branching/branching-lifecycle-usage/).

![Example Workflow Lineage graph being viewed on a global branch.](/docs/resources/foundry/workflow-lineage/global-branching-in-wfl.png)

## Adding, removing, and modifying resources

When working on a global branch, you can open Workflow Lineage from a variety of supported branch-aware entry points, including:

* The AI FDE panel, by right-clicking a global branch tag or when selecting a global branch context to add.

  ![Button to open resources in Workflow Lineage from right-clicking from the global branch tags.](/docs/resources/foundry/workflow-lineage/global-branching-ai-fde-branch.png)

  ![Button to open resources in Workflow Lineage from the AI FDE panel.](/docs/resources/foundry/workflow-lineage/global-branching-ai-fde.png)

* The global branch bottom bar.

  ![Button to open resources in Workflow Lineage from the global branching bottom bar.](/docs/resources/foundry/workflow-lineage/global-branching-bottom-bar.png)

* The global branch main branch page.

  ![Button to open resources in Workflow Lineage from the global branch main branch page.](/docs/resources/foundry/workflow-lineage/global-branching-branches.png)

* The global branch proposal page.

  ![Button to open resources in Workflow Lineage from the global branch proposal page.](/docs/resources/foundry/workflow-lineage/global-branching-proposals.png)

Eligible resources are added to the graph automatically, and the branch side panel helps you review any added or modified resources. You can also use `Cmd+I` (macOS) or `Ctrl+I` (Windows) from supported resources on a branch to open Workflow Lineage in the same branch context. This is supported from Workshop, Ontology Manager, AIP Logic, and Pipeline Builder object type outputs.

## Cross-application compatibility

With Global Branching in Workflow Lineage, you can use branch-aware color modes for function repositories, action rules, Ontology status, usages, and out-of-date dependencies.

![A Workflow Lineage graph showing usage coloring on a global branch.](/docs/resources/foundry/workflow-lineage/global-branching-coloring.png)

You can also perform supported bulk edits, including upgrading function versions for action types or Workshops, deleting Ontology resources, and updating action type submission criteria.

![The bulk update bottom panel while on a global branch.](/docs/resources/foundry/workflow-lineage/global-branching-bulk-updates.png)

In addition, you can search for and add resources created on a branch, including object types, action types, functions, and interfaces. The side panel helps you review modified resources and add modified resources that are not already displayed on the graph.

## Known limitations

* Object type groups in search only reflect those apart of the `main` branch.
* Bulk upgrading logic on a branch is not currently supported.
