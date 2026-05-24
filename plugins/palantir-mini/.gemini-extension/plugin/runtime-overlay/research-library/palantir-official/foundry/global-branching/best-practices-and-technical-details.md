---
sourceUrl: "https://www.palantir.com/docs/foundry/global-branching/best-practices-and-technical-details/"
canonicalUrl: "https://palantir.com/docs/foundry/global-branching/best-practices-and-technical-details/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "464cb1d9a118e38c0e12b047ca19b138021c5ddfca643e47f835c0f4d3829316"
product: "foundry"
docsArea: "global-branching"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Best practices and technical details"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Best practices and technical details

Global Branching is highly opinionated about the development style that organizations should implement. It features a monorepo hierarchy and enforces [trunk-based development ↗](https://trunkbaseddevelopment.com/) for fast, stable development.

Branches are intended to be short-lived and relatively small. This is because large branches are difficult to review and maintain, as resources become more prone to conflicts the longer they remain open.

## Branching technical details

The following section includes details on how Global Branching works in different applications.

### Global Branching repositories in Code Repositories

Global Branching for Code Repositories builds upon the [existing Code Repositories branching implementation](/docs/foundry/code-repositories/branch-settings/).

![Global Branching within Code Repositories.](/docs/resources/foundry/global-branching/code-repository-example.png)

### Global Branching for data pipelines in Pipeline Builder

Global Branching for pipelines builds upon the [existing data pipelines branching implementation](/docs/foundry/data-integration/branching/#branching-technical-details).

![Global Branching within Pipeline Builder.](/docs/resources/foundry/global-branching/pipeline-builder-example.png)

### Global Branching for Ontologies

Navigate to the [Test changes in the ontology](/docs/foundry/ontologies/test-changes-in-ontology/) documentation page to understand the workflow.

![Global Branching within Ontology Manager.](/docs/resources/foundry/global-branching/oma-example.png)

### Global Branching for Workshop

Global Branching for Workshop enables you to modify Workshop modules and test changes on a branch. Unlike Pipeline Builder and Ontology Manager, Workshop does not have a branching mechanism other than Global Branching.

![Global Branching within Workshop.](/docs/resources/foundry/global-branching/workshop-example.png)

#### Modify and test Workshop modules on a branch

With Global Branching, data that has been modified on a branch in Pipeline Builder can be previewed in Workshop on that same branch. Similarly, Actions can be run and changes to the Ontology can be tested in Workshop modules. To learn more about running Actions on branches, refer to the [supported functionality](/docs/foundry/global-branching/supported-functionality/#supported-functionality) documentation.

:::callout{theme="neutral" title="Running actions on Global Branches"}
* To run an Action on a branch, all object types modified by the Action need to be indexed on the branch.
* Webhooks and email notifications are not executed when an Action is run on a branch.
* If an Action type is backed by a function that is configured to make calls to external systems, it cannot be run on a branch.
:::

#### Resolve conflicts

In some cases, the Workshop version on a branch can become out of date with the `Main` branch. This occurs when changes were made and merged to production after the creation of your Global Branch. To resolve this, a rebasing feature will highlight where conflicts are occurring.  Refer to [Workshop rebasing and conflict resolution](/docs/foundry/global-branching/rebasing-and-conflict-resolution/) for more information.

#### Review and approve changes

Workshop integration with the Approvals application is still in development. This means that Workshop changes do not currently require a review process to merge your branch; changes made by users with Editor rights on the module are automatically approved.

### Adding views to a branch

[Views](/docs/foundry/data-integration/views/) are not fully integrated into Global Branching, but can be added to a branch. To add a view on your branch:

1. Build the dataset that backs the view on your branch via Code Repositories or Pipeline builder.
2. On your view, use the **Build** dropdown in the top right corner to select **Customize build...**.
3. In the Data Lineage application, use the branch selector in the toolbar to select your branch name. Note that your branch name may appear slightly different in the branch selector, as spaces and underscores are not displayed.
4. In the **Manage builds** section, build the view on your branch. You will need to enable the **Force build on update-to-data resources** option.

Once the build completes, the view will be accesible on your branch and can be used as a datasource to back entities in Ontology Manager. Note that the view will not be tracked as a changed resource on the branch.

### Global Branching with restricted views \[Experimental]

Support for [restricted views in branching](/docs/foundry/security/restricted-views/) is in beta. To enable, contact your Palantir representative.
