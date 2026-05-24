---
sourceUrl: "https://www.palantir.com/docs/foundry/use-case-patterns/operational-process-coordination/"
canonicalUrl: "https://palantir.com/docs/foundry/use-case-patterns/operational-process-coordination/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "97d666070b0beb072f0a54976b28cbe9dbaa2c7fc6bf2a872b58105dc45d5cc8"
product: "foundry"
docsArea: "use-case-patterns"
locale: "en"
upstreamTitle: "Documentation | Use case patterns > Operational process coordination"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Operational process coordination

Operational processes at any organization, whether it’s ensuring that [invoices are handled correctly](/docs/foundry/use-case-examples/improving-invoice-collection-through-intelligent-dispute-resolution/), [power shutoffs are managed to avoid wildfire risk](/docs/foundry/use-case-examples/public-safety-power-shutoff-psps-scoping/), or R\&D data is managed and leveraged efficiently and safely,  require users to interface with a variety of source systems, resolve any conflicts among them, interact with specialized applications, make operational decisions, and record those decisions to improve the process and feed others downstream.

Foundry’s [Data Connection](/docs/foundry/data-connection/overview/) and [Ontology](/docs/foundry/ontology/overview/) allow organizations to implement this pattern in days instead of months and continue to implement, customize, and maintain them safely and efficiently.

![Operational Process Coordination Pattern](/docs/resources/foundry/use-case-patterns/image-operational_process_coordination_pattern.jpg)

## Solution

Consider any critical business process, whether it’s ensuring that [invoices are handled correctly](/docs/foundry/use-case-examples/improving-invoice-collection-through-intelligent-dispute-resolution/), [power shutoffs are managed to avoid wildfire risk](/docs/foundry/use-case-examples/public-safety-power-shutoff-psps-scoping/), or R\&D data is managed and leveraged efficiently and safely. These disparate processes all share the same pattern: they require many different users and types of users to interact with a variety of source systems and other users in order to make operational decisions that are critical for the organization. Moreover, these processes evolve over time and the tools used need to evolve with them while remaining secure and maintainable.

Yet, in practice, these processes are often implemented as custom software that’s purpose-built to interact with a particular set of datasources, difficult to manage or update, siloed from other such software, and follows its own security model. Alternatively, the process is managed via spreadsheets and emails, which have technical limitations, are error-prone and insecure, and are difficult to manage and collaborate on.

In Foundry, organizations instead implement the pattern below to integrate all of the relevant data sources into an ontology, from which [Workshop](/docs/foundry/workshop/overview/) apps are used to build custom apps which write back to the ontology and external systems. All of this is governed safely using Foundry’s Platform Security Model (often across multiple organizations such as vendors), and can be easily maintained and improved on via Foundry’s version control systems.

## Key elements

***Action Inbox***

An **Action Inbox** in [Workshop](/docs/foundry/workshop/overview/) which allows **different users** to be **assigned tasks**, **view and explore** the key aspects of the ontology, and **take actions to make real-world decisions**.

For example, in a process for doing [Invoice Dispute Resolution](/docs/foundry/use-case-examples/improving-invoice-collection-through-intelligent-dispute-resolution/), invoices are assigned to users in the correct department, where they review the customer service actions that are taken, see potential causes of injury, and submit a clear explanation for the invoice, which is shared back with the customer downstream of the application.

Related products:

* [Workshop](/docs/foundry/workshop/overview/)
* [Actions](/docs/foundry/action-types/overview/)
* [Functions on Objects](/docs/foundry/functions/overview/)

***Operational Process [Ontology](/docs/foundry/ontology/overview/)***

Underlying the Action Inbox is an **[Ontology](/docs/foundry/ontology/overview/)**, which models the operational process as **objects** with **properties** and **relations. For example:**

* Tasks have assignees, creation and assignment times, priorities, and statuses
* Workflows contain tasks and model sequential steps in a process

Users are available in [Workshop](/docs/foundry/workshop/overview/) automatically and don’t need to be modeled in the ontology, but can be if it’s helpful to associate them with additional properties such as department or location.

Related products:

* [Ontology](/docs/foundry/ontology/overview/)
* [Object Explorer](/docs/foundry/object-views/overview/)

***Subject Matter [Ontology](/docs/foundry/ontology/overview/)***

