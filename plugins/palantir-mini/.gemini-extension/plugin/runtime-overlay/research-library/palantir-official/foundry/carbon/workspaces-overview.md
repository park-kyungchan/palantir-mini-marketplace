---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/workspaces-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/workspaces-overview/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "faf59f1a18fcfff8d6619aa9b7711ab15430b8bf6abd2e40a45e282ac99012f2"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Workspaces > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Workspaces

A Carbon workspace is a curated collection of applications and resources that can be configured to optimize a user workflow.

Carbon workspaces can be used to promote the discoverability of Foundry resources, which can be linked on the [home page](#home-page), discovered with search, or added to the **Open in** menu in Object Explorer.

By [configuring navigation in Carbon](/docs/foundry/carbon/workspaces-navigation/) and customizing the [menu bar](#menu-bar), a workspace builder can create a workflow where a user seamlessly steps through the resources in which they can interact with a particular object.

## Home page

Carbon provides a configurable home page as an entry point to each workspace. The home page displays an Ontology-aware search bar as well as configurable sections for links to modules, object types, and other Foundry resources. Alternatively, any module can be chosen as a workspace's home page.

![home page Concept](/docs/resources/foundry/carbon/homepage-concept.png)

Administrators can configure the logo as well as the content and layout of the home page's links. For more information, see the [home page configuration documentation](/docs/foundry/carbon/configuration-home/).

## Menu bar

Each Carbon workspace has a customizable menu bar that consists of the following components:

* The [Navigation Menu](/docs/foundry/carbon/workspaces-navigation/), which is a configurable dropdown containing [promoted workspaces](#promoted-workspaces) and external application links.
* Tabs containing anchored modules that are key to a workspace's use case.
* An optional button to open additional modules in workspace tabs.
* Utility buttons for help resources and, optionally, notifications, as well as a utility button with options to view one's user profile or log out of Foundry.

Read more about [menu bar configuration](/docs/foundry/carbon/configuration-menu-bar/).

## Promoted workspaces

Promoted workspaces are those that are displayed in the [Navigation Menu](/docs/foundry/carbon/workspaces-navigation/). Promoted workspaces are [configured](/docs/foundry/carbon/workspaces-navigation/#promote-and-hide-workspaces) at the organization level.

In the Navigation Menu, each user will see all of the promoted workspaces to which they have access, for all organizations in which they are a member or a guest.

Non-promoted workspaces can be opened in a Project or via direct link.
