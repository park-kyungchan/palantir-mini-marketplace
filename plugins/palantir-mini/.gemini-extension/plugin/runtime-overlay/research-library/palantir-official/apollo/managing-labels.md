---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-labels/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-labels/"
sourceLastmod: "2026-05-12T17:06:26.161Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "847d68a76e5d91b7513b3fe09e4e60c8fac097eda066f2760d433c90148f1aa0"
product: "apollo"
docsArea: "managing-labels"
locale: "en"
upstreamTitle: "Documentation | Managing Labels > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Overview

You can use **labels** to tag resources in Apollo with important details, such as the type of infrastructure of an Environment, the component of an Entity in your application, or to denote that a Product Release has been scanned.

Labels are defined as key-value pairs and have the following components:

* **Label ID:** A unique identifier for the label. The label ID has an optional prefix and a label name, which are separated by the `/` character. For example, `com.palantir.apollo/label-name` and `label-name` are both valid label IDs.
* **Label value:** This field contains information that corresponds to the label ID. For example, a label ID `infra` can have the value `aws`, `azure`, and more.

Apollo supports labels for the following resource types:

* [Entities](/docs/apollo/managing-labels/entity-labels/)
* [Environments](/docs/apollo/managing-labels/environment-labels/)
* [Product Releases](/docs/apollo/managing-labels/product-release-labels/)
* [Teams](/docs/apollo/managing-labels/team-labels/)

This section will walk through the workflows related to labels and how to leverage these workflows to get the most out of Apollo.
