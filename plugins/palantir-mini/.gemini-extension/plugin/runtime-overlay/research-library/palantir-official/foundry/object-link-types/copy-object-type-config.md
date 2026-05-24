---
sourceUrl: "https://www.palantir.com/docs/foundry/object-link-types/copy-object-type-config/"
canonicalUrl: "https://palantir.com/docs/foundry/object-link-types/copy-object-type-config/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d656e1bbf060fc52a44ce8d0c6a2c8f98c3ea265d210e405418d74f194d7a992"
product: "foundry"
docsArea: "object-link-types"
locale: "en"
upstreamTitle: "Documentation | Object types > Copy object type configuration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
Object types can sometimes have similar schema. For example, the schema for `Car` and `Truck` may be very similar, with only a few differing properties. To reduce the time you spend setting up the `Truck` object type, you can copy over the configuration from the `Car` object type.

## Select the object type to copy

You can copy the configuration of an object type with the following steps:

1. Select the three dots at the top right side of the object type view sidebar.
2. Select the **Copy configuration to another object type** option from the dropdown. This will open the **Copy object type configuration** dialog.

![Copy configuration to another object type](/docs/resources/foundry/object-link-types/copy-object-type-configuration-dropdown.png)

## Copy object type configuration

The **Copy object type configuration** dialog will give you the option to either:

* Select an existing object type as a destination for the copied object type configuration, or
* Create and name a new object type with the copied object type configuration.

<img src="./media/copy-object-type-configuration-dialog.png" alt="Copy object type configuration dialog" width="300" />

Selecting **Confirm** will copy all of the starting object type’s properties and its metadata (such as statuses, render hints, and so on).

:::callout{theme="warning" title="Warning"}
If the existing object type selected as a copy destination already has existing properties, the following may occur:

* Existing properties on the existing object type will be overwritten by the properties copied over from the starting object type.
* Copied properties will automatically be mapped to the existing object type’s backing datasource if a column matches the name of a copied property.

Therefore, when selecting an existing object type as a copy destination, ensure that the destination object type has the same schema as the object type you are copying.
:::
