---
sourceUrl: "https://www.palantir.com/docs/foundry/fusion/dropdowns-locked-cells-links/"
canonicalUrl: "https://palantir.com/docs/foundry/fusion/dropdowns-locked-cells-links/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d46804e476c22e44760064d0e23192d3d78b8d0160705b1dc79b49610110e050"
product: "foundry"
docsArea: "fusion"
locale: "en"
upstreamTitle: "Documentation | Sheets > Dropdowns, locked cells, and links"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Dropdowns, locked cells, and links

Any cell in a Fusion spreadsheet can be converted to a dropdown using the `dropdown` and `multidropdown` functions (e.g. `=dropdown(array(1,2,3))`). The `dropdown` function has other optional arguments that can be found in the [function library](/docs/foundry/fusion/function-library/) to customize the behavior.

![dropdown](/docs/resources/foundry/fusion/dropdown.png)

You can lock any set of cells in a shared spreadsheet to prevent accidental edits. Once locked, any user will need to remove the lock to be able to edit the cell again.

![cell\_locking](/docs/resources/foundry/fusion/cell_locking.png)

The `url` function allows you to create links in any cell of the spreadsheet. You can use the `url_encode` and `query_params` functions to get help formatting a string for a complex URL.
