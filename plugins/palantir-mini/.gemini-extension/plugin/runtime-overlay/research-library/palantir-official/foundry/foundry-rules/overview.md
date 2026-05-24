---
sourceUrl: "https://www.palantir.com/docs/foundry/foundry-rules/overview/"
canonicalUrl: "https://palantir.com/docs/foundry/foundry-rules/overview/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "898ee20cc1ee9d0691b6ab306cfc06f6b0842a80867efaafba3a2913e17b0884"
product: "foundry"
docsArea: "foundry-rules"
locale: "en"
upstreamTitle: "Documentation | Foundry Rules > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Foundry Rules

Foundry Rules (previously known as Taurus) enables users to actively manage complex business logic in Foundry with a point-and-click, low-code interface. With Foundry Rules, users can create rules and apply those rules to datasets, objects, and time series for a variety of use cases like alert generation or data categorization.

Foundry Rules comprises a set of components for creating, managing, and applying rules:

* A **rule** is a set of *conditions* that, taken together, can specify particular rows of data in a dataset.
* The **conditions** that form a rule apply to the columns of a dataset and can range from simple filters to complex aggregations, joins, or other operators.

![Screenshot of filter group with rules and conditions](/docs/resources/foundry/foundry-rules/filter_group.png)

The following pages describe several [core concepts](/docs/foundry/foundry-rules/core-concepts/) and provides instructions for how to [deploy](/docs/foundry/foundry-rules/deploy-foundry-rules/) and [customize](/docs/foundry/foundry-rules/customization/) Foundry Rules.

## Example use cases

Foundry Rules can simplify the process of managing use cases that involve complex sets of rules, such as:

* **Anti-Money Laundering (AML):** Flag suspicious transactions through rules targeting both per-transaction and aggregated metrics.
* **Equipment monitoring:** Raise alerts for potential equipment degradation based on sensor data (e.g. when certain measurements reach specific values).
* **Cohorting:** Categorize entities into groups or "cohorts" based on rules. For example, creating groups of customers with particular features for better targeted marketing.
