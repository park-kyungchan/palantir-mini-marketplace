---
sourceUrl: "https://www.palantir.com/docs/apollo/core/environments/"
canonicalUrl: "https://palantir.com/docs/apollo/core/environments/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "636f1e4dbc1416aea26571c684905872b0eab5189ec1adec7e26e63abca5b629"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Environments"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
![environments overview](/docs/resources/apollo/core/header_environments.png)

# Environments

An Environment in Apollo is a grouping of [Entities](/docs/apollo/core/entities/) deployed into the same infrastructure, such as a software platform composed of microservices running in a single Kubernetes cluster. Agents report the current state of Entities back to the Hub, and execute [Plans](/docs/apollo/core/plans-and-constraints/) for Entities. Environments are disjoint from each other, such that each Entity belongs to a single Environment.

Hubs are Environments that manage other Environments; such Environments are said to be Spoke Environments of that Hub. Hub Environments usually manage themselves, but this is not a strict requirement. A Hub Environment could be managed by a different Hub, leading to a hierarchy of Hubs and Spokes.

Environments do not need to be managed by a Hub at all times. Such Environments are said to be *disconnected* during those periods where they are not being actively managed by a Hub. This can happen, for example, for Environments running on vehicles. They might be connected to a Hub for upgrades when stationary, but then become disconnected for a while when on the move.

## Environment settings

An Apollo Hub can manage multiple Spoke Environments. The Apollo Hub stores settings for each Spoke Environment, which includes the list of Entities that should exist in that Environment, which Release Channels they are subscribed to, and other Entity or Environment-specific information (e.g. information about maintenance windows).

## Environment Config

An Environment has its own top-level configuration called Environment Config, which can be used to store additional arbitrary configuration for the Environment. [Environment Config](/docs/apollo/managing-environments/environment-config/) can be used to describe settings that apply to the entire Environment and can be referenced by configuration for individual Entities in that Environment.

[Learn more about managing Environments.](/docs/apollo/managing-environments/overview/)
