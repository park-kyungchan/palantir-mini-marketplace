---
sourceUrl: "https://www.palantir.com/docs/foundry/global-branching/branching-functions/"
canonicalUrl: "https://palantir.com/docs/foundry/global-branching/branching-functions/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f72c9ffe0059be0e1099f9434dfd1c93f538f5d612825d78ad5f126f1546de94"
product: "foundry"
docsArea: "global-branching"
locale: "en"
upstreamTitle: "Documentation | Usage > Branching functions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Branching functions

You can develop, publish, and consume functions on a Global Branch. This is currently supported for TypeScript v1 Function repositories.

## Developing functions

:::callout{theme="neutral"}
To support Global Branching, upgrade your repository template version to version `0.903.0` of the `functions-typescript` child template or higher. Review [the documentation on repository upgrades](/docs/foundry/code-repositories/repository-upgrades/#manual-branch-upgrade) for instructions.
:::

You can develop a function that depends on changes made to resources on your Global branch, such as newly-created or modified ontology entities. Note that it is currently not possible to depend on branched versions of query functions.

![Developing a new function on a branch.](/docs/resources/foundry/global-branching/branch-function.png)

When you are ready, you can publish your function with a **version target**. The **version target** represents the stable version of the function that will be published on main when the Global Branch merges.  During development on your branch, the function publishes as unstable preview versions.

![Publishing functions on a branch.](/docs/resources/foundry/global-branching/branch-function-publish.png)

Once you have successfully published your function on the branch, you can use the new function version on your branch in Workshop and function-backed actions. This function version is labeled with the `Branched pre-release` tag. Note that functions published on your branch will not be accessible from other branches, including `main`.

![Using a branched function in Workshop.](/docs/resources/foundry/global-branching/branch-function-backed-variable.png)

![Using a branched function in actions.](/docs/resources/foundry/global-branching/branch-function-backed-action.png)

As you continue developing on your branch, you can continue publishing function versions to the same version target. As long as your version target remains the same, any Workshop modules or action types using your function will automatically pull the latest published version. This lets you iterate quickly without manually updating function references after each publish.

If the version target on the branch changes, you must update Workshop modules and action types that were using the old version on the branch to use the new version target. This will also be displayed as a [merge check](/docs/foundry/global-branching/branching-lifecycle-usage/#merge-checks-and-resolving-errors).

:::callout{theme="neutral"}
The merge check for function-backed action types is not currently displayed, but is still enforced. If you are modifying function-backed action types and failing merge checks, double-check the affected action types.
:::

## Conflict resolution and rebasing functions

When developing on a branch, you will not automatically receive newer function versions published to `main`. This prevents main development from disrupting your branch work. If newer versions are available on `main`, you will see notifications in function version selectors and Ontology Manager. You can then rebase your function versions to pull in all newer versions from `main`.

![Rebasing functions dialogue.](/docs/resources/foundry/global-branching/rebasing-functions.png)

If your version target gets published to `main` while you are developing, you must select a new version target before merging. Once you do, update any Workshop modules and action types to use the new version target.

## Merging

When merging your Global Branch, modified functions will be published on `main` with the stable version target. Workshop modules or action types using the version published on your branch will automatically start using the new stable version that was published on `main` as part of the merge.

:::callout{theme="warning"}
Foundry only merges your version target into `main` and does not merge other versions published on the branch. Those versions will not exist on `main` after your branch merges.
:::
