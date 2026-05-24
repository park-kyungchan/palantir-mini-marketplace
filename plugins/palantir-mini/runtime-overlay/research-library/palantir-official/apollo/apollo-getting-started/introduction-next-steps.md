---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-next-steps/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/introduction-next-steps/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ec67417aafcba0f1ea5e4a977fa27ff7ae840fe2ded9cfa29bb219d3c639ade9"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Next steps"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Next steps

Congratulations on completing the Apollo introduction guide. You now have one or more Environments connected to the Apollo Hub with the Apollo Spoke Control Plane installed alongside multiple Releases of various open source Helm charts. You have created one or more promotion pipelines for your open source products and subscribed your Environments to receive Releases at various points in that pipeline. Finally, you have added Product and Environment maintenance windows as a constraint on Apollo’s autonomous deployment orchestration. Now what?

Below are some advanced Apollo workflows:

* [Connect your scanning solution](/docs/apollo/managing-vulnerabilities/vulnerability-scanning/) to periodically run scans of your containers and execute recall strategies if vulnerabilities are found.
* Connect your monitoring/telemetry solution so you can review its messages directly in Apollo.
* Add sophistication to your Release pipeline through custom [labels](/docs/apollo/managing-labels/product-release-labels/) that reference scans, telemetry, or other external services as conditions for Release promotion.
* Integrate with your identity provider and to improve login and group assignment processes.
