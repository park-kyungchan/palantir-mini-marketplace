---
sourceUrl: "https://www.palantir.com/docs/foundry/analytics/reusable-logic/"
canonicalUrl: "https://palantir.com/docs/foundry/analytics/reusable-logic/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1c6693b818aa0d520824e78609aa2fabd19eac0a8b2cb2654d153c2ce05a3d4c"
product: "foundry"
docsArea: "analytics"
locale: "en"
upstreamTitle: "Documentation | Analytics > Reusable logic"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Reusable logic

In analytical applications, you can choose to save pieces of logic for reuse by other users. This can be helpful to limit duplicative work, reduce time-to-value, and to allow users to leverage logic created by domain experts or more technical collaborators.

## Contour

In Contour, you can [save expressions](/docs/foundry/contour/expressions-overview/) to easily reuse logic across analyses and paths, as well as share logic with others. Saved expressions can be used to create or replace columns or to perform aggregates. [Learn more about Contour.](/docs/foundry/contour/overview/)

![Example screenshot of Contour saved expressions](/docs/resources/foundry/analytics/contour-saved-expression.png)

## Quiver

A [visual function](/docs/foundry/quiver/visual-functions-overview/) in Quiver consists of one or more Quiver cards that load, combine, and transform data. Visual functions automatically apply a set of logical steps to data inputs within a Quiver analysis, and can be used by others in their analyses. [Learn more about Quiver.](/docs/foundry/quiver/overview/)

![Example screenshot of Quiver visual functions](/docs/resources/foundry/analytics/quiver-visual-function.gif)

## Code Workbook

By abstracting code away behind a simple form-based interface, Code Workbook templates provide a lightweight way for highly technical users to collaborate with users who may be less comfortable writing code. Values selected by users are substituted into a template, which can then be run like any other transform in the workbook. Any transform that can be created with code, such as Matplotlib or Plotly visualizations, can be built with code templates. [Learn more about Code Workbook.](/docs/foundry/code-workbook/overview/)

![Example screenshot of Code Workbook templates](/docs/resources/foundry/analytics/code-workbook-templates.png)
