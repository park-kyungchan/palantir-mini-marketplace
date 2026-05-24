---
sourceUrl: "https://www.palantir.com/docs/foundry/reports/parameters-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/reports/parameters-overview/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c23b5f3b31c2c18a08ee1a2e1f83dab47ab99a40c4b938c5ff0f860a90243581"
product: "foundry"
docsArea: "reports"
locale: "en"
upstreamTitle: "Documentation | Parameters > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Parameters

A **parameter** allows report viewers to easily switch what category of the data they’re seeing. For example:

* If you’re writing a report showing **monthly sales** data, you might create a **Month** parameter so your report viewers can view data for January, February, or March. Charts using the Month parameter will update whenever the user selects a different month.

![Mohthly sales parameters](/docs/resources/foundry/reports/monthly-sales-parameters.png)

* If you’re writing a report with charts relevant to a specific **geographic region**, you might want a **Region** parameter so report viewers can see how the charts differ when looking at North America, Europe, or Asia.

### Types of parameters

There are several different types of parameters:

* **Numbers**
* **Strings**, such as “North America”, “Europe”, “Asia”.
* **Dates**. For a report showing sales data over time, you might create Start Date and End Date parameters, so report viewers can decide what date range to view information about. You can also set a relative date to give the parameter a value relative to when someone is viewing the report. Note that the first day of a week refers to the Sunday of that week.

![Relative date parameter](/docs/resources/foundry/reports/relative-date-parameter.png)
