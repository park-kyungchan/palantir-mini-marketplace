---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/workspaces-navigation/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/workspaces-navigation/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f66970abe7f5af82ea2537bbd39d9cb4a024ee71f1ff09185a500cb1b6e2408b"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Workspaces > Configure navigation between workspaces"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure navigation between workspaces

The Navigation Menu allows users to move between Carbon workspaces and access other Foundry applications. In order for a workspace to be visible to a user in the Navigation Menu, the user must have view access on the workspace resource and belong to an organization for which the workspace is "promoted". The Navigation Menu can also display links to [other Palantir Foundry applications](#add-additional-links-to-the-navigation-menu).

Note that workspaces that have not been promoted are not displayed in the Navigation Menu, but are still accessible to users via a direct link.

## Promote and Hide Workspaces

Only Carbon administrators can edit the list of promoted workspaces for each organization. To configure promoted workspaces, enter edit mode by clicking the **Edit** button in the menu bar.

<img src="./media/configure-navigation-menu.png" alt="Configure Navigation Menu" width="300" />

Once the edit sidebar is open, first select the Organization that you want to configure in the dropdown at the top of the sidebar (**A**). Note that a dropdown will only appear if you have Carbon administrator permissions in multiple organizations.

After the desired Organization has been selected, you can reorder and demote Workspaces for the Organization by clicking on **Edit** (**B**) and save by clicking **Done**. Changes to the allowlist are saved and implemented immediately.

To add a new workspace to the Navigation Menu, you can either (**C**) open an existing workspace (that is not yet promoted to the allowlist) or (**D**) create a new workspace, then promote the workspace in the [Access tab](/docs/foundry/carbon/configuration-access/#workspace-visibility) of the edit sidebar.

:::callout{theme="warning" title="Warning"}
Note that the promoted workspace configuration applies to an entire organization and is not workspace-specific. All the users within a certain organization will see the same configuration, regardless of the specific workspace they are in.
:::

## Add additional links to the Navigation Menu

If a user needs to access parts of the platform that are not available within Carbon, you can configure additional links in the Navigation Menu. In the edit sidebar mode, click **Configure** in the **Organization** section to open the organization metadata dialog. From here, add links to specific platform applications or set a custom link to a different part of the platform. For each link, you can set a custom icon, link title, or relative URL.

<img src="./media/configure-navigation-menu-add-links.png" alt="Configure External Links" width="400" />

Follow [these instructions](/docs/foundry/carbon/configuration-general/#external-links) to override the organization-level external links at the workspace level.
