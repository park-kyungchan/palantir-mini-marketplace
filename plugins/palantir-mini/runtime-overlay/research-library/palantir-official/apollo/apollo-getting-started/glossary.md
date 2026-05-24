---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/glossary/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/glossary/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5336f6cce6af2a103606bfa79a2a4f9241c6b5eb42eebb3d28195db24af1f1c1"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Glossary"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Glossary

This glossary is intended help you become familiar with the key Apollo concepts.

## Apollo Agent

Agents deployed in [Spoke Environments](#spoke-environment) that are responsible for executing [Plans](#plan) issued by the [Hub](#hub) and reporting Plans and Entity state back to the Hub.

Learn more about [Apollo Agents](/docs/apollo/core/agents/).

## Artifact Registry

An external OCI-compliant container registry that can be integrated with Apollo to allow management and deployment of software directly from the registry. Instead of publishing containers to Apollo's internal registry, [Product Releases](#product-release) can reference artifacts from connected Artifact Registries. Apollo's [vulnerability scanning](#vulnerability) also scans images from connected Artifact Registries.

Learn more about [managing Artifact Registries](/docs/apollo/managing-artifact-registries/overview/).

## Change Request

A formal request for changes to [Environments](#environment) or [Entities](#entity) that requires appropriate approval before being applied. Most manual operator actions that affect managed Environments flow through change requests.

Learn more about [change requests](/docs/apollo/managing-changes/change-requests/).

## Config override

YAML-formatted overrides that modify the Product's default settings for a specific [Entity](#entity).

Learn more about [defining config overrides](/docs/apollo/managing-entities/set-config-overrides/).

## Constraint

Conditions that [Plans](#plan) must satisfy before they can be executed by an [agent](#apollo-agent). Apollo evaluates constraints to ensure that agents only execute Plans when it is safe and acceptable to do so.

Learn more about [constraints](/docs/apollo/core/plans-and-constraints/#constraints).

## Command

A way to override the constraints imposed by Apollo and/or the Apollo Plan priority queue to execute a [Plan](#plan) as soon as possible. This can be useful during emergency situations like stability incidents.

Learn more about [how to issue a command](/docs/apollo/managing-entities/user-issued-commands/).

## Entity

An instance of a specific [Product](#product) in an [Environment](#environment). Apollo supports Helm charts and Assets as [Product types](/docs/apollo/apollo-product-specification/product-types/).

Learn more about [Entities](/docs/apollo/core/entities/).

## Environment settings

Defining which [Entities](#entity) should be installed and managed in an [Environment](#environment), which [Release Channels](#release-channel) they are subscribed to, and other Entity or Environment-specific information.

### Managed Entity

An Entity that has [Reported State](#reported-state) and is declared in the [Environment Settings](#environment-settings). Apollo will issue [Plans](#plan) for managed Entities.

### Unmanaged Entity

An Entity that has [Reported State](#reported-state), but not declared in the [Environment Settings](#environment-settings). This Entity will show up in Apollo, but Apollo will not issue [Plans](#plan) for it.

Learn more about [Environment settings](/docs/apollo/core/entities/#entity-settings).

## Environment

A grouping of [Entities](#entity) deployed into the same infrastructure, such as a software platform composed of microservices running in a single Kubernetes cluster.

Learn more about [Environments](/docs/apollo/core/environments/).

## Environment Config

A YAML configuration files that contains Environment-level properties that need to be propagated to many [Entities](#entity) in the [Environment](#environment).

Learn more about [updating the Environment Config](/docs/apollo/managing-environments/environment-config/).

## Hub

An Environment that manages one or more [Spoke Environments](#spoke-environment). An Apollo Hub can manage itself or be managed by another Hub.

Learn more about the [Hub and Spoke architecture](/docs/apollo/core/overview/).

## Ignored dependency

A way to override [Product dependencies constraints](#product-dependency) for an [Entity](#entity).

Learn more about [how to define ignored dependencies](/docs/apollo/managing-environments/environment-settings/#ignored-dependencies).

## Label

A tag for resources in Apollo, such as the type of infrastructure of an Environment, the component of an Entity in your application, or to denote that a Product Release has been scanned. Labels can be used as pure metadata, enable label-based filtering, define [label requirements for Release promotion](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion), or for custom automation.

Learn more about [how to create and apply labels](/docs/apollo/managing-labels/overview/).

## Maintenance window

Time ranges during which Apollo is permitted to make changes such as upgrades, Release Channel promotion, and config changes to [Entities](#entity) on an Environment. A maintenance window declares the time zone of the window and a list of time ranges during which maintenance may occur.

There are two types of maintenance windows:

* No-downtime: A window for changes that can be done without any visible downtime for end users.
* Downtime: A window that allows for changes where all the nodes on an Entity may go offline.

Learn more about [Environment maintenance windows](/docs/apollo/managing-environments/environment-settings/#maintenance-and-suppression-windows), [Product maintenance windows](/docs/apollo/managing-products/product-maintenance-window/), and [Entity resolved maintenance windows](/docs/apollo/core/plans-and-constraints/#how-apollo-calculates-an-entitys-resolved-maintenance-window).

## Module

A collection of [Products](#product) that are frequently installed together in [Environments](#environment), along with their respective configurations and settings.

Learn more about [Modules](/docs/apollo/core/modules/).

## Operational responsibility

A setting that determines if the contact team of the Entities in an Environment is the Environment or the Product contact team.

## Optional dependency

A [Product dependency](#product-dependency) that is not required by default but can be made required in specific [Environments](#environment).

Learn more about [how to configure optional dependencies](/docs/apollo/apollo-product-specification/product-dependencies/#optional-dependencies).

## Orchestration Engine

Services running in each [Hub](#hub) that determine which [Plans](#plan) to issue to the [Spoke Environment](#spoke-control-plane) from all possible Plans, after ensuring all constraints are satisfied. The Orchestration Engine is also responsible for the [Release promotion](#release-promotion) process for [Product Releases](#product-release).

Learn more about [how the Orchestration Engine decides which Plan to issue](/docs/apollo/core/plans-and-constraints/#general-guidelines-for-how-the-orchestration-engine-decides-which-plan-to-issue).

## Plan

Instructions from the [Hub](#hub) to [agents](#apollo-agent) in [Spoke Environments](#spoke-environment) for making a change, such as changing the configuration for an Entity or the Environment, setting a secret, and upgrading and downgrading Entities.

Learn more about [Plans](/docs/apollo/core/plans-and-constraints/#plans).

## Product

A unit of software functionality, comprised of versioned [Product Releases](#product-release) which are deployed by Apollo. Each Product has its own settings, including promotion pipeline and maintenance windows, as well as an owning team and associated metadata.

Learn more about [Products](/docs/apollo/core/products-releases-versions/#products).

## Product catalog

An inventory of all Products that have been published to an Apollo Hub. The catalog contains details for every [Product Release](#product-release), including existing [dependencies](#product-dependency), [recall](#recall) information, and the [Release Channels](#release-channel) to which it belongs.

Learn more about the [Product catalog](/docs/apollo/core/products-releases-versions/#product-catalog).

## Product dependency

Ranges of [Product Releases](#product-release) from a different Product a specific Release depends on.

Learn more about [how to define Product dependencies](/docs/apollo/managing-products/publishing-helm-charts/#setting-dependencies-across-product-releases).

## Product Release

A specific version of a [Product](#product), also known as a "Release." Releases have associated metadata, including a manifest, the [Release Channels](#release-channel) they belong to, and their recall status. Releases are promoted between Release Channels and deployed to [Environments](#environment).

Learn more about [Product Releases](/docs/apollo/core/products-releases-versions/#product-releases).

## Product Release manifest

A YAML file embedded within each [Product Release](#product-release) that provides metadata and constraints about it. This enables Apollo to install the Product Release in an [Environment](#environment).

Learn more about the [format of the Product Release manifest](/docs/apollo/apollo-product-specification/manifest/).

## Promotion criteria

The requirements that a [Product Release](#product-release) must satisfy before it can be promoted to a [Release Channel](#release-channel).

Learn more about [how to define promotion criteria](/docs/apollo/managing-release-channels/configure-promotion-pipeline/).

## Recall

A way to tell Apollo that there is a problem with one or more [Product Releases](#product-release). Apollo will not install recalled Releases in any [Environments](#environment), and will move affected [Entities](#entity) to a different Release according to your defined roll-off strategy.

Learn more about [recalling Releases](/docs/apollo/recalling-releases/overview/).

## Release Channel

Groupings of [Product Releases](#product-release) based on common attributes such as stability and labels. Environments follow a Release Channel to receive Release upgrades. A Product Release can be present in multiple Release Channels and these Release Channels have no explicit hierarchy.

Learn more about [Release Channels](/docs/apollo/core/release-channels/).

## Release promotion

Adding a [Release](#product-release) to a [Release Channel](#release-channel), either manually or automatically though a [Release promotion pipeline](#release-promotion-pipeline).

Learn more about [Release promotion](/docs/apollo/core/release-channels/#release-channel-promotion).

## Release promotion pipeline

A sequence of [Release Channels](#release-channel) that a [Release](#product-release) will be [promoted](#release-promotion) through once the [promotion criteria](#promotion-criteria) is met.

Learn more about how to set up a [Release promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/).

## Reported State

The information that [agents](#apollo-agent) running in a given [Environment](#environment) report to their [Spoke Control Plane](#spoke-control-plane) about all the [Entities](#entity) they are responsible for.

Learn more about [Reported State](/docs/apollo/core/entities/#reported-state).

## Spoke Control Plane

The Apollo services running in a [Spoke Environment](#spoke-environment).

Learn more about the [services in the Spoke Control Plane](/docs/apollo/core/spoke-control-plane/).

## Spoke Environment

An Environment that is managed by a [Hub](#hub). The Hub evaluates state and issues Plans for changes to the Spoke Environment. An [agent](#apollo-agent) executes these changes and reports state back to the Hub.

Learn more about the [Hub and Spoke architecture](/docs/apollo/core/overview/).

## Suppression window

Time range that prevents Apollo from issuing Plans. This time range supersedes [maintenance windows](#maintenance-window). Suppression windows can be set for either an [Entity](#entity) or an [Environment](#environment).

Learn more about how to create [suppression windows](/docs/apollo/managing-environments/suppression-windows-and-cancelling-plans/).

## Team

The primary unit of organization for people who operate software using Apollo. Teams are fundamental to permissions, alert routing, [change request](#change-request) approval, and other workflows. A Team must be defined by at least one admin group and one member group.

Learn more about [Teams](/docs/apollo/core/teams/).

## Vulnerability

A security flaw or weakness detected in [Product Releases](#product-release) through Apollo's automated scanning. Vulnerabilities are evaluated using risk scores and may result in automatic [recalls](#recall) unless [suppressed](#vulnerability-suppression).

Learn more about [managing vulnerabilities](/docs/apollo/managing-vulnerabilities/overview/).

## Vulnerability Suppression

A mechanism to prevent Apollo from recalling [Product Releases](#product-release) with known [vulnerabilities](#vulnerability). Two types exist: human-requested suppressions (created manually in Apollo) and grace period suppressions (automatic time periods before a CVE must be addressed).

Learn more about [vulnerability suppressions](/docs/apollo/managing-vulnerabilities/vulnerability-suppressions/).
