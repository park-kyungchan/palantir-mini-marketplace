---
sourceUrl: "https://www.palantir.com/docs/foundry/data-lineage/check-permissions/"
canonicalUrl: "https://palantir.com/docs/foundry/data-lineage/check-permissions/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7fbd19a01199874b8b8d8fa9c2fa88bd22592e1cc8f622e3bd492a2a4b39ea49"
product: "foundry"
docsArea: "data-lineage"
locale: "en"
upstreamTitle: "Documentation | Understand permissions > Check resource permissions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Check resource permissions

You can use Data Lineage to check users' permissions to view datasets or artifacts using the "Permissions" coloring option. To do that, start by adding nodes to the graph. You can do so using the search helper on the side panel.

![Add nodes to the graph](/docs/resources/foundry/data-lineage/data_lineage_permissions_1.gif)

Then expand the graph to view the lineage leading to your resource (read more about [exploring lineage](/docs/foundry/data-lineage/explore-lineage/)).

![Expand graph to view lineage](/docs/resources/foundry/data-lineage/data_lineage_permissions_2.gif)

Once you have done this, use the **Node color options** dropdown to select the **Permissions** color scheme.

![Select permissions color scheme](/docs/resources/foundry/data-lineage/data_lineage_permissions_3.gif)

Select the user's name from the **View as** dropdown. This will allow you to see the user's permissions to each of the nodes on the graph.

![Select user's name from dropdown](/docs/resources/foundry/data-lineage/data_lineage_permissions_4.gif)

There are two permission types you can color by:

* [Data access in datasets](#data-access-in-datasets)
* [Resource access](#resource-access)

![Permission types for coloring nodes](/docs/resources/foundry/data-lineage/data_lineage_permissions_5.png)

### Data access in datasets

Use this option to troubleshoot permissions issues. Remember that a user's data access is affected by data lineage (see [Platform Security](/docs/foundry/security/checking-permissions/)). By coloring your nodes based on the user's access to data, you can easily see what the upstream datasets are that may restrict the user's access to data.

Note that this option only works on dataset nodes.

### Resource access

This will allow you to see the [role](/docs/foundry/security/projects-and-roles/) (such as Editor, Viewer, etc.) that is set for the selected user on the selected resource.

Use this option to view the level of access users have to your artifacts.

:::callout{theme="neutral"}
Roles do not correspond to data lineage the same way that data access does. For example, user being an "Editor" on a Contour Analysis does not guarantee they have permissions to see the data that the analysis depends on. Make sure your users can access the underlying data when sharing a resource with them.
:::
