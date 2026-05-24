---
sourceUrl: "https://www.palantir.com/docs/foundry/carbon/permissions-default-workspace/"
canonicalUrl: "https://palantir.com/docs/foundry/carbon/permissions-default-workspace/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fb7318a2f79c32df3ac38edf7da8bd552457c90a73f9b17a5dca7a0294fa479c"
product: "foundry"
docsArea: "carbon"
locale: "en"
upstreamTitle: "Documentation | Permissions and access > Set a default workspace"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Set a default workspace

A default workspace is the workspace a user will be directed to when going to `/workspace/carbon/`.

Since users can have access to more than one Carbon workspace, we recommend setting a default workspace for each user group. In order to set a default workspace for a user group, the workspace must be both [promoted](/docs/foundry/carbon/configuration-access/#workspace-visibility) *and* have that user group in the configured list of user groups for which the workspace is default.

:::callout{theme="neutral"}
To redirect users to a default Carbon workspace when logging into Foundry, you must first [configure the home page URL](/docs/foundry/administration/configure-platform-experience/#configure-the-home-page-url).
:::

## Adding a user group to the default workspace list

Every Carbon workspace has a list containing the groups for which that workspace is the default. Administrators can update this list in the **Access** tab of the configuration editor for a given workspace, under the **Default workspace** heading.

<img src="./media/configure-workspace-default-workspace.png" alt="Default workspace" width="300" />

:::callout{theme="neutral"}
Note that default workspace updates are saved independently from other configuration changes; after making a change, the new default workspace will be applied immediately.
:::

### What if a user group has no default workspace configured?

If a user is not part of any user group that has a default workspace configured, the user will be asked to choose from the list of promoted workspaces when they first visit Carbon. From this point onwards, the most recently visited workspace is treated as the user's default workspace.

Note that the most recently visited workspace is stored in a browser cookie, so if the user clears their cookies or accesses Carbon on another browser/device, they will again be asked to choose from a list of available workspaces.

### What if a user has more than one default workspace?

If a user has two or more default workspaces, they effectively will not have a default workspace. This will result in the same behavior as occurs when [no default workspace is configured](#what-if-a-user-group-has-no-default-workspace-configured). This might occur under two conditions:

* The user is in a user group with two or more default workspaces.
* The user is in two or more user groups with distinct default workspaces.

If this condition applies, and the user has visited Carbon before, they will be defaulted to their most recently visited workspace, [as outlined above](#what-if-a-user-group-has-no-default-workspace-configured).
