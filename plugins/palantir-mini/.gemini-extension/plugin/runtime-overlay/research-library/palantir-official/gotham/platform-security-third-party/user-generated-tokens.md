---
sourceUrl: "https://www.palantir.com/docs/gotham/platform-security-third-party/user-generated-tokens/"
canonicalUrl: "https://palantir.com/docs/gotham/platform-security-third-party/user-generated-tokens/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dcfef059eb6b6baaa4f5e7c9f6515eed5a844064aa8c269fe5528fb91ccc9aa8"
product: "gotham"
docsArea: "platform-security-third-party"
locale: "en"
upstreamTitle: "Documentation | Third-party applications > User-generated tokens"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# User-generated tokens

:::callout{theme="danger" title="Danger"}
These tokens are associated with your personal Palantir user account and **must not be used in production applications or committed to shared or public code repositories**.
We recommend you store test API tokens as environment variables during development.
For authorizing production applications, [register an OAuth2 application](/docs/gotham/platform-security-third-party/third-party-apps-overview/).
:::

## Overview

The Palantir platform supports token-based authentication. Tokens are strings of characters that serve as secure identification for a specific user. Possession of these tokens is equivalent to possessing a user's username and password, and they should be handled securely and secretly.

## Generation

Tokens are generated from the settings dashboard. Under **User Settings**, select **Tokens**. The **User Token** dashboard appears.

![Token Dashboard](/docs/resources/gotham/platform-security-third-party/token_dashboard.png)

This interface shows user-generated tokens that have been created for the current user and information on their current state and expiration date. Existing tokens can be disabled from this interface, which temporarily deactivates them, or revoked, which permanently invalidates them. To generate a new token, click **Create Token**. This will open a token creation dialog:

![Token Creation](/docs/resources/gotham/platform-security-third-party/token_creation.png)

Give the token a useful name, provide a description, and specify the date when the token should expire. After clicking **Generate**, the token will be displayed one time only for security purposes. It can be copied and used as needed, but should not be stored in any insecure manner.

## Revoke

You can revoke individual tokens in the same interface by clicking **Revoke**.

![Token Revoke](/docs/resources/gotham/platform-security-third-party/token_revoke.png)

## Inactive users

By default, user accounts are automatically deactivated after 90 days of a user not logging in. When a user is deactivated, user-generated API tokens and tokens issued to OAuth2 clients become invalid.

The user will otherwise appear fully active, and work scheduled by that user will continue to run. For instance, schedules owned by an inactive user will continue to run.

For a user to be reactivated, they simply need to log in again.

Specific users can be exempted from automatic deactivation. For more information on this, contact your Palantir representative.
