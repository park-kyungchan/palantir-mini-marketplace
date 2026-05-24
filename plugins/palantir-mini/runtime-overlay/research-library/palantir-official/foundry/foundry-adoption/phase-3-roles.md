---
sourceUrl: "https://www.palantir.com/docs/foundry/foundry-adoption/phase-3-roles/"
canonicalUrl: "https://palantir.com/docs/foundry/foundry-adoption/phase-3-roles/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ff176a323b2d194c5633489ac278412ad7e26d0d03baf5772277f3c17c17112f"
product: "foundry"
docsArea: "foundry-adoption"
locale: "en"
upstreamTitle: "Documentation | Phase 3: Platform growth through autonomy > Roles and responsibilities"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Phase 3: Roles and responsibilities

The following are new roles and responsibilities for Phase 3 of the Foundry Program team, in addition to the roles established in [Phase 1](/docs/foundry/foundry-adoption/phase-1-roles/) and [Phase 2](/docs/foundry/foundry-adoption/phase-2-roles/).

## Center of Excellence

### Responsibilities

* The Center of Excellence (CoE) is a rotation rather than a dedicated team; we recommend implementing a group of personnel available from the central Program who are available to fill gaps in knowledge, skill sets, or resourcing bandwidth in Foundry initiatives.
* These resources embed deeply within the use cases in which they engage, though in most cases should not be a majority of the executional bandwidth on a given project.
* It is critical that there is ownership by someone who is a long-term participant of the domain in which the use case is contributing; CoE resources are meant to be temporary resources deployed to boost an initiative and cannot be held responsible for long-term ownership.

### Implementation examples

* Embedding a data scientist to develop and deploy a model for a team that is working on a given workflow.
* Embedding a pipeline expert to help construct an initial data pipeline or particularly difficult integration.
* Providing a project manager to establish sustainable operational processes and project governance systems alongside a use case owner who will maintain ownership or investment of a given use case.

### Roles

* Project managers
* Data engineers
* Front-end developers
* Data engineers / scientists

### Relevant Foundry applications and resources

Dependent on the individual's area of expertise and the requirements of the use case into which they are deployed.

## Agent Administrator

### Responsibilities

* Agent Administrators are responsible for the creation and configuration of Data Connection agents and for sharing them with relevant data source owners.
* As a team, Agent Administrators should own the centralized control of agent installation and configuration that creates enhanced security and control within the Foundry Program.
* Agent Administrators are often allocated to a specific organizations domain or geography, though the appropriate division of responsibilities will vary depending on organization structure and compliance requirements. We recommend ensuring that Agent Administrators are subject matter experts in the suite of data sources required for ingestion in their specific area.
* Agent Administrators should work closely with Palantir teams to identify issues upstream and build business and Foundry context ahead of taking more ownership.
* The Agent Administrators work closely with Data Owners who are the primary points of contact for individual source systems that are ingested for use in Foundry. Data Owners will work closely with Agent Administrators during the configuration of a new data connection, and Data Source Owners will assume responsibility for upstream issues according to agreed upon SLAs and terms.

### Profile and required skills

* Familiarity with agents / VMs / connecting systems
* Specific technical knowledge of the organization's data sources, IT infrastructure, and internal access processes
* Data engineering skills (SQL, Python, PySpark/Spark)

### Relevant Foundry applications and resources

* [Data Connection](/docs/foundry/data-connection/overview/)
* [Pipeline Builder](/docs/foundry/pipeline-builder/overview/)
* [Data Health](/docs/foundry/health-checks/overview/)
* [Code Workbook](/docs/foundry/code-workbook/overview/)
* [Data Lineage](/docs/foundry/data-lineage/overview/)
* [Foundry Architecture](/docs/foundry/platform-overview/architecture/)
* [Foundry Interoperability](/docs/foundry/platform-overview/interoperability/)
* [Foundry Data Integration](/docs/foundry/data-integration/overview/)

## Head of Platform

### Responsibilities

