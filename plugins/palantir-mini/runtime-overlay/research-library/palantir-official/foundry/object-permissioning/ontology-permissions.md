---
sourceUrl: "https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions/"
canonicalUrl: "https://palantir.com/docs/foundry/object-permissioning/ontology-permissions/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "40eefc750a4e4a448c93d828a32518463956d76bd21be78dddbbd5c3cc406840"
product: "foundry"
docsArea: "object-permissioning"
locale: "en"
upstreamTitle: "Documentation | Object permissioning > Ontology permissions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ontology permissions

:::callout{theme="neutral" title="Beta"}
Project-based permissions are in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available for your enrollment. Functionality may change during active development. <br><br>
[You may also review the legacy documentation on previous ontology permissions models.](/docs/foundry/object-permissioning/ontology-permissions-legacy/)
:::

The permissions to view, edit, and manage ontology resources are managed through [Compass](/docs/foundry/compass/overview/), the Palantir platform's filesystem.

Currently, this feature must be [manually enabled and existing ontology resources require migration](/docs/foundry/ontology-manager/migrate-to-project-based-permissions/).

This project-based permissions approach replaces the previous permission models: [ontology roles and datasource-derived permissions](/docs/foundry/object-permissioning/ontology-permissions-legacy/). It comes with multiple benefits:

* **Unified permission model:** Ontology resources now use the same permission system as other resource types, so you only need to learn and manage permissions in one place.
* **Bulk management:** Set permissions at the folder or project level to control access across multiple resources at once, eliminating the need to set permissions on individual items.
* **Clearer visibility:** The **Security** tab and sidebar now display permissions and project context for all resources, including ontologies.
* **Increased functionality:** As project resources, ontologies gain access to Compass features like folders, access requests, markings, and tags.

## Example of project-based permission

For example, consider an object type called `Building`, now saved as a file in project `A`. Your ability to view, edit, or manage `Building` depends on your role in project `A`. If you are an `Editor` in project `A`, you can edit the `Building` object type. To view specific `Building` objects (like `Empire State Building`), you need the `Viewer` role on the object type and either access to the backing datasource or access granted through [object and property security policies](/docs/foundry/object-permissioning/managing-object-security/#object-and-property-security-policies), depending on how the object type's security is configured.

![Ontology resources in a project.](/docs/resources/foundry/object-permissioning/ontology-in-project.png)

If you only have viewing rights for the object type, you can only see information such as schema and contact information, not the actual data. If you need help understanding the permissions required, review the Compass project side panel.

## Viewing object types and objects

Object types are permissioned differently from objects. To see an object type, you must have View permissions on the object type, but do not need View permissions for the backing datasource.

To see objects, you must hold View permissions on the object type. Access to the underlying object data is determined by the object type's security configuration:

* **[Object and property security policies](/docs/foundry/object-permissioning/managing-object-security/#object-and-property-security-policies):** Object visibility is governed by policies configured directly on the object type, independent of the backing datasource permissions.
* **[Data source policies](/docs/foundry/object-permissioning/managing-object-security/#data-source-policies):** Object visibility is governed by the permissions on the backing data source. You must hold View permissions on the backing data source to see the objects.

For more information on configuring object security, review the [documentation on managing object security](/docs/foundry/object-permissioning/managing-object-security/). For more information on the distinction between object types (schema) and objects (data), review the [documentation on object permissions](/docs/foundry/object-permissioning/overview/).

## Edit permissions for links and actions

You will need the appropriate edit permissions depending on the resource you would like to edit:

* **For links:** You must hold edit permissions on both the link type and the linked object types.
* **For actions:** You must hold edit permissions on the action type and on all ontology resource types edited by the action.

## Previous permission models

Previously, permissioning ontology resources varied based on your ontology authorization model. The table below summarizes how resources are currently managed for each model. Refer to the [documentation to learn more about these legacy permission systems](/docs/foundry/object-permissioning/ontology-permissions-legacy/).

| Legacy Ontology permission models | Description                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ontology roles**           | - Ontology resources are permissioned in Ontology Manager using ontology specific roles (Ontology `viewer`, Ontology `editor`, and Ontology `owner`). They are not a resource of a project.             |
| **Datasource-derived**       | - Ontology resources derive their permissions from the backing datasource of the object. For example, you have `editor` on the object type if and only if you are editor on the backing datasource. |
