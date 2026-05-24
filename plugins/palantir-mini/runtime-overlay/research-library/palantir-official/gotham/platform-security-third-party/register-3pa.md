---
sourceUrl: "https://www.palantir.com/docs/gotham/platform-security-third-party/register-3pa/"
canonicalUrl: "https://palantir.com/docs/gotham/platform-security-third-party/register-3pa/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e6429c484bd7460fef42bd5f6b6818fce10180a0d5de0dfb61ced532dae05dc5"
product: "gotham"
docsArea: "platform-security-third-party"
locale: "en"
upstreamTitle: "Documentation | Third-party applications > Registering third-party applications"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Registering third-party applications

Before a third-party application can be connected to Gotham, it must be *registered* on the platform.

The initial registration process creates a name, a client ID, and a client secret for the third-party application; see the [OAuth.com docs ↗](https://www.oauth.com/oauth2-servers/client-registration/client-id-secret/) for more information on client IDs and client secrets, which are used in the authorization workflow.

Then, a third-party application will need to be configured with a redirect URL for the authorization process, as well as a name, description, and icon which are used for the in-platform representation of the third-party application.

## Registration

1. To begin the process of registering a new application, navigate to the **Third-party applications** tab, select the **All applications** tab, and click **Register new application**.
2. This will open the **Register new application** modal window. Here, you can name your application and choose the client type. Select **Create** to continue or **Cancel** to close the window.
3. You will see an on-screen confirmation that your application has been registered. You will need to enable the application for your organization in order to use the application. The confirmation screen also displays the client ID and the client secret. **Record the client ID and client secret as you will not be able to view the client secret again after leaving this screen**.

:::callout{theme="warning" title="Warning"}
If using a *confidential client*, you **must** copy the client secret at this point. The secret will not be available again after leaving this page. If you lose access to the client secret, you will need to rotate the secret.
:::

4. Select **Done** to continue to the [**Manage application** interface](/docs/gotham/platform-security-third-party/manage-3pa/).
5. After reviewing the application details in the **Manage application** interface, select **Save** to complete the registration process.
