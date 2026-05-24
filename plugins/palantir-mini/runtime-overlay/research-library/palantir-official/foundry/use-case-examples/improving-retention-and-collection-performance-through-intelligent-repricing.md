---
sourceUrl: "https://www.palantir.com/docs/foundry/use-case-examples/improving-retention-and-collection-performance-through-intelligent-repricing/"
canonicalUrl: "https://palantir.com/docs/foundry/use-case-examples/improving-retention-and-collection-performance-through-intelligent-repricing/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c7e17587c158a793d634d7defc114c97ce97badcbff844572816721e5237bb2d"
product: "foundry"
docsArea: "use-case-examples"
locale: "en"
upstreamTitle: "Documentation | Financial services > Improve retention and collection performance through intelligent repricing"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Improving retention and collection performance through intelligent repricing

> Industry Sector: **Financial Services**
>
> Business Function: **Operations**

A payments processor wanted to increase revenue from small and medium merchants by optimizing collections, repricing less sensitive merchants, and retaining high-value customers at risk of churn. With a fragmented data landscape of tremendous scale, they could not run the analyses necessary to act on these ideas.

## Challenge

At the scale that this processor operates, there were two primary challenges:

* No effective way to prioritize or rank merchants for collections
* Limited ability to determine the best rates and fees for a merchant

## Solution

* Complete view of merchant activity — The company developed an unprecedented understanding of their customer base with a large volume of integrated data on customer activity, pricing, payment terminals, billing, fraud, and credit history.

* Improved collections — Analysts develop statistical models to rate accounts by how likely they are to pay. High-likelihood accounts are routed to internal collections teams, while low-likelihood accounts are referred to third-party collectors.

* New pricing strategies — Analysts perform high-scale analysis to assess the impact of different fee structures on customer retention. Sales teams use these insights to better price new accounts and reprice existing accounts to prevent churn.

![Improving Retention and Collection Performance Through Intelligent Repricing](/docs/resources/foundry/use-case-examples/diagram-improving-retention-and-collection-performance-through-intelligent-repricing.jpg)

### Stakeholders and user groups

* Merchant Collections Team
* Financial Analysts
* Data Scientists
* Sales Teams

A financial analyst uses Foundry to go through a re-pricing exercise for merchants to ensure retention but also maximize revenue.

## Impact

* Improved collection performance by filtering uncollectible accounts to 3rd parties and prioritizing highly collectible, high-value accounts. This generated millions of additional collections dollars per year projected due to the improved prioritization.
* The repricing model facilitated repricing exercises for merchants which increased retention and generated additional millions above targeted revenue.

## How it’s made

* Integrated the Customer Relationship Management (CRM) system and other datasources to create a single Foundry [Ontology](/docs/foundry/ontology/overview/) to understand Merchant activity. Objects and relations were created for customers, their activity, pricing, payment terminals, billing, fraud, credit history, and more.
* [Contour](/docs/foundry/contour/overview/) and other Foundry analysis tools used to perform analyses to determine new collections and pricing approaches. Scenario analysis of different pricing options is straight forward in [Contour](/docs/foundry/contour/overview/) and [Code Workbook](/docs/foundry/code-workbook/overview/). [Vertex](/docs/foundry/vertex/overview/) and Foundry Scenarios could be applied to further enable this process.
* Machine Learning models for prioritizing collections and determining repricing were implemented in [Code Repositories](/docs/foundry/code-repositories/overview/). [Foundry ML](/docs/foundry/model-integration/overview/) could have been considered here as well.
* The repricing application was implemented in [Slate](/docs/foundry/slate/overview/).

## Implement a similar use case

This use case implements the following Pattern. Follow the link below to read more about a particular Pattern and learn how it is implemented within Foundry.

* [Investigation and cohorting](/docs/foundry/use-case-patterns/investigation-and-cohorting/) (used for 3 other use cases)

Want more information on this use case? Looking to implement something similar? [Get started with Palantir. ↗](https://www.palantir.com/contact/get-started/)
