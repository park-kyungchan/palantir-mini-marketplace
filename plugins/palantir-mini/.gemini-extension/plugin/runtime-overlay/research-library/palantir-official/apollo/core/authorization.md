---
sourceUrl: "https://www.palantir.com/docs/apollo/core/authorization/"
canonicalUrl: "https://palantir.com/docs/apollo/core/authorization/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "db5b9665e27e00de3161fa6d6dc275abb98927020c648002df1d67cd94fa2d6c"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Security > Authorization"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Authorization via roles

Apollo uses role-based access controls (RBAC) to determine what operations a user is authorized to perform. RBAC is a flexible authorization model where [Teams](/docs/apollo/core/teams/) can gain permissions to a set of operations based on their assigned roles. These roles can be granted for all resources in Apollo of a given type, like Release Channels, or for a specific resource of that type, such as the `STAGING` Release Channel. All users in the Team will be able to perform the operations that the role grants.

### Manage Administrator permissions

You can define who can manage permissions in Apollo by selecting **Manage** on the top right of the **Permissions** tab of the **Settings & Configuration** page.

![The Manage button for setting admin roles in Apollo is highlighted.](/docs/resources/apollo/core/manage-admin-permissions.png)

<img src="./media/manage-admin-roles.png" alt="The manage admin roles menu is open. Everyone has the Viewer role and the apollo-admins team has the Administrator role." width=500>

There are two possible roles that you can grant a team:

* Administrator: Users with this role can manage role assignments in Apollo.
* Viewer: This role allows users to view role assignments in Apollo.

### Configure RBAC for a resource

You can manage roles for all resources of a given type in the **Permissions** tab of the **Settings & Configuration** page. You can configure global RBAC settings for the following resources:

* Release Channels
* Vulnerability suppressions
* Vulnerability SLA settings
* Products
* Labels
* Environments

![The Permissions tab of the Settings and Configuration page is shown.](/docs/resources/apollo/core/permissions-tab.png)

Select a resource from the left panel. You can add a Team using the **Add more teams...** search bar. Then select the dropdown to the right of the Team and choose the relevant role(s).

![The dropdown to choose a role for a team is expanded for vulnerability SLA settings.](/docs/resources/apollo/core/select-roles.png)

You can view the possible roles for a resource by hovering over the role to the right of the resource in the left panel.

![The roles for labels are expanded. This user has only the Label creator role.](/docs/resources/apollo/core/view-roles-for-resource.png)

#### Roles for Release Channels

The possible roles for Release Channels are the following:

* Administrator: This role can edit metadata on the Release Channel, such as the description and label requirements.
* Contributor: This role can add any Product Release to the Release Channel if label requirements are satisfied.
* Restricted contributor: This role can add Product Releases that are owned by the user to a Release Channel if label requirements are satisfied.
* Viewer: Anyone in this group can view the Release Channel and its metadata, such as the Product Releases that have been added to the Release Channel.

#### Roles for vulnerability suppressions

The possible roles for vulnerability suppressions are the following:

* Administrator: Users with this role can manage vulnerability suppression settings and assign vulnerability suppression roles.
* Approver: This role can approve changes to vulnerability suppression settings.
* Viewer: This role allows you to view vulnerability suppression settings and content.

#### Roles for vulnerability SLA settings

There are three possible roles for vulnerability SLA settings:

* Administrator: Users with this role can manage vulnerability SLA settings and assign vulnerability SLA roles.
* Approver: This role can approve changes to vulnerability SLA settings.
* Viewer: This role allows you to view vulnerability suppression SLA and content.

#### Roles for Products

The possible roles for Products are the following:

* Product administrator: Users with this role can perform all operations on Products and Product Releases.
* Release creator: Users with this role can create and delete Releases for Products that already exist. This role is not sufficient to create new Products.
* Product creator: Users with this role can create and delete Products.
* Product editor: Users with this role can edit Products, Release metadata, and approve settings changes.
* Product viewer: Users with this role can view Products and Product Releases.

#### Roles for labels

The possible roles for labels are the following:

* Label administrator: This role can edit the label description along with any other metadata on the label.
* Label contributor: This role can apply labels to resources if they also have write permissions on the specific resource. For example, applying a label to an Environment also requires the Environment administrator role and applying a label to a Product or a Product Release requires being the Product editor.
* Label creator: This role allows users to create labels.
* Label viewer: This role can view labels and any values that correspond to labels.

