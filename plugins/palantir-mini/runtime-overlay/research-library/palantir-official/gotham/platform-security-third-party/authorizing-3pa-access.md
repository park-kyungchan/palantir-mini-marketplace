---
sourceUrl: "https://www.palantir.com/docs/gotham/platform-security-third-party/authorizing-3pa-access/"
canonicalUrl: "https://palantir.com/docs/gotham/platform-security-third-party/authorizing-3pa-access/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0fa440229c9e1c30314e79189e7b684be96ad9b3891bd6673fc3583d84a9062e"
product: "gotham"
docsArea: "platform-security-third-party"
locale: "en"
upstreamTitle: "Documentation | Third-party applications > Authorizing third-party application access"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Authorizing third-party application access

## Authorizing third-party applications

Once a third-party application has been [registered](/docs/gotham/platform-security-third-party/register-3pa/) and [enabled](/docs/gotham/platform-security-third-party/enabling-3pa-access/), the process for authorizing the third-party application is simple.

:::callout{theme="neutral"}
If the desired third-party application has not been registered and enabled, register and enable it before proceeding with the authorization process or contact your Palantir representative to request registration and/or enablement.
:::

In this example, we’ll use a simple test application to demonstrate the workflow for authorizing a registered and enabled third-party application for Gotham access. Third-party applications may offer some kind of **Connect** option, as seen below.

![Example third-party application](/docs/resources/gotham/platform-security-third-party/auth_code_grant_connect.png)

Attempting to connect or authorize a third-party application that has been registered and enabled will direct you to the platform and open a confirmation screen, as seen below, in which you can choose to **Allow** or **Don’t allow** access. This confirmation screen will display the set of operations for which the third-party application is requesting permissions; this set of operations is determined by the author of the third-party application connector.

![Example third-party application: Connection dialog](/docs/resources/gotham/platform-security-third-party/3PA-user-example-test-app_a.png)

After allowing access, you should be redirected back to the third-party application and receive a confirmation of access permission.

### Managing Authorized Applications

The **User Settings > Authorized Applications** tab displays the third-party applications that have been approved for access.

![Example authorized application](/docs/resources/gotham/platform-security-third-party/3PA-authorized-app.png)

Clicking on the **Actions** dropdown menu brings up the following options: **Details** and **Revoke**.

Selecting **Details** displays information about the data that the third-party application can access.

Selecting **Revoke** brings up a confirmation screen; revoking access removes the application’s ability to access information in your account.

After revoking access, we see that no applications have been authorized to access your account. An application whose access has been revoked can be added again by repeating this workflow.

![Authorized applications: No applications authorized](/docs/resources/gotham/platform-security-third-party/3PA-user-no-apps-authorized_a.png)