* The Head of Platform is primarily responsible for data security and permission administration, along with Foundry governance, compliance, performance, and compute/storage cost allocation.
* The Head of Platform should be a leader within the broader organization's IT space who can build out IT infrastructure for the Foundry Program and appropriately integrate it with holistic IT structures and processes.
* Build out data security structures, including documentation and trainings on best practices and compliance protocols. This role will work closely with the Permissions Manager to drive requirements and a long-term vision around permission administration and data access controls within Foundry.
* Over time, work with internal IT teams as well as the Permissions Manager, Head of Data Governance, and IT teams tangential to the Foundry Program to scope and implement the required organizational customization on Foundry to suit business needs. This will include building integration points with existing organization technology to streamline data flows, customizing resource profiles on the platform, and monitoring and managing cluster costs of Foundry.
* Create comprehensive success metrics and a roadmap for the Platform team, in support of the Foundry Program strategy and growth roadmap. Drive reporting and monitoring on Platform KPIs and work with the Head of Program to socialize successes and regular reporting.

### Profile and required skills

* Experience in leading IT and platform teams
* Experience building and maintaining relationships with the broader IT organization
* Written and verbal communication skills
* Experience partnering with senior leadership as a workstream owner
* Knowledge of data security and permission administration best practices, in alignment with organizational and broader regulatory policies
* Strong organizational and project management skills

### Relevant Foundry applications and resources

* [Control Panel](/docs/foundry/administration/control-panel/)
* [Checkpoints](/docs/foundry/checkpoints/overview/)
* [Enrollment permissions](/docs/foundry/administration/enrollments-and-organizations-permissions/)
* [Approvals](/docs/foundry/approvals/overview/) application
* Use Case-specific applications targeting end users
* [Foundry Architecture](/docs/foundry/platform-overview/architecture/)
* [Foundry Interoperability](/docs/foundry/platform-overview/interoperability/)
* [Foundry Data Integration](/docs/foundry/data-integration/overview/)
* [Foundry Platform Security](/docs/foundry/security/overview/)
* [Foundry Data Protection and Governance](/docs/foundry/security/data-protection-and-governance/)

## IT Services Owner

### Responsibilities

* The IT Services Owner is responsible for Platform Architecture and cross-platform software integration, which includes how Foundry connects to others systems and how Foundry is positioned in the enterprise's IT ecosystem.
* Alongside the Head of Technology, the IT Services Owner should create and manage custom configurations to ensure they are in line with company expectations or protocols. These may include Spark profiles, YARN configurations, and changes to Foundry applications.
* Work with the Head of Platform to establish IT policies and systems in accordance with Program strategies and goals.
* Collaborate with other teams within the Program to determine their IT needs.
* Monitor, review, and enforce any upgrade or configuration changes across the platform, and communicate any changes required across workstreams.
* Work with the Head of Platform to establish cost monitoring and reporting to ensure Foundry costs are transparent and managed.

### Profile and required skills

* Strong individual contributor with an IT background
* Sound understanding of Foundry architecture
* Experience in monitoring and controlling budgets for IT services
* Cross-functional collaboration skills
* Ability to build strong relationships with organization IT teams external to the Foundry Program

### Relevant Foundry applications and resources

* [Control Panel](/docs/foundry/administration/control-panel/)
* [Checkpoints](/docs/foundry/checkpoints/overview/)
* [Data Lineage](/docs/foundry/data-lineage/overview/)
* [Data Connection](/docs/foundry/data-connection/overview/)
* Foundry Issues
* [Foundry Architecture](/docs/foundry/platform-overview/architecture/)
* [Foundry Interoperability](/docs/foundry/platform-overview/interoperability/)

## Permissions Manager

### Responsibilities

* Permissions Managers run the overall organization of groups within Foundry that dictates how Foundry access is provisioned to different types of users. This may entail integration with identity manager systems specific to the organization, or SAML integration.
* Regular collaboration with the Head of Data Governance is required; this role should act as the execution layer at the junction of Platform implementation and Data Governance protocols, processes, and controls.
* Permissions Managers should be subject matter experts on Data Governance requirements and familiar with the implementation-level requirements and data structures to best execute permissions across projects and workflows.
* Own the overall organization of groups within Foundry, which dictate how Foundry access is provisioned to different types of users.
* As the platform matures and use cases and the user base continues to expand, own the implementation of Restricted Views and permissions in close collaboration with the Technical Compliance Manager.

