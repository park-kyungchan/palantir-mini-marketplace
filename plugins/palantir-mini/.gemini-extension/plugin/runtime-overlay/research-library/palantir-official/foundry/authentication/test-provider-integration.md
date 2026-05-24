---
sourceUrl: "https://www.palantir.com/docs/foundry/authentication/test-provider-integration/"
canonicalUrl: "https://palantir.com/docs/foundry/authentication/test-provider-integration/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8d7bae0ffc6ad68bf6d4ed6c528a8acde9980aa432854983c807e753922fc077"
product: "foundry"
docsArea: "authentication"
locale: "en"
upstreamTitle: "Documentation | Authentication > Enable and test identity provider integration"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Enable and test identity provider integration

## Enable authentication

You must enable your SAML or OIDC provider in order to test your integration. If using a Foundry setup link, skip to the next step. Otherwise, go to the **Provider Management** page and toggle on **Enable provider** for the desired provider. You can then log in to Foundry using your new integration.

![Enable provider](/docs/resources/foundry/authentication/authentication-enable-provider.png)

## Test integration

To validate the configuration of your identity provider integration, you can create test logins. If using a Foundry setup link, click **Log in to Foundry** to automatically create a test login.

Alternatively, navigate to the **SAML** or **OIDC** page in-platform and select **Test SAML** and then **Create new test**. There are two options for testing:

* Select **Log in to Foundry** to test the integration yourself.
* Use the clipboard to copy the login URL and send it to another person. You’ll be able to see the result in the summary view after they attempt to log in.

![Create test](/docs/resources/foundry/authentication/authentication-create-test.png)
![Test log in](/docs/resources/foundry/authentication/authentication-test-login-in.png)

Once you — or the person you sent the URL to — has logged in, you will be able to see the results of the test. These test results state whether the login was successful and capture a snapshot of the user's attributes received from your provider.

You can preview how these attributes will be mapped in Foundry by opening the test in the **Attribute Preview** tab. As you make changes to your attribute mapping configuration, the results will be reflected in the panel.

![Login tests](/docs/resources/foundry/authentication/authentication-login-tests.png)
![Attribute preview](/docs/resources/foundry/authentication/authentication-attribute-preview.png)

Test results are automatically deleted after one month.