In addition to the functional ontology for the Action Inbox, there’s a **digital twin** of the subject matter, which serves as the **single source of truth** that users reference to make their decisions. The **objects**, **properties**, and **relations** will differ depending on the use case, but are typically shared across many use cases and are visualized within [Object Explorer](/docs/foundry/object-views/overview/) views (object-centric), [Quiver](/docs/foundry/quiver/overview/) (charting and dashboarding), or [Vertex](/docs/foundry/vertex/overview/) (network analysis).

For example, for Public Safety Power Shutoff (PSPS) Scoping, objects would include assets like transformers and circuits, weather threshold breaches, and grid configurations.

Related products:

* [Ontology](/docs/foundry/ontology/overview/)
* [Object Explorer](/docs/foundry/object-views/overview/)

***Decision writeback***

Actions taken in the Action Inbox trigger **writeback** to the process ontology (e.g. creating, updating, or reassigning tasks), but more importantly to the subject matter ontology, where it updates the digital twin and then writes back to **external sources**.

For example, for Public Safety Power Shutoff (PSPS) Scoping, decisions made in the inbox mark customers (objects in Foundry) as unsuccessfully contacted to be recontacted later as well as push notifications to the external automated message broadcast system.

Related products:

* [Ontology](/docs/foundry/ontology/overview/)

***Business logic and automation***

Logic that drives the Action Inbox is often implemented in pipelines, e.g. determining which actions to map to which users or prioritizing which actions to implement first. These often leverage models created and managed in [Foundry Machine Learning](/docs/foundry/model-integration/overview/).

For example, [Invoice Dispute Resolution](/docs/foundry/use-case-examples/improving-invoice-collection-through-intelligent-dispute-resolution/) uses upstream logic to determine which department is best suited to handle a given inquiry.

Related products:

* [Code Repositories](/docs/foundry/code-repositories/overview/)
* [Code Workbook](/docs/foundry/code-workbook/overview/)

## Requirements

Regardless of the Pattern used, the underlying data foundation is constructed from pipelines and syncs to external source systems.

***Data integration pipelines***

Data integration pipelines, written in a variety of languages including SQL, Python, and Java, are used to integrate datasources into the subject matter ontology.

***[Data Connectors](/docs/foundry/data-connection/overview/)***

Foundry can sync data from a wide array of sources, including FTP, JDBC, REST API, and S3. Syncing data from a variety of sources and compiling the most complete source of truth possible is key to enabling the highest value decisions.

***(Optional) SAP and Salesforce Connector***

Many organizational processes rely on SAP and Salesforce data, and Foundry has out-of-the-box connectors and integration pipelines for both sources that ingest and create ontologies in just a few clicks. [Invoice Dispute Resolution](/docs/foundry/use-case-examples/improving-invoice-collection-through-intelligent-dispute-resolution/), for example, uses both of these sources.

## Use cases implementing this pattern

* [Driving revenue through integrated pricing](/docs/foundry/use-case-examples/driving-revenue-through-integrated-pricing/)
* [Improving customer satisfaction and retention through intelligent task management](/docs/foundry/use-case-examples/improving-customer-satisfaction-and-retention-through-intelligent-task-management/)
* [Improving invoice collection through intelligent dispute resolution](/docs/foundry/use-case-examples/improving-invoice-collection-through-intelligent-dispute-resolution/)
* [Increasing client engagement through integrated campaign management](/docs/foundry/use-case-examples/increasing-client-engagement-through-integrated-campaign-management/)
* [Optimizing production with ERP data across the supply chain](/docs/foundry/use-case-examples/optimizing-production-with-erp-data-across-the-supply-chain/)
* [Public safety power shutoff (PSPS) scoping ](/docs/foundry/use-case-examples/public-safety-power-shutoff-psps-scoping/)
* [Reduce rail disruptions through intelligent maintenance prioritization](/docs/foundry/use-case-examples/reduce-rail-disruptions-through-intelligent-maintenance-prioritization/)
* [Reducing over- and under-payments to health care providers](/docs/foundry/use-case-examples/reducing-over-and-under-payments-to-health-care-providers/)

Want more information on this use case pattern? Looking to implement something similar? [Get started with Palantir. ↗](https://www.palantir.com/contact/get-started/)
