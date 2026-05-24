---
sourceUrl: "https://www.palantir.com/docs/foundry/use-case-examples/improving-decision-making-through-holistic-power-grid-network-modelling/"
canonicalUrl: "https://palantir.com/docs/foundry/use-case-examples/improving-decision-making-through-holistic-power-grid-network-modelling/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "81861a46fb4171cb37617ab3e4d3c1fd4c18f75a8976b096347dfc49ed948a75"
product: "foundry"
docsArea: "use-case-examples"
locale: "en"
upstreamTitle: "Documentation | Utilities > Improve decision-making through holistic power grid network modeling"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Improving decision-making through holistic power grid network modeling

> Industry Sector: **Utilities**
>
> Business Function: **Operations**

At a European utility company, Foundry was used to create a rich data asset, which drives other use cases downstream, including:

* Outage response and root cause analysis
* Reporting on Assets and KPIs at different granularities
* Outage review and validation for regulatory reporting

## Challenge

A utility's asset management team is responsible for maintaining grid stability and reducing outage time. This has important regulatory requirements (for example, Germany requires utilities to have a System Average Interruption Duration Index (SAIDI) score of less than 12 minutes per customer) as well as being crucial for their ability to renew their concession contracts to provide power.

Given siloed geographical asset and grid systems, this utility lacked a comprehensive, updated picture of grid state, protracting outage response, and root cause analysis.

## Solution

The company’s various datasources tracking the state of their grid and geographic information were integrated into an ontology in Foundry, which in turn is used in a wide variety of operational workflows to better manage their assets.

![Improving Decision Making Through Holistic Power Grid Network Modelling](/docs/resources/foundry/use-case-examples/diagram-improving-decision-making-through-holistic-power-grid-network-modelling.jpg)

### Stakeholders and user groups

* Asset Management
* Asset Management Data Team
* Individual business functions for different parts of the Grid
* Data source owners

## Impact

* The Grid Digital Twin was implemented from tens of thousands of coordinates, electrical grid, cables, circuits, and relationships. Foundry’s data integration capabilities and interoperability mean that, in addition to unlocking the new asset management workflows, Foundry’s integration with their PSI control system drives rich data back into existing operational systems.
* This version of the ontology took approximately 12 months to be implemented, but has been subsequently converted to a library and can be deployed in weeks.

## How it’s made

Power grid asset data from PSI control systems and geographic (GIS) data were first unified via transforms to make sure they matched and writeback was enabled for both. Using this unified data asset, the objects were created in [Object Explorer](/docs/foundry/object-views/overview/).

The network topology serves as the foundation of several use cases, such as the outage localization app (implemented in Slate), which provided a new method of determining the most likely location of the cause of an outage (e.g., where a tree fell on some cables).

The Network Grid Topology is modeled as [Ontology](/docs/foundry/ontology/overview/) objects and views representing the different network elements. Visualizations are done using [Object Explorer](/docs/foundry/object-views/overview/) Maps, [Quiver](/docs/foundry/quiver/overview/) Charts, and other common [Object Explorer](/docs/foundry/object-views/overview/) widgets.

Want more information on this use case? Looking to implement something similar? [Get started with Palantir. ↗](https://www.palantir.com/contact/get-started/)
