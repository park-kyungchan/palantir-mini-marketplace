---
sourceUrl: "https://www.palantir.com/docs/foundry/email/email-suppression-management/"
canonicalUrl: "https://palantir.com/docs/foundry/email/email-suppression-management/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "96170bc8625e43a300f1bd87cafaba525c9e4d8db3b1756c2daf8dbe86b3865e"
product: "foundry"
docsArea: "email"
locale: "en"
upstreamTitle: "Documentation | Email administration > Email suppression management"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Email suppression management

Suppression management improves the explainability of email sending failures.
As described in the [overview](/docs/foundry/email/overview/), email sending may fail for a variety of reasons.
When these failures are repeated (for example, when the recipient's email server is unavailable), either the platform or the underlying email provider could create a "suppression", a mechanism by which the platform stops sending email to a user until the suppression expires or is manually deleted.

Suppressions caused by a `BOUNCE` will be automatically deleted after 14 days, while suppressions caused by user `COMPLAINT` will require manual intervention to delete.

We do not recommend deleting suppressions caused by a `COMPLAINT` without explicit consent from the recipient. Doing so could affect your email sending reputation and negatively impact your email deliverability.
