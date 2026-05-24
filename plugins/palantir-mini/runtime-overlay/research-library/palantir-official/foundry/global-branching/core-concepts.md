---
sourceUrl: "https://www.palantir.com/docs/foundry/global-branching/core-concepts/"
canonicalUrl: "https://palantir.com/docs/foundry/global-branching/core-concepts/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d980b364182a5f9f415073a0a2b9872af147739d50fed7c3a55294f84f54f3c2"
product: "foundry"
docsArea: "global-branching"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Core concepts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Core concepts

## Branching

Software developers typically use version control systems to coordinate work in a codebase. This enables multiple engineers to contribute to the same code safely.

In the Palantir platform, you can think about data and change management the way software developers think about code: you need a way to allow many people to make changes and interact with the same data without interfering with someone else's work. Global Branching takes the best practices from software development and applies them to the Palantir platform, harnessing a common feature of version control systems called **branching**.

At a high level, **branching** allows you to fork your existing environment and work on components of your end-to-end workflow in a contained branch. When you are satisfied with your changes, you can deploy the changes introduced by your branch back into `Main`.

## Branching workflow

The diagram below shows how you can use a branching workflow to make changes to data pipeline code in Pipeline Builder, the Ontology, and Workshop applications in the Palantir platform.

![Branching workflow](/docs/resources/foundry/global-branching/branching-workflow.png)

To follow a branching workflow:

1. **Create a branch:** In Foundry, the **`Main` branch** refers to the primary assets in production that are used by application builders, such as Code Repositories and Pipeline Builder, the Ontology, and Workshop applications. When you want to work on your own changes, you create your own branch, which creates an environment for you to experiment and test out ideas without worrying about affecting the `Main` branch.
2. **Create changes:** Within your branch, you can make changes to transforms code repositories, Pipeline Builder, the Ontology, and Workshop applications. Your changes are tracked so that there is a history of all the updates you have made on your branch.
3. **Create a proposal:** Once you finish working in isolation, you may want to deploy your changes back to the `Main` branch. To start this process, create a [**proposal**](#proposal). Creating a proposal through the Global Branching interface effectively creates proposals for all modified assets in their respective applications.
4. **Review proposal:** After you create a proposal, your team will have the chance to review your changes. Every organization will have a different process or team for reviewing proposals.

## Branch statuses

* **Active:** Branches that are in progress or approved.
* **Deployed:** Branches that have been deployed to the `Main` branch.
* **Inactive:** Branches that have not seen activity after a certain number of days are marked as inactive. Refer to the [retention policy](/docs/foundry/global-branching/branch-retention/) for additional details.
* **Closed:** Branches that have been closed and were not deployed. For cost efficiency, branches that are inactive for a certain number of days will be closed automatically, and their resources will be deleted if not deployed to `Main`. Branches with active open proposals will not be closed automatically. [Review the Retention policy for details.](/docs/foundry/global-branching/branch-retention/) Currently, closed branches cannot be reopened.

## Proposal

A **proposal** is analogous to a pull request in a version control system, specifically tailored for Global Branches. It serves as a mechanism for reviewing and approving changes made in a separate branch before they are integrated into the `Main` branch. A proposal contains information such as a description of changes made on the branch, a list of resources modified, their associated reviewers, and their status. A single proposal can contain a single or multiple changes.

## Proposal statuses

* **Active:** Proposals that are in progress or approved.
* **Deployed:** Proposals that have been deployed to main branch.
* **Closed:** Proposals that have been closed, and were not deployed.