### Profile and required skills

* Ability to communicate between technical and non-technical stakeholders
* Familiarity with organization-wide data access permissions, regulations, and authentication systems (Okta and Active Directory, for example)
* Programming skills (SQL, Python, PySpark/Spark)
* Knowledge of data governance best practices
* Strong technical communicator
* Knowledge of systems architecture

### Relevant Foundry applications and resources

* [Restricted View policy management](/docs/foundry/platform-security-management/manage-restricted-views/#restricted-view-policy-management)
* [Permissions](/docs/foundry/administration/enrollments-and-organizations-permissions/)
* [Markings](/docs/foundry/security/markings/)
* [Data Connection](/docs/foundry/data-connection/overview/)
* [Code Workbook](/docs/foundry/code-workbook/overview/)
* [Data Health](/docs/foundry/health-checks/overview/)
* [Ontology Manager](/docs/foundry/ontology-manager/overview/)
* [Control Panel](/docs/foundry/administration/control-panel/)
* [Enrollment permissions](/docs/foundry/administration/enrollments-and-organizations-permissions/)
* [Foundry Architecture](/docs/foundry/platform-overview/architecture/)
* [Foundry Interoperability](/docs/foundry/platform-overview/interoperability/)
* [Foundry Data Integration](/docs/foundry/data-integration/overview/)
* [Foundry Platform Security](/docs/foundry/security/overview/)
* [Foundry Data Protection & Governance](/docs/foundry/security/data-protection-and-governance/)

## Technical Compliance Manager

### Responsibilities

* The Technical Compliance Manager is responsible for approving projects before development begins. This role is responsible for providing information about the platform to those who request new projects. Approvals should take into account the source data that needs to be leveraged, the purpose of the project, and the breakdown of users who require access to the data and configure permissions.
* The Technical Compliance Manager role should be aligned with organization data protection policies, as well as broader regulatory regime in which the platform and specific project operate.
* Additionally, this role ensures the implementation of Restricted Views and defines the standard structure per project type.
* The Technical Compliance Manager will work closely with the Permissions Manager; at scale, this role may exist in an organization-level domain.

### Profile and required skills

* Familiarity with organization-wide data access permissions, regulations, and authentication systems (Okta and Active Directory, for example)
* Strong understanding of Foundry permissions architecture
* Background in implementation and/or policy making in data compliance, data regulation, and data privacy
* Knowledge of programming practices (SQL, Python, PySpark/Spark)
* Knowledge of data governance best practices and data protection policies and regulations
* Strong technical communicator
* Knowledge of systems architecture

### Relevant Foundry applications and resources

* Project Access Request & Approval flows
* Use case-specific applications
* [Foundry Architecture](/docs/foundry/platform-overview/architecture/)
* [Foundry Interoperability](/docs/foundry/platform-overview/interoperability/)
* [Foundry Data Integration](/docs/foundry/data-integration/overview/)

## Support Services

### Responsibilities

* Support Services are the support teams that handle Foundry questions and user-submitted issues regarding projects for which IT is directly responsible, as well as for general Foundry support and user development support.
* The structure of this team benefits from flexibility; decisions can be made for what support should be developed internally (within the organization's teams), what should be provided by Palantir, and standard operating procedures to manage the end-to-end resolution of user support issues across both the customer and Palantir.
* The ultimate goal of this team is to build autonomy; internal teams are enabled by an internal support team that deeply understands the organization's business, structures, workflows, and Foundry architecture. The ultimate goal of Support Services teams is to enable the organization's Foundry usage to scale beyond the use case teams' bandwidth and support capacities, and to build speed by reducing reliance on Palantir support services.
* The Support Services team requires technical personnel who have a deep understanding of Spark and recognize programming antipatterns.

### Profile and required skills

* Understanding of both business workflows and technical structures and concepts within Foundry
* Curiosity and strong investigative skills
* Experience in building and using reporting and monitoring systems for support services
* Strong written communication skills; should be tasked with contributing to documentation to support workflows and with communicating to development teams or to Palantir support teams when issues require escalation

### Relevant Foundry applications and resources

* Foundry Issues
* Use Case-specific applications
* Project-specific documentation
