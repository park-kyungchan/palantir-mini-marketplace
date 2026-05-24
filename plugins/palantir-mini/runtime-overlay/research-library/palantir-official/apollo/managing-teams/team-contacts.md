---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-teams/team-contacts/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-teams/team-contacts/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b22c6025ebee8732d303dfaf6878e59563dfbb92a93984633c1c507eee202d8d"
product: "apollo"
docsArea: "managing-teams"
locale: "en"
upstreamTitle: "Documentation | Managing Teams > Team contacts"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Team contacts

Apollo allows you to configure a set of contacts to be associated with a team. These allow users to understand which team is responsible for what resources in the Apollo platform, as well as provide a unified place to configure notifications for these resources.

## Create a team contact

Create a new team contact by navigating to the **Contacts** tab in the **Teams** page in the **Hub Settings**. Select **New** to create a new contact.

![New contact](/docs/resources/apollo/managing-teams/new-contact.png)

Apollo supports three types of contacts:

* **Email**
* **Slack channel**
* **PagerDuty Service**

Each of these contact types can be configured as primary contacts for a team, see the following sections for more details.

You can configure Email and Slack as notification targets. [Learn more about notifications in Apollo](/docs/apollo/managing-notifications/overview/).

## Assign a contact team to a resource

Once you have contacts created for a team, you can modify product settings to assign the team as the contact team for that resource:

![Assign team](/docs/resources/apollo/managing-teams/assign-contact-team.png)

Once this is done, anyone is able to see the contact information for the owner of the resource from that page:

![Contact info](/docs/resources/apollo/managing-teams/assigned-team-contact.png)

If you configured PagerDuty, the PagerDuty service will be resolved and the specific user that is on-call will be displayed in this dropdown.
