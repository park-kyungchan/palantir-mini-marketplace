---
sourceUrl: "https://www.palantir.com/docs/foundry/use-case-examples/optimizing-production-with-erp-data-across-the-supply-chain/"
canonicalUrl: "https://palantir.com/docs/foundry/use-case-examples/optimizing-production-with-erp-data-across-the-supply-chain/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dff699cf91066b75219c7af2282f4c585b7e8caa842763c29705206982623f63"
product: "foundry"
docsArea: "use-case-examples"
locale: "en"
upstreamTitle: "Documentation | Consumer products > Optimize production with ERP data across the supply chain"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Optimizing production with ERP data across the supply chain

> Industry Sector: **Consumer Products**
>
> Business Function: **Supply Chain**

A Fortune 100 consumer goods company deployed Palantir platforms to quickly respond to COVID-related disruptions. It has since expanded usage across the business to improve its supply chain.

Within days, Palantir software harmonized at least seven legacy ERP systems into a unified environment. Using an out-of-the-box application, teams immediately began to optimize cost of goods sold (COGS) and production, resulting in tens of millions of dollars in estimated annual savings.

Now, Palantir platforms are connecting the entire value chain — from procurement to distribution.

## Challenge

While profitability is a metric commonly reported at an aggregate company level, our customer was seeking the ability to compute it with more granularity to optimize COGS, improve output, and better inform daily operations. The data needed to achieve this goal, however, resided in at least seven ERP systems. ERP systems store data natively, making the data inaccessible to most decision makers.

Preparation and analysis required a costly manual process that took weeks to complete. A growing backlog of simple data requests meant that IT had to postpone work on the most valuable projects. The enterprise needed a solution to unlock its significant investment in ERP systems, gain visibility across functions, and answer questions such as:

* How can we take advantage of pricing changes to raw materials and reduce COGS through spot buy opportunities?
* How can we avoid miscalculations of raw materials to reduce waste?
* How can we optimize production through greater visibility into the cost and profitability of our various product formulations?

## Solution

The customer used Foundry to integrate 7+ ERP data sources to produce a “digital twin” of the value chain, from the hand of the supplier to the hand of the customer.

Instead of querying complex ERP databases, supply chain managers, plant managers, and demand planners can now interact in a no-code way with a real world object model, examining plants, SKUs, customers, and other core business concepts.

This integrated foundation has enabled analysts to build a granular COGS and profitability model that applies on the SKU level. New workflows incorporating these models help teams:

* Optimize COGS. Within one week, an out-of-the-box Bill of Material workflow allowed users to begin optimizing raw materials purchases for the first time. Purchasing teams assess spot-buy opportunities and calculate how cheaper materials could be used within the value chain, accounting for formulation constraints, existing inventory, and forecasted demand.
* Optimize Production. Using the granular profitability model, supply chain managers evaluate how new product formulations compare to existing ones and develop strategies to maximize production.

![Optimizing Production with ERP Data Across the Supply Chain](/docs/resources/foundry/use-case-examples/diagram-optimizing-production-with-erp-data-across-the-supply-chain.jpg)

### Users and stakeholders

* Supply Chain Managers
* Plant Managers
* Demand Planners
* Data Analysts

## Impact

* Estimated up to $100M in annual savings based on 1-2% improvement in production.
* Seven ERP sources integrated into a digital twin and supply chain workflow within 5 days.
* Optimizing raw material purchases could generate tens of millions of dollars in annual savings and could take minutes, instead of weeks. There are estimated hundreds of similar opportunities.

## How it's made

* Foundry's ERP Suite was used to connect to SAP and an out-of-the-box Bill of Material applied in order to generate the digital twin in Foundry's ontology.
* [Vertex](/docs/foundry/vertex/overview/), [Object Explorer](/docs/foundry/object-views/overview/), [Contour](/docs/foundry/contour/overview/), and other Foundry visualization and analysis tools were used to drive decision-making.

## Implement a similar use case

This use case implements the following Patterns. Follow the links below to read more about a particular Pattern and learn how it is implemented within Foundry.

* [Operational process coordination](/docs/foundry/use-case-patterns/operational-process-coordination/) (used for 8 other use cases)
* [Resource allocation & optimization](/docs/foundry/use-case-patterns/resource-allocation-optimization/) (used for 3 other use cases)

Want more information on this use case? Looking to implement something similar? [Get started with Palantir. ↗](https://www.palantir.com/contact/get-started/)
