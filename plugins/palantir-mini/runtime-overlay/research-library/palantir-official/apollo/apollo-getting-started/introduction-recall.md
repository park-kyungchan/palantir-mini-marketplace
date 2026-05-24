---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-recall/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/introduction-recall/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2d82a16313faa697c953c7aae72a1cd0953575faa2a15bcdb40d510017255213"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Recall a Release"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Recall a Product Release

You can [recall one or more Product Releases](/docs/apollo/recalling-releases/overview/) manually if you discover a bug or automatically if a critical issue is discovered. When you issue a recall, Apollo will not install the affected Release(s) in your Environments. Apollo will also move all subscribed Environments off the affected Release(s) according to your defined recall strategy.

Assume that there is a performance degradation in the Product Release you created in the previous task, either your own Helm chart or `Nginx 13.1.5`. We do not want any Environments installing this Release anymore, and we want to issue instructions for how to move Environments off this Release.

In this task you will issue a recall that tells Apollo that there is an issue with this Release and you will specify how Environments should be rolled off the Release.

1. From the Product page (your Helm chart or Nginx), select the version number of the Release that you published.

2. Select **Recall releases...** from the **Actions** dropdown.

   * **Select releases to recall**: Choose your Helm chart Release or `13.1.5` for Nginx
   * **Description**: “Performance degradation”

   The default roll-off strategy is to roll forward to a newer Release, so no additional changes are needed.

3. Select **Issue recall** when you are finished.

After you issue the recall:

* It appears in the list alongside others in the Product’s **Recalls** tab.
* You can view `Recalled` value in the `Status` column in the Product’s **Releases** tab.
* The recalled version number appears in red in the Environment page’s **Entities** tab.

![Release recalls via the Apollo UI](/docs/resources/apollo/apollo-getting-started/intro_recall.png)

**Next → [Create a Release promotion pipeline](/docs/apollo/apollo-getting-started/introduction-promotion/)**