#### Roles for Environments and Entities

The possible roles for Environments and Entities are the following:

* Creator: This role allows users to create Environments. The creator role is only useful when applied globally.
* Administrator: This role can manage roles on the Environment and Entities within the Environment. Administrators also have all the privileges of editors and viewers.
* Editor: This role can make changes to Environments and take privileged actions on Entities. This includes managing suppression windows, [maintenance window overrides](/docs/apollo/managing-environments/create-maintenance-window-overrides/), labels, secrets, subscriptions, and monitors on environments. It also includes managing Entity level secrets, subscriptions, and metadata. Editors have all the privileges of viewers.
* Operator: This role can perform routine operations on Entities within an Environment, such as approving changes to configuration and editing labels.
* Viewer: Users with this role can view all information related to the Environment such as change requests, config, and Entities in the Environment.

### Configure RBAC for a single Product

To manage roles for a specific Product, open the Product page and select **Actions** in the top right corner of the page, then select **Edit roles...**.

### Configure RBAC for a single Release Channel

You can manage roles for a specific Release Channel in the **Release channels** tab of the **Settings & Configuration** page. Select the Release Channel you want to edit, and then select **Edit** in the **Channel Details** panel.

![The two buttons to edit roles on a Release Channel are highlighted.](/docs/resources/apollo/core/release-channel-edit-roles.png)

This will open the **Permissions** tab of the Release Channel settings menu. You can add a new Team using the search bar. To edit the roles for a Team, select the dropdown to the right of the Team name.

<img alt="The Permissions tab of the Release Channel settings menu is displayed." src="./media/release-channel-settings-permissions-tab.png" width=600>

### Configure RBAC for a single label

You can manage roles for a specific label in the **Labels** tab of the **Settings & Configuration** page. Hover over the label that you want to manage, then select **Edit** on the right of the label.

![The button to edit roles for a label is highlighted.](/docs/resources/apollo/core/label-edit-roles.png)

This will open the **Permissions** tab of the label settings menu. You can add a new Team using the search bar. To edit the roles for a Team, select the dropdown to the right of the Team name.

<img alt="The Permissions tab of the label settings menu is shown." src="./media/label-settings-permissions-tab.png" width=600>

:::callout{theme="neutral"}
To apply labels to a resource, you must have the Label Contributor role as well as the required permissions on the resource. For example, to apply a label to an Environment, you must have the Label Contributor role for that label and be an Environment editor.
:::

### Configure RBAC for a single Environment

To manage roles for an Environment, select **Edit roles...** from the **Actions** dropdown located in the top right corner of the Environment home page.

<img alt="The Manage environment option in the Actions dropdown is highlighted." src="./media/manage-environment-rbac.png" width=400>

You can manage roles for an Environment in the **Roles** tab of the Environment settings menu. You can add a new Team using the search bar. To edit the roles for a Team, select the dropdown to the right of the Team name.

<img alt="The Roles tab of the Environment settings menu is displayed." src="./media/environment-settings-roles-tab.png" width=600>

You can use the **Manage default entity roles for this environment** section to manage roles for all Entities in the Environment. Learn more about [RBAC for Entities](#configure-rbac-for-a-single-entity).

### Configure RBAC for a single Entity

You can manage roles for all Entities in an Environment in the [Environment's settings](#configure-rbac-for-a-single-environment). These roles are inherited by every Entity in the Environment. Configuring additional roles for an Entity will only add these global settings and will not remove permissions.

To manage roles for a single Entity, select **Edit roles...** from the **Actions** dropdown located in the top right corner of the Entity home page.

<img alt="The Edit roles option in the Actions dropdown is highlighted." src="./media/entity-manage-roles.png" width=400>

This will open a menu where you can configure RBAC settings for the Entity. You can add a new Team using the search bar. To edit the roles for a Team, select the dropdown to the right of the Team name.

<img alt="The Entity roles menu is displayed." src="./media/entity-roles-menu.png" width=600>

The possible roles for Entities are the same as those for Environments, only they are applied at the Entity level and are not inherited for other Entiites.
