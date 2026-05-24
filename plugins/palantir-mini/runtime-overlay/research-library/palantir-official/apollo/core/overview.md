---
sourceUrl: "https://www.palantir.com/docs/apollo/core/overview/"
canonicalUrl: "https://palantir.com/docs/apollo/core/overview/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "afe4379b2cff1c68b8bf6b11e5d1adcb6258d970ce943f3229f0216c7b9532fa"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Apollo > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Overview

This page provides a high-level description of Apollo's functionality and the components that enable Apollo to accelerate the software deployment and management process.

## Apollo architecture diagram

Below is an architecture diagram illustrating the major elements of the Apollo platform.

<img alt="Platform architecture diagram for Apollo." src="./media/apollo_architecture.png" width=750>

## Technical overview

There are two types of [Environments](/docs/apollo/core/environments/) in the Apollo platform: **Hubs** and **Spokes**.

* Hub Environments receive information and telemetry about Spoke Environments and issue [**Plans**](/docs/apollo/core/plans-and-constraints/) to make changes. Hubs can manage multiple **Spoke** Environments, and can also be set up to self-manage.
* Spoke Environments each run a [**Spoke Control Plane**](/docs/apollo/core/spoke-control-plane/) which reports information and telemetry back to the managing Hub and executes Plans issued by the Hub.

### Hubs

Each Hub contains an **Orchestration Engine** which coordinates the system. The Orchestration Engine issues Plans to [agents](/docs/apollo/core/agents/) running in each Spoke Environment managed by the Hub. The particular Plan proposed by the Orchestration Engine depends on several key factors.

First, the Orchestration Engine must know the possible [Product Releases available in the **Product Catalog**](/docs/apollo/core/products-releases-versions/). The Product catalog also contains other useful information about Releases, including which [**Release Channel**](/docs/apollo/core/release-channels/) a Release belongs to, whether the Release is recalled due to a bug, dependencies on other Products, and supported database schemas. Releases are added to a specific Release Channel either automatically by a [Release promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/) or manually by a [Release Channel Contributor](/docs/apollo/core/authorization/).

Second, the Orchestration Engine consumes the settings for the Environment and any Apollo-managed software or infrastructure in the Environment, comprised of the installed Products, Release Channel subscriptions, and other constraints and settings defined by Environment editors. Changes to Environment settings go through the **Change Management system** and require appropriate approval.

Together, the information consumed from the Product catalog and Environment settings form the rules by which the Orchestration Engine operates. There is no single target state for an Environment or Apollo-managed software or infrastructure; rather than targeting a specific version, for example, Apollo-managed software might be defined with a product and a Release Channel.

The current state of the specific Environment flowing from **Central Observability** provides the last piece of input. The Orchestration Engine can only propose changes that do not violate any of the constraints.

### Spokes

**Agents** are part of the [Spoke Control Plane](/docs/apollo/core/spoke-control-plane/) and are tasked with reporting the observed state back to the Hub (**Reported State**, **Probes**, **Telemetry & Logs**). Agents also poll the Hub for Plans issued by the Orchestration Engine and execute them while reporting the status of the Plan.
