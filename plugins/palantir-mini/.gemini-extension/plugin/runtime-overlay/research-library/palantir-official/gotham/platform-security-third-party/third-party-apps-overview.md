---
sourceUrl: "https://www.palantir.com/docs/gotham/platform-security-third-party/third-party-apps-overview/"
canonicalUrl: "https://palantir.com/docs/gotham/platform-security-third-party/third-party-apps-overview/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8e91bd7bab5f44d8f1ddf7413a6981039b51473cfb262d8a1833d0e83c96bea6"
product: "gotham"
docsArea: "platform-security-third-party"
locale: "en"
upstreamTitle: "Documentation | Third-party applications > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Overview

Palantir's platform security controls ensure that integration and interoperability with third-party applications can be centrally managed while respecting established security measures. Third-party application authorization supports the [OAuth 2.0 framework](/docs/gotham/platform-security-third-party/writing-oauth2-clients/).

Third-party application permissions should be managed by Gotham administrators to ensure the security of the platform. The third-party application interface in **Platform Settings** enables Gotham administrators to see which applications have been registered as well as which applications have been enabled for access. From the third-party application interface, administrators can [register new applications](/docs/gotham/platform-security-third-party/register-3pa/), [manage existing applications](/docs/gotham/platform-security-third-party/manage-3pa/), and [disable or revoke application registrations](/docs/gotham/platform-security-third-party/danger-zone-actions/#disabling-a-third-party-application).

## Accessing the third-party applications user interface

For users with the appropriate permissions, the third-party application management interface can be reached by navigating to the **Settings** page (`/workspace/settings`) via the Account icon (your initials) in the lower-left-hand corner of the navigation bar, then selecting the **Third-party applications** tab.

![Third-party applications tab](/docs/resources/gotham/platform-security-third-party/3PA-third-party-app-page.png)

To access the third-party application management interface, you must have “Manage OAuth2 Clients” access for your primary Organization, as seen on the Organizations tab of the Settings page (`/workspace/settings/organizations`). Contact your Palantir representative to request access. Without this permission, the third-party applications tab will not appear on the Settings page.
