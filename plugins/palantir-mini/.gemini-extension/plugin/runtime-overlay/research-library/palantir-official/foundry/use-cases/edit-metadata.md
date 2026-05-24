---
sourceUrl: "https://www.palantir.com/docs/foundry/use-cases/edit-metadata/"
canonicalUrl: "https://palantir.com/docs/foundry/use-cases/edit-metadata/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4084034f4f0923fb6eb7dc84c68cd11bd35561457deaf4d6861a1fe77f0f39ef"
product: "foundry"
docsArea: "use-cases"
locale: "en"
upstreamTitle: "Documentation | Use Cases [Sunset] > Edit metadata"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Edit metadata

After [creating your use case](/docs/foundry/use-cases/getting-started/) with an existing or new backing Project, you can modify the metadata that helps define your use case. This metadata can be found in your use case overview page and includes the use case name, description, owners, and status.

![Example of use case metadata](/docs/resources/foundry/use-cases/example-use-case-metadata.png)

## Name

Change the name of your use case by clicking on the use case name at the top of the page and editing within the text field.

![Rename use case name](/docs/resources/foundry/use-cases/rename-use-case.png)

## Description

Change the description of your use case by clicking on the description at the top of the page and editing within the text field.
As a builder, you can use this field to document the use case, describing its purpose and any relevant information that will help with maintenance over time.

:::callout{theme="neutral"}
You can also add a description to each application in the use case by clicking into the application page and editing the description field.
:::

![Edit use case description](/docs/resources/foundry/use-cases/modify-use-case-description.png)

## Documentation

You can view and edit use case documentation using Markdown language. Expand the documentation section by selecting **Show documentation > Edit**.

![View use case documentation](/docs/resources/foundry/use-cases/modify-use-case-documentation-view.png)

In the Markdown editor, use the **Write** tab to input or update the use case documentation, and the **Preview** tab to view your changes before saving them.

![Edit use case documentation](/docs/resources/foundry/use-cases/modify-use-case-documentation-edit.png)

:::callout{theme="neutral"}
To edit use case documentation, you must have [case editor or owner role](/docs/foundry/use-cases/permission-use-case/) and edit rights on the project [cover page](/docs/foundry/compass/use-project-navigation-panel/#cover-page) as use case documentation is stored on the backing project cover page.
:::

## Owners

There are two types of owners that you can assign to your use case: **Technical** and **Business**. Both can be assigned to an individual user or a group.

* **Technical owner:** The technical owner is generally the application builder who is developing the use case.
  * The user who created the use case is the default technical owner of the use case.

* **Business owner:** The business owner is typically a user who tracks workflow progress and financial details of a use case.
  * There is no default user assigned as a business owner to your use case.

![Use case with an assigned technical owner](/docs/resources/foundry/use-cases/use-case-tech-owner.png)

To change the owners of your use case, hover over the name or empty field and select the pencil icon. This will open a search dropdown where you can scroll through or search for available users or groups.

![Use case with both an assigned technical and business owner](/docs/resources/foundry/use-cases/use-case-business-owner.png)

## Status

You can assign your use case a status related to its operation status:

* **Active:** Published and operating within your Foundry instance.
* **Experimental:** In-progress and not actively published.
* **Deprecated:** No longer in operation.

To change the status of our use case from `Experimental` to `Active`, select the status dropdown, choose `Active`, then click **Change status**.

![Use case statuses](/docs/resources/foundry/use-cases/use-case-statuses.png)

:::callout{theme="neutral"}
If you change a use case status to `Active` while the use case has object types or action types in `Experimental` or `Deprecated` status, a warning sign will appear near the status dropdown and in the top left sidebar indicating a disparity between resource and use case statuses. We generally do not recommend creating this discrepancy.
:::
