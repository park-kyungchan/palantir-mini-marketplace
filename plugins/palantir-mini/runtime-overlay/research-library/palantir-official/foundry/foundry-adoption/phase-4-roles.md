---
sourceUrl: "https://www.palantir.com/docs/foundry/foundry-adoption/phase-4-roles/"
canonicalUrl: "https://palantir.com/docs/foundry/foundry-adoption/phase-4-roles/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "a686e2c257f042f05ce938ccaef978459a74b7acbfa9bcc783dc778316d1f22d"
product: "foundry"
docsArea: "foundry-adoption"
locale: "en"
upstreamTitle: "Documentation | Phase 4: Hypergrowth > Roles and responsibilities"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Phase 4: Roles and responsibilities

The following are new roles and responsibilities for Phase 4 of the Foundry Program team, in addition to the roles established in [Phase 1](/docs/foundry/foundry-adoption/phase-1-roles/), [Phase 2](/docs/foundry/foundry-adoption/phase-2-roles/), and [Phase 3](/docs/foundry/foundry-adoption/phase-3-roles/).

## Production Engineer

### Responsibilities

* Own production pipelines; manage the release process to ensure that production pipelines adhere to the organization's standards and execute reliably.
* Collaborate closely with SMEs to address any requested changes to the Ontology and intake feedback on pipeline performance and usability in production workflows.
* Own the approval process of Pull Requests (PRs) into the master branch of the production pipeline, and manage approvals to run pipeline builds on the master branch.
* Work with Pipeline and Data Source Developers to define health checks across key datasets and implement continuous monitoring of the health checks across releases.
* The Production Engineer fundamentally owns the monitoring of the healthy execution of the production pipeline. This includes monitoring of data refresh on different sources, execution of pipeline builds, and assisting to triage support requests when applicable.

### Profile and required skills

* Data engineering skills (SQL, Python, PySpark/Spark)
* Knowledge of data cleaning and quality best practices
* Knowledge of version control best practices
* Familiarity with agents / VMs / connecting systems

### Relevant Foundry applications and resources

* [Data Connection](/docs/foundry/data-connection/overview/)
* [Pipeline Builder](/docs/foundry/pipeline-builder/overview/)
* [Data Health](/docs/foundry/health-checks/overview/)
* [Code Workbook](/docs/foundry/code-workbook/overview/)
* [Data Lineage](/docs/foundry/data-lineage/overview/)
* [Foundry Data Integration](/docs/foundry/data-integration/overview/)

## Pipeline Developer

### Responsibilities

* Build a common ontological layer that provides data assets for use by all use cases.
* Define this common ontological layer and build the transformations required to take data from the source structure to the ontology structure.
* Work closely alongside Production Engineers and Ontology Managers to implement the ontological layer that is designed by Ontology Managers and is leveraged in the data provided to use case teams.

### Profile and required skills

* Data engineering skills (SQL, Python, PySpark/Spark)
* Knowledge of data cleaning and quality best practices
* Knowledge of version control best practices
* Familiarity with agents / VMs / connecting systems

### Relevant Foundry applications and resources

* [Data Connection](/docs/foundry/data-connection/overview/)
* [Pipeline Builder](/docs/foundry/pipeline-builder/overview/)
* [Data Health](/docs/foundry/health-checks/overview/)
* [Code Workbook](/docs/foundry/code-workbook/overview/)
* [Data Lineage](/docs/foundry/data-lineage/overview/)
* [Ontology Manager](/docs/foundry/ontology-manager/overview/)
* [Object Explorer](/docs/foundry/object-explorer/overview/)
* [Foundry Data Integration](/docs/foundry/data-integration/overview/)

## Object View Developer

### Responsibilities

* Object View Developers develop object views based on the Ontology.
* Intake requests from platform management, use case teams, and even business owners and end users for new features within object views, as well as new object views for new objects within the Ontology. Work closely with these teams to understand business requirements and ensure maximum utility for the object views.
* Collaborate heavily with Ontology Managers to identify what objects and object views are expected to be built, and what backing datasets are required to create them.
* Work with Production Engineers and Pipeline Developers to create processes for information sharing and bilateral awareness of development initiatives.
* Build out prototypical views in Contour for eventual promotion to the production object view.
* Build a process for how to make changes to ontology objects and object views to enable scaling to multiple developers and to provide visibility into object view development requirements, constraints, and best practices.

### Profile and required skills

* Data engineering skills (SQL, Python, PySpark/Spark)
* Knowledge of version control best practices
* Database knowledge
* Business domain knowledge
* Project management and change management skills
* Proven ability to write comprehensive technical documentation
* Ability to communicate between technical and non-technical stakeholders

### Relevant Foundry applications and resources

* [Ontology Manager](/docs/foundry/ontology-manager/overview/)
* [Object Explorer](/docs/foundry/object-explorer/overview/)
* [Data Connection](/docs/foundry/data-connection/overview/)
* [Control Panel](/docs/foundry/administration/control-panel/)
* [Foundry Ontology Overview](/docs/foundry/ontology/overview/)
