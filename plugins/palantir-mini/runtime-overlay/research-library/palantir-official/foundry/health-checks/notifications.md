---
sourceUrl: "https://www.palantir.com/docs/foundry/health-checks/notifications/"
canonicalUrl: "https://palantir.com/docs/foundry/health-checks/notifications/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "462bbeef3f3a92bb3082e68a175d38892bbedb6ee7d37c1ee85c22363c688d5f"
product: "foundry"
docsArea: "health-checks"
locale: "en"
upstreamTitle: "Documentation | Health checks > Notifications and issues"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Notifications and issues

Data Health is integrated with Foundry Notifications and Emails to provide in-platform notifications and emails, respectively, in the event of a failed check.

## Foundry Notifications

Data Health will always send an in-platform notification to [watchers](/docs/foundry/health-checks/watching-checks/) of failed checks:

![Notifications](/docs/resources/foundry/health-checks/notifications.png)

## Email Notifications

As a watcher of a check, you can also enable email notifications for failed checks. You can change your email and notification preferences by navigating to the **Profile Icon** in the upper right corner, clicking on **Settings** and then navigating to the **Notifications** tab:

![Notification Settings](/docs/resources/foundry/health-checks/notification-settings.png)

To receive updates on checks make sure to check everything under the **Builds** section.

## Integrating with Issues

You can also configure Data Health to automatically report an Issue when a check fails to make further debugging & discussion easier:

![Issues](/docs/resources/foundry/health-checks/issues.png)

To enable Issue reporting, you just need to tick the **Automatically create an issue when this check fails** box when creating/editing a check:

![Enabling Issues](/docs/resources/foundry/health-checks/enabling-issues.png)

You can also automatically assign the created issue to a specific user by entering their name in the box below.

:::callout{theme="neutral"}
Data Health will file an issue upon check failure, but it can also automatically close the issue once the check resolves.
:::
