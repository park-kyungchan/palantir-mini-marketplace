---
sourceUrl: "https://www.palantir.com/docs/foundry/email/email-allowlisting/"
canonicalUrl: "https://palantir.com/docs/foundry/email/email-allowlisting/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cd735cb04ef6cd4e722a998eab9dd2251cfe2fdcec753ee95c917edb4c300220"
product: "foundry"
docsArea: "email"
locale: "en"
upstreamTitle: "Documentation | Email administration > Email allowlisting"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Email allowlisting

**Email allowlisting** allows organization administrators and information security officers to control the destinations where emails can be sent by curating a list of rules thereby ensuring that emails do not reach unexpected or unauthorized email inboxes.

## Configure your email allowlist

This feature can be found under the **Email settings > Email allowlist** tab of Control Panel.
![Email allowlisting page](/docs/resources/foundry/email/email-allowlisting-rules.png)

Allowlisting rules can take the following forms:

* An explicit email address (for example: `support@palantir.com`)
* A domain name (for example: `palantir.com`)
* A wildcard domain (for example: `*.palantir.com`)

We recommend setting rules as restrictive and specific as possible, as it is better to err on the side of safety than to be overly permissive.

For an email with multiple recipients, an email will be sent to each recipient if that recipient matches at least one rule.
For example, if you are sending a notification to a group, each group member's email address will be separately tested against your organization's email allowlist. Email addresses that fail this check will not receive the notification.

### Denied rules

When your email rule allows a high-risk target, you may see an error message informing you that the specific rule creation was denied by Palantir. In this case, you may request explicit approval from your administrator, or, file an issue within the platform for Palantir Support.
