---
sourceUrl: "https://www.palantir.com/docs/foundry/notepad/snapshot-widgets/"
canonicalUrl: "https://palantir.com/docs/foundry/notepad/snapshot-widgets/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e9c71fd81cae4b73d19e0d1f22ac7861aa494f9814d257771767290176ca1589"
product: "foundry"
docsArea: "notepad"
locale: "en"
upstreamTitle: "Documentation | Documents > Lock widget data"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Lock widget data

:::callout{theme="warning" title="Lock Data Permissions"}
Locking data on a widget creates a static snapshot of the widget as it appears to the user who clicks **Lock data**. This snapshot will be visible to any user who has access to the Notepad document and meets the mandatory security controls ([markings](/docs/foundry/security/markings/)) for the widget's source and for any resources that supply data to the widget. <br><br>
For all lockable widgets other than Contour widgets, note that it is not possible to "lock data" in cases when a [restricted view](/docs/foundry/security/restricted-views/) supplies data to the visualization or when appropriate access controls cannot be reliably determined. Review the *Interactive locking for Contour widgets* callout below for additional information. <br><br>
Also, like other derived artifacts in Foundry, users are not required to have a [role](/docs/foundry/security/projects-and-roles/#roles) on the source resource or on the other resources that supply data to the visualization. <br><br>
Foundry administrators can require users to provide justification before locking data by configuring the **Notepad lock data** [checkpoint](/docs/foundry/checkpoints/overview/). <br><br>
*Updated February 2024*
:::

By default, Notepad will update embedded charts and tables in a document as the underlying source data changes. If you do not want a widget to display updated data, you can create a static snapshot of a widget by clicking the **Lock data** button in the widget footer; the **Lock data** button appears when a widget is selected and hovered over.

:::callout{theme="neutral" title="Interactive locking for Contour widgets"}
The lock data feature on the Contour widget functions differently from other widgets. When applied, it locks both the visualization and data of the Contour widget while still allowing user interaction. Interactively locked widgets will not load the locked visual if the backing transactions have been deleted either manually or by a retention policy. Contour widgets will not lock if they are configured with [Notepad template input parameters](/docs/foundry/notepad/templates-inputs/). <br><br>
For more information about the Contour chart widget, refer to the [widget documentation.](/docs/foundry/notepad/widgets-contour-chart/)
:::

Locked widgets display the preserved snapshot of the widget along with a lock symbol and the time of snapshot creation. You can unlock a widget again by clicking the **Update data** button in the footer. Note that unlocking will cause the current snapshot to be lost.

![snapshot\_widgets\_freeze\_unfreeze](/docs/resources/foundry/notepad/snapshot_widgets_freeze_unfreeze.png)

## Lock or unlock all widgets

Users can select the **Actions** menu in the top-right of their screen to lock or unlock data for widgets in their Notepad.

![The Actions dropdown menu is displayed, where a user can lock or unlock data for the widgets in their Notepad.](/docs/resources/foundry/notepad/lock_or_unlock_all_widgets.png)
