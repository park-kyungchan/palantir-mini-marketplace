---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-notifications/team-notifications/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-notifications/team-notifications/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6b39e0bdb2e126f914324777e23ef19221f9447c3aeb359ef5880a5d0cd00f39"
product: "apollo"
docsArea: "managing-notifications"
locale: "en"
upstreamTitle: "Documentation | Managing Notifications > Team notifications"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Team notifications

Notifications are designed for teams to easily receive notifications for all their resources that they own. You can configure a Slack or email [team contact](/docs/apollo/managing-teams/team-contacts/) in the team settings page, and select the type of notifications you want to receive.

When the team is set as the contact team on Products or Environments, the team will receive notifications for these resources that match the notification preferences configured for that contact team.

![Set up team contact](/docs/resources/apollo/managing-notifications/setup-team-contact.png)

:::callout{theme="neutral"}
While you can add a PagerDuty contact for a team, PagerDuty is not supported for notifications.
:::

## Non-owned resources

If you would like to receive notifications for a resource that is not owned by your team, navigate to the notifications settings page for that resource and select the **For Team** tab. Then select the team and contact you would like to receive notifications.

![Set up non-owned resource](/docs/resources/apollo/managing-notifications/subscribe-team-contact.png)

## Set up email allowlist

Any email destination that you would like to send notifications for requires the domain to be added to the [Control Panel email allowlist](../../foundry/email/email-allowlisting.md)
Without this step, emails will not leave the platform.
