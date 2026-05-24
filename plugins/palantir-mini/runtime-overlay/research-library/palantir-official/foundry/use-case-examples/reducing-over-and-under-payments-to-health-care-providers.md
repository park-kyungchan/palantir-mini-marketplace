---
sourceUrl: "https://www.palantir.com/docs/foundry/use-case-examples/reducing-over-and-under-payments-to-health-care-providers/"
canonicalUrl: "https://palantir.com/docs/foundry/use-case-examples/reducing-over-and-under-payments-to-health-care-providers/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8a3f1b839044f120aa4663d748908bc6c5d3ae4973b3b5e561f1133c99b7f07b"
product: "foundry"
docsArea: "use-case-examples"
locale: "en"
upstreamTitle: "Documentation | Health care > Reduce over- and under-payments to health care providers"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Reducing over- and under-payments to health care providers

> Industry Sector: **Health Care**
>
> Business Function: **Operations**

Managing provider data through contract amendments, state regulations, and health plan-specific requirements is a daunting task which, when mistakes are made, can lead to significant volumes of over- or under-paid health claims. Integrating all this data into Palantir Foundry allows for automatically identifying and surfacing corrections, and approving those corrections to be written back into production systems.

## Challenge

Managing provider data is difficult due to the number of data sources and complex business-specific rules that must be applied. Ensuring that all rules for contract amendments, state regulations, and health plan-specific requirements are accurately implemented is often done with lengthy manual intervention. The process can involve multiple teams communicating over email, sharing data in Excel, and requesting and making updates manually into production systems.

Provider data is managed differently across enterprises, but at its core, a given provider (TIN/NPI) is assigned a set of codes for a timespan based on their contract and state, which ultimately determines the payment rate for various services. The codes can change at anytime due to a contract amendment, state update, provider retirement, or other.

When mistakes are made, health claims can be over-paid, leading to profit losses and friction with providers if money is recouped, or health claims can be under-paid, also leading to friction with providers due to missed payments. In extreme cases, state government may get involved and implement sanctions.

Incorrectly paid claims is a significant issue for payers - even a 1% increase in payment accuracy can have an important impact on revenue, provider satisfaction, and overall service quality.

## Solution

Key data sources (contracts, state regulations, sanctions, etc) are integrated into Palantir Foundry, specific business rules are applied to the integrated data, and suggested corrections are surfaced into an operational application for user review.

Specifically, provider data analysts access an application showing a list of proposed updates, ranked from highest to lowest impact on claims volume or dollar value. Clicking on a proposed update will show the proposal, along with the underlying data used to inform the suggestion, enabling the analysts to make a decision on the update. Analysts can make three decisions directly in the application:

* **Approve an update:** directly applies (writes back) the update to the relevant production system(s)
* **Reject an update:** removes the update from the queue and registers the justification for rejection for future algorithm improvement.
* **Flag an update:** moves the update to a separate queue where a different team can validate the underlying data supporting the suggestion, or change it accordingly.

The proposal interface is supported by a dashboard showing performance metrics (number of updates approved/rejected, claims impacted, value of claims rework prevented, etc).

![Reducing Over- and Under-Payments to Health Care Providers](/docs/resources/foundry/use-case-examples/diagram-reducing-over-and-under-payments-to-health-care-providers.jpg)

### Users and stakeholders

* Users: Analysts who review provider data, which typically include Contracting analysts and Provider Data analysts
* POC / Stakeholder: VP or Director of Claims Operations, VP of Provider Data Management

## Impact

* Prevented tens of millions of claims from paying out incorrectly due to erroneous provider data (both over- and under-payments).
* Significantly reduced the time and labor required to identify and implement corrections to provider data.
* Increased provider satisfaction.

## How it's made

The tools used are primarily [Code Repositories](/docs/foundry/code-repositories/overview/), [Workshop](/docs/foundry/workshop/overview/), and [Quiver](/docs/foundry/quiver/overview/).

The crux of this workflow is a strong pipeline that surfaces suggested corrections to provider data setup. It is critical that the data pipeline take into account the specifics of each business rule. This workflow relies on the updates surfaced being accurate.

The updates are surfaced in an operational application where provider data analysts can review updates proposals, their supporting data, and make a decision on whether to accept/reject/flag it. A second applications shows a dashboard where users can review their performance and overall impact to the business.

## Implement a similar use case

This use case implements the following Patterns. Follow the links below to read more about a particular Pattern and learn how it is implemented within Foundry.

* [Alerting workflow](/docs/foundry/use-case-patterns/alerting-workflow/) (used for 7 other use cases)
* [Operational process coordination](/docs/foundry/use-case-patterns/operational-process-coordination/) (used for 8 other use cases)

Want more information on this use case? Looking to implement something similar? [Get started with Palantir. ↗](https://www.palantir.com/contact/get-started/)
