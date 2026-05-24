---
sourceUrl: "https://www.palantir.com/docs/apollo/core/modules/"
canonicalUrl: "https://palantir.com/docs/apollo/core/modules/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0365d822d1f38b71e6ec7543e3a6c62495e7760bc3e52371d9afa2264448d95f"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Modules"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Modules

**Modules** are groupings of Products that are often installed together to Environments.

Modules allow you to install many Products to an Environment at once rather than install each Product individually. When you create a Module, you will specify configuration that will be applied to every installation of the Module.

Learn more about [managing Modules](/docs/apollo/managing-modules/overview/).

## Entities

The **Entities** in a Module are the Products and configuration that are included in the Module. When you install a Module, Apollo will install each Entity in the Environment.

Learn more about [defining Entities in a Module](/docs/apollo/managing-modules/create-module/#entities).

## Variables

**Variables** allow you to add flexibility to your Module. Instead of using pre-defined values in the Entity definition and Module configuration, you can use a variable. The value of the variables will be set at Module installation rather than Module creation.

You can use Module variables in every section of the Entity definition, including the [configuration overrides](/docs/apollo/managing-entities/set-config-overrides/).

Learn more about [defining Module variables](/docs/apollo/managing-modules/create-module/#variables).

## Composite Modules

Composite Modules allow you to create a Module from other existing Modules. This enables you to manage complex configurations by breaking them down into smaller, reusable components.

Learn more about [Composite Modules](/docs/apollo/managing-modules/composite-modules/).

## Module Releases

Each version of a Module is published as a Release (similar to [Product Releases](/docs/apollo/core/products-releases-versions/)) and are identified by [Maven coordinates](/docs/apollo/core/products-releases-versions/#maven-coordinates). Module Releases support [Release Channels](#release-channels) and [recalls](#recalls).

Learn more about [editing a Module](/docs/apollo/managing-modules/create-module/#edit-a-module).

## Release Channels

Module installations track [Release Channels](/docs/apollo/core/release-channels/), and Apollo will only propose updates to Releases that have been promoted to the installation's tracked channel. By default, installations follow the Environment's default Release Channel, but you can override this for individual installations.

## Recalls

[Recalling](/docs/apollo/recalling-releases/overview/) a Module Release prevents Apollo from proposing updates to that version and cancels any open change requests that would update installations to that version.

:::callout{theme="warning"}
Unlike with Product recalls, Apollo will not automatically move installations off a recalled Module Release.
:::
