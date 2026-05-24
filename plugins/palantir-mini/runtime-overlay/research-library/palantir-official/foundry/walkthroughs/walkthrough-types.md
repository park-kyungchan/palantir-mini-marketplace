---
sourceUrl: "https://www.palantir.com/docs/foundry/walkthroughs/walkthrough-types/"
canonicalUrl: "https://palantir.com/docs/foundry/walkthroughs/walkthrough-types/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7542e5f613af5b4982f14e3d68d5a5d644e35f89d49f1d1739750b4d9535ca8a"
product: "foundry"
docsArea: "walkthroughs"
locale: "en"
upstreamTitle: "Documentation | Walkthroughs > Walkthrough types"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Walkthrough types

The Walkthroughs application offers two types of walkthroughs to support different onboarding workflows.

## Configure a walkthrough

In the Walkthrough configuration page, you can switch between the available multiple and single resource Walkthrough types.

:::callout{theme="neutral"}
When you switch types, the primary resource for a step may change. After switching, verify that each step’s primary resource is correct.
:::

## Multiple resource walkthroughs

This is the default walkthrough type. Each step has its own primary resource that can be configured to help navigate users through Foundry.

![The option to choose a multiple resource walkthrough.](/docs/resources/foundry/walkthroughs/multiple-resources-walkthrough.png)

You should use this type for walkthroughs that have multiple different resources across steps. If there is a primary resource in a step, Walkthroughs will always navigate the user to that resource. For example, if you have a workflow that requires users to create an action type and then edit a Workshop module, you should use a multiple resources walkthrough.

![An example of a multiple resource walkthrough, using a Support Ticket workflow.](/docs/resources/foundry/walkthroughs/multiple-resources-walkthrough-example.png)

## Single resource walkthroughs

Single resource walkthroughs stay focused on one primary application or resource across all steps, removing repetitive setup and keeping context consistent for users.

You should use this type for walkthroughs or guides that are centered on a single application, Carbon workspace, or other resource.

![The option to create a single resource walkthrough, using a Support Ticket Portal resource.](/docs/resources/foundry/walkthroughs/single-resource-walkthrough.png)

Single resource walkthroughs have a few key differences in behavior compared with multiple resource walkthroughs:

* Auto-navigation is disabled between steps unless the active step has a configured URL suffix.
* In a single‑resource walkthrough, the **Files** tab and resources used in each step are hidden from users.
* Walkthroughs centered on a single Foundry application appear in the Walkthroughs sidebar when the user opens that application.

When switching to single resource walkthroughs, the primary resource of the walkthrough is automatically added as the primary resource of each step.

Although secondary resources are hidden in single resource walkthroughs, you can still use them to configure the primary resource. For example, to highlight Workshop modules within a Carbon workspace, add the modules as secondary resources and configure highlighting on them. When Workshop is open within the Carbon workspace, its widgets will be highlighted. You may also use the secondary resource configuration to configure behaviour for iframed resources.

![An example of a single resource walkthrough centered on a Support Ticket Portal resource.](/docs/resources/foundry/walkthroughs/single-resources-walkthrough-example.png)

## Walkthrough type feature comparison

| Feature | Multiple resource type | Single resource type |
|---------|------------------|-----------------|
| Auto-navigation between steps | ✓ | Only with URL suffix |
| Files tab visible | ✓ | ✗ |
| Per-step resources | ✓ | ✗ |
| Best for | Cross-platform workflows | Application-specific training |
