---
sourceUrl: "https://www.palantir.com/docs/foundry/use-case-life-cycle/"
canonicalUrl: "https://palantir.com/docs/foundry/use-case-life-cycle/"
sourceLastmod: "2026-05-12T17:06:26.160Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b747c5a22bb37b07e9be84209e66406fd3f733f3c5a781a93aca451df1748bb5"
product: "foundry"
docsArea: "use-case-life-cycle"
locale: "en"
upstreamTitle: "Documentation | Use case lifecycle > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use case lifecycle

A use case is a **time-bound** effort by a **dedicated team** to deliver **new capabilities** on the platform for a set of **users**.

A use case is not “integrate source system X” or “apply ML technique Y”. Instead, a **use case** focuses on the *capabilities* we need to provide to our users, rather than the implementation details along the way. Framing development work as a use case forces us to confront the value proposition of our project immediately. Whose work life will improve as a result of this new capability? And what can we measure to know if we’ve succeeded?

Along the way to building our use case, we’ll unlock many of the compounding features of Foundry, such as:

* **enriching data** through integration, data science techniques, and business logic;
* structuring a flexible, re-usable **data asset** as a digital twin of our organization and business processes;
* and creating **re-usable user interfaces** that close the operational loop by capturing decisions as data.

Holding our use case(s) and their outcomes as guides, we stay connected to real-world value, even as we get into the complexity of specific implementations throughout Foundry.

## Starting a use case

The craft of developing a use case on Foundry involves decomposing the **functional requirements** of the outcomes and choosing the implementation pattern(s) for each component.

The solution design process described below is an approach to this challenge. It focuses on distilling the use case requirements into a format that informs decisions about interface implementation and data enrichment. These decisions in turn inform the ontology design, which acts as the use case API and abstracts pipeline implementation details from the end user interactions.

In this way, the solution design framework encourages a holistic approach as depicted in the image below:

![data-model](/docs/resources/foundry/use-case-life-cycle/data-model.png)

Breaking the solution design into buckets around **transforming**, **structuring**, and **interacting** with use case data pivots the development process from purely user-centric requirements into platform-centric components. With this framework, we can then look at:

* Blueprints for commonly encountered patterns,
* Flags that indicate additional development complexity, and
* The default choice between available options and considerations for choosing alternatives.

We can also judge tradeoffs between development complexity and strict adherence to business requirements. Working through the solution design framework should make it possible to reevaluate priorities.

For example, suppose the original business requirement is to render a specific chart and include some specific form input, which may require odd ontology configurations and significant development effort in [**Slate**](/docs/foundry/slate/overview/). If instead we created these functionally-equivalent visualizations and Actions (meet the functional requirement), then we can use Workshop at 1/10th the investment in front-end development and keep a cleaner ontology data structure.

In the next section we’ll look at capturing a use case description and distilling these functional requirements.
