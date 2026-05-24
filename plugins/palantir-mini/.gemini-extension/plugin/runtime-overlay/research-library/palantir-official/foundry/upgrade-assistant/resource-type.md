---
sourceUrl: "https://www.palantir.com/docs/foundry/upgrade-assistant/resource-type/"
canonicalUrl: "https://palantir.com/docs/foundry/upgrade-assistant/resource-type/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d7a0a6799564b88046a65bfd98de63cecffecc40ae522c4155b9297729170069"
product: "foundry"
docsArea: "upgrade-assistant"
locale: "en"
upstreamTitle: "Documentation | Upgrade Assistant > Resource type"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Resource Types in Upgrade Assistant

## Compass resources

Compass resources can be datasets, code repositories, data connection sources and agents, or any other resource usually accessible through Compass. These resources are displayed in a hierarchical view, first displaying the [space](/docs/foundry/security/orgs-and-spaces/#spaces), then the Project, then a list of resources.

![Example Compass resources](/docs/resources/foundry/upgrade-assistant/compass-resources.png)

## Enrollment resources

Enrollments are displayed with a specific <img src="./media/enrollment-icon.png" alt="Enrollment icon" width="20" />  icon.

Enrollment resources are never updated automatically and must be manually marked as resolved by a [Maintenance Operator](/docs/foundry/upgrade-assistant/technical-maintenance-operators/).

The **Pending >** label has an arrow indicating that enrollments need to be manually marked as compliant.

![Example enrollment resources](/docs/resources/foundry/upgrade-assistant/enrollment-resources.png)

## Other resources

Other resources are displayed in a list. Depending on the specific resource type, we may display additional information such as the name of the resource, the type of the resource, the Project it belongs to, and so on.

![List of other resources](/docs/resources/foundry/upgrade-assistant/other-resources.png)
