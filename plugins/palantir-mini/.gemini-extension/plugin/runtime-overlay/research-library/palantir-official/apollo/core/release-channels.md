---
sourceUrl: "https://www.palantir.com/docs/apollo/core/release-channels/"
canonicalUrl: "https://palantir.com/docs/apollo/core/release-channels/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "97297f118733e8376fa4a13e54e0b374d49cb99f5db01c3a166f6611c641edb8"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Release Channels"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
![releases overview](/docs/resources/apollo/core/header_releases.png)

# Release Channels

## Overview

**Release Channels** group [Product Releases](/docs/apollo/core/products-releases-versions/) and [Module Releases](/docs/apollo/core/modules/#module-releases) based on common attributes such as their stability and their labels. Environment operators subscribe Entities in [Environments](/docs/apollo/core/environments/) to Release Channels. During its resolved maintenance window, Apollo will upgrade the Entity to the most recent Release on the Release Channel that passes all [constraints](/docs/apollo/core/plans-and-constraints/#constraints).

Apollo has a set of default Release Channels and additionally supports [custom Release Channels](/docs/apollo/managing-release-channels/create-custom-release-channel/).

## Release Channel promotion

A Release can be added to a Release Channel in one of three ways:

* A Release can be automatically added to a default Release Channel when it is published to Apollo.
* [Release Channel contributors](/docs/apollo/core/authorization/) can manually add Releases to Release Channels if the Release satisfies the [label requirements](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) for the Release Channel.
* Product and Module editors can configure Release promotion pipelines that will automatically add Releases to successive Release Channels during configured [maintenance windows](/docs/apollo/core/plans-and-constraints/#maintenance-window-constraint) if they meet necessary [label](/docs/apollo/managing-labels/product-release-labels/#label-requirements-for-release-promotion) and [health](/docs/apollo/managing-release-channels/configure-promotion-pipeline/#health-requirements-for-release-promotion) requirements. Note that *only* Product Release pipelines can be configured with health requirements for promotion.

### Default Release Channel promotion

There are three default Release Channels in Apollo that a Release can automatically be added to when published: `DEV`, `RELEASE_CANDIDATE`, and `RELEASE`. Releases are added based on the format of their version number, which determines the version type:

* Releases with version type `Release` are added to the `DEV`, `RELEASE_CANDIDATE` and `RELEASE` Release Channels.
* Releases with version type `Release Candidate` are added to the `DEV` and `RELEASE_CANDIDATE` Release Channels.
* Releases with versions of other types are added to the `DEV` Release Channel.

Learn more about [Product Release version types](/docs/apollo/apollo-product-specification/product-versions/).

### Manual Release Channel promotion

Release Channel contributors can manually add Releases to their Release Channel. This is useful when manual testing or validation is required before promoting a Release to Release Channels that are upstream in the promotion pipeline. Manual promotion can also be useful when responding to a support or stability incident in which you need to override the configured Release Channel promotion pipeline.

Learn more about the [manual promotion workflow](/docs/apollo/managing-release-channels/manual-promotion/).

### Release promotion pipeline configuration

Product and Module editors can configure Release promotion pipelines that define the promotion of Releases from one default or custom Release Channel to other Release Channels. They can set:

* The sequence of Release Channels that a Release must go through to reach the terminal Release Channel.
* The criteria that needs to be satisfied at each stage of the promotion pipeline.

Learn more about [how to configure a Release promotion pipeline](/docs/apollo/managing-release-channels/configure-promotion-pipeline/).

### Promotion timeouts

Apollo enforces several timeouts to prevent promotions from remaining in progress indefinitely.

* **Soak duration timeout:** During canary soaking, if twice the configured soak duration passes without the health conditions being met, the promotion is canceled. Weekend time is excluded from this calculation. For example, if the soak duration is 24 hours, the promotion times out after 48 hours of weekday time without healthy canaries. This timeout is disabled if the version being soaked is the latest Release on the source channel that has not been recalled, since there is no newer Release to promote.
* **Waiting for canaries timeout:** If canary Entities are unable to reach the version that is promoting, the promotion is canceled after seven days.
* **Overall promotion timeout:** If a promotion has been running for more than 30 calendar days, it is canceled. Unlike the other timeouts, this is a wall-clock timeout that does not exclude weekends. This can occur if a promotion is stuck waiting for label requirements or maintenance windows to be satisfied.
