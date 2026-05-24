---
sourceUrl: "https://www.palantir.com/docs/foundry/upgrade-assistant/impacted-resources/"
canonicalUrl: "https://palantir.com/docs/foundry/upgrade-assistant/impacted-resources/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "54be36a6b00381a837a999959da1654662cc78cbffaf5e098524c803a53e88bf"
product: "foundry"
docsArea: "upgrade-assistant"
locale: "en"
upstreamTitle: "Documentation | Upgrade Assistant > Identify impacted resources"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Identifying impacted resources

Before announcing a [platform change](/docs/foundry/upgrade-assistant/platform-changes/), Palantir writes telemetry that identifies any potentially impacted resource.
For example, before announcing the platform's deprecation of Python 2 in favor of Python 3, Palantir identified all repositories still using Python 2 and made the list of repositories available in Upgrade Assistant.

![img](/docs/resources/foundry/upgrade-assistant/impacted-resources.png)

Most of the telemetry powering Upgrade Assistant is implemented as a background task, so it is not updated in real time.
Taking the Python 2 deprecation as an example: if you upgraded one of the repositories to Python 3 in preparation for the Python 2 deprecation, you would need to wait up to 24 hours for the repository to show as compliant in Upgrade Assistant.

Additionally, because each platform change is different, there is no standard way to identify potentially-impacted resources. However, changes announced in Upgrade Assistant may contain details about the telemetry in their description.
