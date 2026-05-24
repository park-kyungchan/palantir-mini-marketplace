---
sourceUrl: "https://www.palantir.com/docs/foundry/use-case-examples/improving-production-yield-through-standardized-kpi-reporting/"
canonicalUrl: "https://palantir.com/docs/foundry/use-case-examples/improving-production-yield-through-standardized-kpi-reporting/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "37ed2de46e9c555bdca72e7685876f59b6143d2cd400f28c561171adbbff5b47"
product: "foundry"
docsArea: "use-case-examples"
locale: "en"
upstreamTitle: "Documentation | Industrials > Improve production yield through standardized KPI reporting"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Improving production yield through standardized KPI reporting

> Industry Sector: **Industrials**
>
> Business Function: **Production**

Foundry enabled an automotive equipment manufacturer to produce more good parts with less raw materials, through a combination of improving productivity, efficiency, or plan comparison.

## Challenge

Previously, there was no standardized tracking of the Material Yield. KPIs weren't used by all manufacturing plants consistently and could only be done infrequently and on an ad-hoc basis due to data-scale limitations and bandwidth constraints. The process of reporting was tedious and required a lot of manual steps to handle data came from multiple different data sources.

## Solution

The goal is therefore to generalize best practices of best-in-class plants when it comes to KPI tracking and automate it to reflect daily improvements. First, a set of KPI’s are defined across all plants and standardized tooling is developed to reduce the requirements of each plant. Bringing the different KPIs into one consolidated dataset required an integration of multiple different sources. In order to get data on daily basis, while retaining granularity and thus accuracy, billions of rows of data needed to be ingested, a scale previously impossible to work with in legacy tools. The daily updates enable users to act faster and generate gains in a systematic way.

The plants' operational users connect on a weekly basis to the application and prioritize the different efforts that can be made to improve the Material Yield based on estimated potential savings. Users send "action items" to engineers and operational users who are then in charge of making gains through productivity and efficiency levers.

The Central Business Stakeholders track the efforts and gains generated and benchmark plants to incentivize them based on objective results.

![Improving Production Yield Through Standardized KPI Reporting](/docs/resources/foundry/use-case-examples/diagram-improving-production-yield-through-standardized-kpi-reporting.jpg)

## Implement a similar use case

This use case implements the following Pattern. Follow the link below to read more about a particular Pattern and learn how it is implemented within Foundry.

* [Investigation and cohorting](/docs/foundry/use-case-patterns/investigation-and-cohorting/) (used for 3 other use cases)

Want more information on this use case? Looking to implement something similar? [Get started with Palantir. ↗](https://www.palantir.com/contact/get-started/)
