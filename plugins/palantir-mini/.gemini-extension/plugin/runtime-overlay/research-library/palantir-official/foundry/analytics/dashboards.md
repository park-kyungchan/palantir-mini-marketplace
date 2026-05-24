---
sourceUrl: "https://www.palantir.com/docs/foundry/analytics/dashboards/"
canonicalUrl: "https://palantir.com/docs/foundry/analytics/dashboards/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0465dce9872a2abfbe70b73722bb5f22a6b2a7dfc6fe4e142ccc50a99fe51542"
product: "foundry"
docsArea: "analytics"
locale: "en"
upstreamTitle: "Documentation | Analytical results > Dashboards"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Dashboards

There are two primary ways to build interactive dashboards from Foundry analyses: [Contour dashboards](#contour-dashboards) and [Quiver dashboards](#quiver-dashboards). In some circumstances, you may want to use a [Code Workspaces dashboard](#code-workspaces-applications), [Notepad](#notepad), or a [custom application](#custom-applications) instead. This page discusses which tools you can use and when you might use them.

[Learn more about the differences between Contour and Quiver.](/docs/foundry/analytics/types-of-analysis/#point-and-click-analysis)

## Contour dashboards

Contour dashboards are used to present content from a Contour analysis, such as analysis results and findings. These dashboards support chart-to-chart filtering, inline parameter references, a fullscreen presentation view, and PDF exports.

[Learn more about Contour and Contour dashboards.](/docs/foundry/contour/overview/)

![contour dashboards](/docs/resources/foundry/analytics/dashboards-contour.png)

*This screenshot uses open source data from the [NYC Taxi & Limousine Commission ↗](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page).*

## Quiver dashboards

Quiver dashboards are used to present content from a Quiver analysis in a read-only, interactive dashboard.

Quiver dashboards can be used as standalone dashboards or embedded in [Object Views](/docs/foundry/object-views/overview/), [Workshop applications](/docs/foundry/workshop/overview/), or [Notepad documents](/docs/foundry/notepad/overview/). Quiver dashboards can also be displayed in [Carbon](/docs/foundry/carbon/overview/) and delivered directly to operational users.

[Learn more about Quiver and Quiver dashboards.](/docs/foundry/quiver/overview/)

![quiver dashboard](/docs/resources/foundry/analytics/dashboards-quiver-dashboard.png)

## Code Workspaces applications

Code Workspaces currently supports [Dash ↗](https://plotly.com/dash/) and [Streamlit ↗](https://streamlit.io/) for Python applications and [Shiny® ↗](https://shiny.rstudio.com/) for R applications. Users can create application workflows directly in Code Workspaces with Foundry’s version control, branching, and data governance features built-in.

[Learn more about Code Workspaces and Code Workspace applications.](/docs/foundry/code-workspaces/overview/)

![Dash application in Code Workspaces](/docs/resources/foundry/analytics/code-workspaces-dashboard.png)

## Other presentation tools

### Notepad

Contour dashboards and Quiver templates are best suited for direct consumption within Foundry, as their interactive design allows users to work with live data using parameters and chart selections. In contrast, [Notepad](/docs/foundry/notepad/overview/) is designed for reporting workflows that focus on creating static content that may be exported. In addition, a Notepad document can include content coming from multiple applications (including Contour boards and Quiver cards), while Contour dashboards and Quiver templates only support content from their respective applications. Due to the focus on static content, users cannot conduct analysis or create charts in Notepad directly.

[Learn more about reporting workflows.](/docs/foundry/analytics/reporting/)

### Custom applications

Contour dashboards and Quiver templates are optimized for easily presenting an interactive view of analytical results, while application building tools (such as Workshop) may be a better fit for some use cases. Specifically, if your use case requires full customization and layout flexibility, multi-step workflows, or writeback, you should consider Foundry's [application building tools](/docs/foundry/app-building/overview/).

Quiver dashboards can be embedded in Workshop applications to make more complex analytical content available to operational users.

[Learn more about embedding Quiver dashboards in Workshop.](/docs/foundry/quiver/dashboards-workshop/)
