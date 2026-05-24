---
sourceUrl: "https://www.palantir.com/docs/apollo/recalling-releases/overview/"
canonicalUrl: "https://palantir.com/docs/apollo/recalling-releases/overview/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3627533d397188c9bfc858844e3441918a4636738888f327a7e188ba0d6e0e91"
product: "apollo"
docsArea: "recalling-releases"
locale: "en"
upstreamTitle: "Documentation | Recalling Releases > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Overview

**Recalls** are how you communicate to Apollo that there is a problem with one or more Releases. You can use recalls to move Entities off bad Releases and prevent Apollo from upgrading Modules or Entities to these Releases.

Releases can be recalled [manually](/docs/apollo/recalling-releases/recall-release/) or automatically due to [instability measured in promotion pipelines](/docs/apollo/managing-products/tracking-product-releases/#recalled-status) or using an API by an external service such as container vulnerability scanning.

After one or more Releases are recalled, Apollo will automatically remediate the issue by blocking the Release(s) from further roll-out and prioritize deploying other non-recalled Releases to affected Entities according to the recall's [**roll-off strategy**](/docs/apollo/recalling-releases/roll-off-strategies/).

Apollo can also be configured to upgrade Entities directly to a CVE-recalled Release when doing so improves their security posture. See [Upgrade Entities to CVE-recalled Releases](/docs/apollo/managing-vulnerabilities/cve-recalled-releases-upgrades/).

You can view the list of recalls and their roll-off status along with completed and reverted recalls in the **Recalls** tab of a Product or Module overview.

![The Recalls tab of a Product overview.](/docs/resources/apollo/recalling-releases/recalls-tab.png)

You can view the recalls that affect a specific Release by navigating to the **Releases** tab and hovering over the **Status** column for the Release.

![The recall status of a Release is highlighted.](/docs/resources/apollo/recalling-releases/recalled-status-column.png)

A banner is displayed on a Release's home page when it is affected by an active recall. Selecting **Details** will open details about each active recall such as the recall range, who issued the recall, and why the recall was issued.

You can also view the recalls for a specific Release by selecting that Release from the table and then selecting **Details** from the banner on the Release's home page.

![The banner that displays recalls on a Release home page is expanded.](/docs/resources/apollo/recalling-releases/release-recall-details.png)

We recommend recalling a Release as soon as an issue is discovered to prevent the issue from being deployed to more Environments. Once an investigation into the issue is completed, you can [edit](/docs/apollo/recalling-releases/recall-release/#edit-a-recall) or [revert](/docs/apollo/recalling-releases/recall-release/#revert-a-recall) the recall.
