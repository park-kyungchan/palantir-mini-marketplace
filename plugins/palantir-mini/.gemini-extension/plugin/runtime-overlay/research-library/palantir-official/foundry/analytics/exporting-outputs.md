---
sourceUrl: "https://www.palantir.com/docs/foundry/analytics/exporting-outputs/"
canonicalUrl: "https://palantir.com/docs/foundry/analytics/exporting-outputs/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "968cb42c1d6c1715f158a29dec24ede95d89664f0073d96c6a750ad3a4691cb9"
product: "foundry"
docsArea: "analytics"
locale: "en"
upstreamTitle: "Documentation | Analytics > Exporting outputs"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Exporting outputs

Foundry allows qualified users to export analytical outputs for use off-platform.

Supported exports include [PDF export](#pdf-export), [export of visualizations as images](#visualization-export), and [export as CSV or XLSX](#data-export).

## PDF export

Notepad supports downloading documents to PDF with the ability to customize content such as page orientation, headers and footers, and individual embed (charts, tables, etc.) appearance.

[Learn how to get started with Notepad.](/docs/foundry/notepad/getting-started/)

## Visualization export

You can export individual visualizations as images in Contour, Quiver, and Code Workbook.

In Contour and Quiver, look for the <img alt="Download icon" src="./media/download-button.png" width="30px"> button (**Download chart as image**) in the top right of any chart, as shown below.

![Screenshot of Contour download button](/docs/resources/foundry/analytics/export-contour-image.png)

In Code Workbook, choose **Download image** from the action menu of any visualization node as shown below.

<img alt="Screenshot of Code Workbook download image action item" src="./media/export-code-workbook-image.png" width="400px">

## Data export

You can export analytical results as CSV and/or XLSX in Contour, Quiver, and Code Workbook.

### Contour

There are two ways to export data from Contour, both of which have an export limit of 100,000 rows:

* Add an **Export** board to your analysis path.

![contour export board](/docs/resources/foundry/analytics/export-contour-board.png)

* Alternatively, you can select the relevant board in your analysis and open the table panel, then select your desired export option.

![contour export table](/docs/resources/foundry/analytics/export-contour-table.png)

### Quiver

To export data from a Quiver analysis, select **Download as CSV** from the action menu for any card.

![quiver export card](/docs/resources/foundry/analytics/export-quiver-card.png)

### Code Workbook

To export data from a Code Workbook, select **Download as CSV** from the action menu for transforms that are saved as datasets. The default export limit is 100,000 rows. Note that the results of unpersisted transforms cannot be downloaded as CSV. [Learn more about persisted and unpersisted transforms in Code Workbook.](/docs/foundry/code-workbook/optional-data-persistence/)

![code workbook export dataset](/docs/resources/foundry/analytics/export-code-workbook.png)
