---
sourceUrl: "https://www.palantir.com/docs/foundry/ontology-manager/migrate-to-project-based-permissions/"
canonicalUrl: "https://palantir.com/docs/foundry/ontology-manager/migrate-to-project-based-permissions/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ad440b39907823d2025e8b064eca52a51fa55fa47b835c5dd148ecc6dd50acf3"
product: "foundry"
docsArea: "ontology-manager"
locale: "en"
upstreamTitle: "Documentation | Ontology Manager > Migrate to project-based permissions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Migrate to project-based permissions

:::callout{theme="neutral" title="Beta"}
Project-based permissions are in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available for your enrollment. Functionality may change during active development.
:::

Ontology resources, including object types, action types, link types, interfaces, and shared properties, can now be saved within specific projects and automatically inherit permissions from those projects. Object and link instance permissions remain dependent on the backing datasource location. [Project-based permissions](/docs/foundry/object-permissioning/ontology-permissions/) will soon replace the previous ontology roles and datasource-derived permissions models.

You can migrate your existing ontology resources to [project-based permissions](/docs/foundry/object-permissioning/ontology-permissions/). This migration suggests the placement of ontology resources into appropriate projects while ensuring they receive the correct permissions.

Migrating to project-based permissions allows you to manage permissions in bulk, since ontology resources inherit permissions from their parent projects. You can control the visibility of multiple ontology resources by editing permissions at the project level.

When users require different permissions for ontology resources and their backing datasources, you can assign these resources to separate projects and manage access independently.

:::callout{theme="warning"}
Once a resource has been migrated to project-based permissions, it cannot be reverted to ontology roles or datasource-derived permissions.
:::

To save new ontology resources into projects by default, ontology owners can navigate to the **Ontology configuration** tab in Ontology Manager and toggle on **Require new ontology resources be saved in a project**. Once enabled, you will be prompted to choose a save location when creating new ontology resources.

## Limitations

Before starting, be aware of the following limitations:

* This feature is not yet available for default ontology objects or [CBAC stacks](/docs/foundry/security/classification-based-access-controls/).

* Ontology resource names must conform to Compass conventions. Forward slashes ("/") are not allowed, and duplicate names are not permitted. While aliases allow duplicate names to be rendered, the system removes duplicates by appending "(1)" to ensure unique paths.
  * Each ontology resource must have a unique name
  * Example: `common/utility-room` is invalid due to the forward slash

* Datasources backing object types must be located in the same space as the ontology.

## Approaches to migration

Before starting the migration, consider how you want to organize your ontology resources:

* **Save ontology resources alongside datasources:** Keeping ontology resources next to their corresponding datasources ensures consistent permissions across resources and instances. This approach lets you grant permissions to the entire use case in one place, ensuring the right users can view, edit, or manage all components together.

* **Save ontology resources in a dedicated project:** Create one or more separate projects specifically for ontology resources. Grant broad access to these projects to make ontology resources discoverable to everyone who needs them.

:::callout{theme="neutral"}
Ontology resources have separate permissions from object and link instances. This migration affects only ontology resource permissions. Object and link instances permissions remain based on the backing datasource location.
:::

## Use the migration assistant (recommended)

The migration assistant helps you quickly identify suitable projects and locations for your ontology resources.

**To access the migration assistant:** Select your ontology, navigate to the **Ontology configuration** page, and select **Proceed to migration** under the **Migrations** section.

![Navigate to the Ontology configuration page, then use the "Proceed to migration" option.](/docs/resources/foundry/ontology-manager/proceed-to-migration.png)

Strong recommendations for where to move resources are preselected to accelerate your workflow, while weaker suggestions remain unselected for your review. After confirming your selections, proceed with the migration. Before finalizing, you can create necessary imports or cancel the operation.

![The migration assistant preselects strong recommendations for your review.](/docs/resources/foundry/ontology-manager/migration-assistant-recommendations.png)

These recommendations help you make faster, more informed decisions about resource placement. If no recommendations are available, you can manually select locations in the **Individual resources** tab of the migration assistant.

![Manually select locations to migrate individual resources.](/docs/resources/foundry/ontology-manager/migration-assistant-individual-resources.png)

## Migrate resources directly

You can also migrate resources without using the assistant, which is useful when you know exactly where resources should go or want to migrate specific resources quickly.

* **Bulk migrate multiple resources:** Select your ontology, then choose a resource type from the **Resources** section in the left sidebar. Select the items to migrate, then use the dropdown menu to select **Project permission migration**. <br><br>
  ![Migrate resources in bulk by selecting the resources and then using the option in the dropdown menu.](/docs/resources/foundry/ontology-manager/project-based-perm-bulk-res-migration.png) <br><br>

* **Migrate an individual resource:** Open an ontology resource and use the **Actions** dropdown menu on the **Overview** page to select **Project permission migration**. <br><br>
  ![Migrate an individual resource using the dropdown menu.](/docs/resources/foundry/ontology-manager/project-based-perm-individual-res-migration.png)
