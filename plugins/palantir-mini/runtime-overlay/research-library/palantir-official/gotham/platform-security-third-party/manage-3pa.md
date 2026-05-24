---
sourceUrl: "https://www.palantir.com/docs/gotham/platform-security-third-party/manage-3pa/"
canonicalUrl: "https://palantir.com/docs/gotham/platform-security-third-party/manage-3pa/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8f24336663008b68f85908da05c21c4b83a679301b8afb150743c32b0c9cc4b8"
product: "gotham"
docsArea: "platform-security-third-party"
locale: "en"
upstreamTitle: "Documentation | Third-party applications > Managing third-party applications"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manage third-party application configuration

You can access the manage application interface by selecting **Manage application** from the **Actions** dropdown menu located to the right of an application in the **All applications** tab of the [third-party applications user interface](/docs/gotham/platform-security-third-party/third-party-apps-overview/#accessing-the-third-party-applications-user-interface). Here, you can review and edit an application’s registration such as its name, description, logo, authorization grant types, and application discovery settings.

:::callout{theme="neutral"}
The **Manage application** interface is only available to permissioned members of the managing Organization for a third-party application.

The organization that the user creates an application in is deemed the managing organization of the application, and anyone in the organization who has the **Manage OAuth 2.0 clients** permission can manage the third-party application.
:::

The following is an example of a **Manage application** page shown for an example application:

![Manage application](/docs/resources/gotham/platform-security-third-party/3PA-manage-application-page_a.png)

## Application details

In the **Application details** section, you can edit the application name, the optional description, and logo.

## Client type

In the **Client type** section, you can view the Client ID and edit the client type for your application. Client type refers to an OAuth2 standard regarding whether a client application can securely store a secret.

The two options for client type are:

* [Server application ↗](https://tools.ietf.org/html/rfc6749#section-2.1): This is intended for clients that are able to hold their credentials securely; for example, a client implemented on a secure server with restricted access to the client credentials. This client type supports both [authorization code grant](/docs/gotham/platform-security-third-party/writing-oauth2-clients/#authorization-code-grant) and [client credentials grant](/docs/gotham/platform-security-third-party/writing-oauth2-clients/#client-credentials-grant) options for authorization.
* [Native or single-page application ↗](https://tools.ietf.org/html/rfc6749#section-2.1): This is intended for clients that cannot hold their credentials securely; for example, a browser-based application where the authorization client runs on the web browser itself. This client type supports [authorization code grant](/docs/gotham/platform-security-third-party/writing-oauth2-clients/#authorization-code-grant) with PKCE, which means that using the `code_verifier` and `code_challenge` parameters is required. [Client credentials grant](/docs/gotham/platform-security-third-party/writing-oauth2-clients/#client-credentials-grant) is *not* supported.

For more information about these client types, see the documentation on [writing OAuth2 clients](/docs/gotham/platform-security-third-party/writing-oauth2-clients/).

:::callout{theme="warning" title="Warning"}
Native or single-page applications, such as mobile apps, are distributed to users for deployment. Thus, the application binaries are available and can be disassembled to extract a client secret. The client secret could then be used to impersonate an authorized user in an attack. [Proof Key for Code Exchange (PKCE) ↗](https://oauth.net/2/pkce/) is used to prevent such attacks.
:::

## Authorization grant types

In the **Authorization grant types** section, you will see the grant types supported by the client type chosen in the previous step. If you choose to enable the [Authorization code grant](/docs/gotham/platform-security-third-party/writing-oauth2-clients/#authorization-code-grant), you will be asked to specify at least one **redirect URL**.

* In the authorization process, OAuth2 uses browser redirects to send a user from the authorization provider back to the client that the user is trying to authorize (in this case, the third-party application). Thus, specifying redirect URLs helps provide additional security when a third-party application asks for permission to access resources.
* Note that redirect URLs can be updated later in the [Manage application](/docs/gotham/platform-security-third-party/manage-3pa/) screen.

If you choose to enable the [Client credentials grant](/docs/gotham/platform-security-third-party/writing-oauth2-clients/#client-credentials-grant) (this will only be available to confidential clients), a service user will be created for the application. The service user can be permissioned to access Palantir resources for requests on behalf of the application.

## Application discovery

In the **Application discovery** section, you can search for and select which organizations can discover and enable the application.

## Delete an application registration

[Danger zone actions](/docs/gotham/platform-security-third-party/danger-zone-actions/) are located at the bottom of the **Manage application** page.

![Manage application: Danger zone](/docs/resources/gotham/platform-security-third-party/3PA-danger-zone.png)

To permanently prevent users from authorizing a third-party application, the application’s registration can be revoked: that is, deleted from the platform.

This is considered a “danger zone action” as it is irrevocable and will render the third-party application unusable by all users unless the application is re-registered. If an application is re-registered, users will have to reauthorize the third-party application since Gotham treats the re-registration as a new registration.

Learn how to delete an application's registration from the [danger zone actions documentation](/docs/gotham/platform-security-third-party/danger-zone-actions/#delete-an-application-registration).
