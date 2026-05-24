---
sourceUrl: "https://www.palantir.com/docs/foundry/code-workbook/environment-view-resolved/"
canonicalUrl: "https://palantir.com/docs/foundry/code-workbook/environment-view-resolved/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b07008ba8451ada663dc8c182e05237ef6663b99ad467acabc98d82961d8d1b0"
product: "foundry"
docsArea: "code-workbook"
locale: "en"
upstreamTitle: "Documentation | Environment > View resolved environment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# View resolved environment

After obtaining a Spark environment, you can view the exact packages installed in the Spark environment in the Resolved Dependencies dialog. To open the dialog, select **Environment > View resolved packages**. The dialog will show a list of the direct and transitive dependencies.

![environment view resolved](/docs/resources/foundry/code-workbook/environment-view-resolved.png)

A direct dependency is a package explicitly specified by the user to include in the Spark environment. You can specify direct dependencies in the **Customize Spark Environment** menu.

A transitive dependency is a package relied upon by a direct dependency. For example, depending on `statsmodels` transitively imports `NumPy`, `SciPy`, `MatPlotLib`, and their dependencies as well.

![environment view dependency tree](/docs/resources/foundry/code-workbook/environment-view-tree.png)
