---
sourceUrl: "https://www.palantir.com/docs/foundry/use-cases/permission-use-case/"
canonicalUrl: "https://palantir.com/docs/foundry/use-cases/permission-use-case/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "356b8e7060a8f2dd28e50de89e62bae1ab763fa3b898e5bdc301baf37cc4ad5b"
product: "foundry"
docsArea: "use-cases"
locale: "en"
upstreamTitle: "Documentation | Use Cases [Sunset] > Permission a use case"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Permission a use case

Use case permissions only manage the permission of [use case metadata](/docs/foundry/use-cases/edit-metadata/).

## Metadata

The permission of the use case metadata is managed through the **Roles** panel. In the use case overview page, select the **...** option in the left sidebar or on the top right side of the overview page and select **Manage permissions**.

![Manage permissions from use case overview](/docs/resources/foundry/use-cases/manage-use-case-permissions.png)

You can use the **Roles** panel to add or remove users or groups to the use case and assign them either the `Use Case Owner` or `Use Case Editor` role.

![Use the use case Roles panel to add user permissions](/docs/resources/foundry/use-cases/use-case-roles-panel.png)

**Use Case Owner:** Users with `Use Case Owner` permissions can both manage the use case permissions and [edit use case metadata](/docs/foundry/use-cases/edit-metadata/).

**Use Case Editor:** Users with `Use Case Editor` permissions can only [edit the use case metadata](/docs/foundry/use-cases/edit-metadata/).

:::callout{theme="neutral"}
By default, use case metadata is visible to everyone in the Organization, even if the users cannot view or edit the use case resources.
:::

## Resources

Permissions to the resources included in the use case are managed by the permission on the resource itself or the Project backing the use case. Learn more about managing [Project](/docs/foundry/security/projects-and-roles/) and [Ontology resource](/docs/foundry/object-permissioning/ontology-permissions/) permissions.
