---
sourceUrl: "https://www.palantir.com/docs/apollo/core/how-apollo-works/"
canonicalUrl: "https://palantir.com/docs/apollo/core/how-apollo-works/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6dd1e06aa66c2bc3f3676078939a30cc586907db970eb2c4ac2a8ba9c2195c1f"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Apollo > How Apollo works"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# How Apollo works

:::callout{theme="neutral"}
We recommend reading about the core concepts of Apollo before proceeding with this documentation.
:::

This documentation explains how changes in Spoke Environments flow through the system in the form of [Plans](/docs/apollo/core/plans-and-constraints/#plans). The documentation covers:

* Release Channel promotion, Environment settings, Reported State, and constraints.
* How the Orchestration Engine considers the factors listed above to decide what Plans to issue for a given Spoke and how agents execute those Plans.

## Environment settings

The Apollo Hub uses Environment settings information to manage Environments and Entities. Refer to the relevant documentation to read more about [Environment settings](/docs/apollo/core/environments/#environment-settings) and [Managed Entity settings](/docs/apollo/core/entities/#entity-settings).

For more information about viewing or editing the Environment settings, see [Managing Environments](/docs/apollo/managing-environments/environment-settings/) and [Managing Entities](/docs/apollo/managing-entities/overview/).

## Reported State

Agents running in managed Spokes gather information about all Managed Entities including running deployed version, current configuration, liveness and readiness and other metadata and send it back to the Apollo Hub. This information is called the Reported State for an Entity. For more information, see [Entity Reported State](/docs/apollo/core/entities/#reported-state).

## Constraints

Constraints are preconditions which Plans must satisfy before they can be executed by an Agent. Apollo evaluates constraints to ensure that Plans only run when it is safe and acceptable to do so. See [Constraints](/docs/apollo/core/plans-and-constraints/#constraints) for more information.

## Orchestration Engine

The Orchestration Engine is responsible for the [release promotion](/docs/apollo/core/release-channels/#release-channel-promotion) process for Product Releases and also issues [Plans](/docs/apollo/core/plans-and-constraints/#plans) for agents running in Spoke Environments.

### Release Channel promotion

To decide when a release should be promoted between Release Channels, the Orchestration Engine continuously evaluates whether a release already passed or failed the health promotion criteria using the information coming from the Reported State.

If the evaluation is successful, the release will be added to the next Release Channel configured in the [release channel promotion pipeline](/docs/apollo/core/release-channels/#release-promotion-pipeline-configuration).

In cases where the evaluation fails the criteria, the Orchestration Engine will automatically recall the release to ensure all Environments are rolled off that version.

### Making changes to Spoke Environments

The Orchestration Engine evaluates what Plans to issue for agents running in the Control Plane in Spoke Environments as described in the [Plan Lifecycle](/docs/apollo/core/plans-and-constraints/#plan-lifecycle).

Note that Apollo does not have a specific target state for Environments or Entities. Instead, Apollo proposes Plans which satisfy the configured constraints for Environments or Entities. As an example, an Entity is defined with a Product and a Release Channel but not a specific version.

## Executing change

Agents running in the Spoke's Control Plane continuously poll the Orchestration Engine for new Plans. Once a Plan passes all the relevant Constraints, the Orchestration Engine will issue the Plan for the relevant agent in the Environment to execute.

Once the agent has executed the Plan, the agent will report back whether the Plan was successful or not. If the Plan failed and the state of the Environment differs from the state prior to the start of the Plan, the Orchestration Engine will issue a rollback Plan to restore the state prior to the start of the Plan.
