---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/salesforce/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/salesforce/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f627680a6b0a3dbba1f4439279c5b4ecb32263da82e8d754ccf7d94f4e29ed5d"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Salesforce"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Salesforce

Foundry's **Salesforce** connector allows you to sync data between Salesforce and Foundry datasets.

:::callout{theme="warning"}
This document refers to the latest version of the Salesforce connector. If you are editing an existing Salesforce connector, it may be a legacy version. Review the section on [migration](#migration) below for more information.
:::

## Supported capabilities

| Capability  | Status                 |
|-------------|------------------------|
| Exploration | 🟢 Generally available |
| Bulk import | 🟢 Generally available |

## Data model

The connector models all available [standard ↗](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_list.htm) and custom Salesforce objects as Foundry datasets. Schemas are retrieved dynamically. The exploration view allows you to browse the data model and preview how Salesforce objects would appear once imported to Foundry.

### Data type mapping

The connector maps Salesforce API types to the following [Foundry field types](/docs/foundry/data-integration/datasets/#supported-field-types):

| Salesforce                   | Foundry |
|------------------------------|---------|
| Auto Number                  | STRING  |
| Lookup Relationship          | STRING  |
| Master-Detail Relationship   | STRING  |
| External Lookup Relationship | STRING  |
| Checkbox                     | BOOLEAN |
| Currency                     | DECIMAL |
| Date                         | DATE    |
| Date/Time                    | LONG    |
| Email                        | STRING  |
| Geolocation                  | STRING  |
| Number                       | DOUBLE  |
| Percent                      | DOUBLE  |
| Phone                        | STRING  |
| Picklist                     | STRING  |
| Picklist (Multi-Select)      | STRING  |
| Text                         | STRING  |
| Text Area                    | STRING  |
| Text Area (Long)             | STRING  |
| Text Area (Rich)             | STRING  |
| Text (Encrypted)             | STRING  |
| Time                         | INTEGER |
| URL                          | STRING  |

## Performance and limitations

The connector leverages the [Salesforce Bulk API ↗](https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/bulk_ingest.htm) by default, which is recommended for any data operation including more than 2000 rows. Read more about [Bulk API Limits ↗](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_bulkapi.htm).

The connector can optionally use the [Salesforce SOAP API ↗](https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_quickstart_intro.htm) when setting the JDBC property `UseBulkAPI` to `false`. The SOAP API is also subject to [Salesforce SOAP API Call Limits ↗](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_apicalls.htm).

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) app and select **+ New Source** in the upper right corner of the screen.
2. Select **Salesforce** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the set up of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Authentication

Select a credential method to authenticate your Salesforce connection: JWT token or username-password.

### JWT token

You can use the OAuth 2.0 [JSON Web Token (JWT) bearer flow ↗](https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm) to authorize Foundry to access data without interactively logging in on each request.

To enable JWT authentication, you must generate a certificate, upload it while creating a Connected App, then perform a one-time authorization of the integration user.

#### Part 1: Generate a certificate

First, create a Salesforce user and verify it has access permission for APIs and any Salesforce objects you wish to modify. Be sure you are able to log in as the integration user, as you will need to authorize as this user in a future step.

Now, create a JWT certificate. The Salesforce [JWT bearer flow ↗](https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm\&type=5) requires an X.509 certificate and the associated private key. To generate a private key, use **openssl** at the command line and run the following commands:

1. Generate the x.509 public and private key pair:

   ```bash
   openssl genrsa 1024 | openssl pkcs8 -topk8 -inform PEM -out key.pem -nocrypt
   openssl req -new -x509 -key key.pem -out cert.pem -days 3650
   ```

2. Export the certificate to a PFX store, convert to Base64, and copy to clipboard:

   ```bash
   openssl pkcs12 -export -in cert.pem -inkey key.pem | openssl base64 | pbcopy
   ```

:::callout{theme="warning"}
Be sure to save the certificate value in a secure location. You will need to access the value later in the [configuration](#part-3-authorize-user).
:::

#### Part 2: Create a connected app

In the Salesforce Lightning Experience setup page, scroll through the left side bar to select the **Apps > App Manager** entry under the **Platform Tools** section. In the App Manager page, create a new connected app by selecting **New Connected App**.

In the **Basic Information** section of the app creation page, fill in the following fields:

1. Connected App Name
2. API Name
3. Email

Then, follow these steps to set up the **API (Enable OAuth Settings)** section:

1. Check **Enable OAuth Settings**.
2. Fill in the **Callback URL** with `https://localhost:12345`. This will be used again later.
3. Check **Use Digital Signatures** and upload the `cert.pem` **X.509 certificate file** generated above.
4. Select **api**, **offline\_access**, and **refresh\_token** from the available **OAuth Scopes**.
5. Check **Require Secret for Web Server Flow**.

Ignore the other sections, and finalize the connected app creation by selecting **Save**, then **Confirm** on the next page. Allow ten minutes to pass before attempting to use the connected app.

Once the connected app is created, save the **Consumer Key** (for example, 3MVG9FG3dv...) in a secure place. The key is available under the **API (Enable OAuth Settings)** section.

#### Part 3: Authorize user

Authorize the integration user with one of the following options:

* **Perform a one-time authorization:** Authorize the connected app for the integration user by performing the login flow in a browser:
  1. Navigate to the following Salesforce URL: `https://<salesforce-url>/services/oauth2/authorize?client_id=`**`<CONSUMER_KEY>`**`&redirect_uri=`**`<CALLBACK_URL>`**`&scope=api%20offline_access%20refresh_token&response_type=code&response_mode=query&nonce=bebmwgu22zh`
     * Replace `<CONSUMER_KEY>` with your connected app consumer key and `<CALLBACK_URL>` with the URL you entered during the API configuration step.
     * Replace `<salesforce-url>` with your Salesforce instance URL (`<site>.my.salesforce.com`).
  2. Complete the login flow as the integration user, selecting **Use Custom Domain** if necessary. Select **Allow** on the next page to allow the connected app to act on your behalf for the specified scopes. Ensure the username of the integration user is shown and not your personal account username.
  3. Then, you will be redirected back to `https://localhost:12345` (the CALLBACK\_URL). Since the callback URL is not real, the browser will show an expected "Not Found” error.
* **Pre-authorize the user** by following the [Salesforce guidance ↗](https://help.salesforce.com/articleView?id=connected_app_manage_oauth.htm\&type=5) on how to change the **Permitted Users** policy to **Admin approved users are pre-authorized**. Once pre-authorization is complete, return to the connected app configuration page to grant access to the connected app.Access can be given to the individual integration user Profile, or a Permission Set that includes the integration user.

Continue setting up a Salesforce connector in Foundry using the JWT authentication configuration options below:

| Name  | Required | Description |
|--- |--- |---|
| `This is a Salesforce sandbox account` | Yes | Determines if the connection should be made to a Salesforce sandbox account. Sets the default value for `Login URL`: `login.salesforce.com` for standard accounts and `test.salesforce.come` for sandbox accounts. |
| `Username` | Yes | Enter the username of the integration user. |
| `Base64 PFX certificate` | Yes | Value obtained from [generating a certificate](#part-1-generate-a-certificate).|
| `The certificate is password protected` | No | Toggle on if the certificate store is password protected.|
| `Certificate password` | No | The certificate store password. |
| `Specify the certificate subject` | No  | Leave off to use the first certificate in the store. Toggle on to specify a certificate to use if the certificate store contains multiple certificates. |
| `Certificate subject` | No  |  The subject of the desired certificate. Used to locate the certificate in the store . If an exact match is not found, the store is searched for a certificate whose subject contains the supplied value. |
| `Consumer key` | Yes | Enter the consumer key available in the settings of the [connected app](#part-2-create-a-connected-app).|

### Username-password

To connect to Salesforce with the [username-password ↗](https://help.salesforce.com/articleView?id=remoteaccess_oauth_username_password_flow.htm) authentication method, you must create a service user account and connected app in Salesforce. Then, add credentials for both into the Salesforce connector.

Follow the steps below to enable the username-password authentication flow.

1. Create a Salesforce user and verify it has access permission for APIs and any Salesforce objects you wish to modify. Note the user’s username and password for future reference.

2. Create a connected app:

   1. In the Salesforce Lightning Experience setup page, scroll through the left side bar to select the **Apps > App Manager** entry under the **Platform Tools** section. In the App Manager page, create a new connected app by selecting **New Connected App**.

   2. In the **Basic Information** section of the app creation page, fill in the following fields:
      1. Connected App Name
      2. API Name
      3. Email

   3. Then, follow these steps to set up the **API (Enable OAuth Settings)** section:
      1. Check **Enable OAuth Settings**.
      2. Fill in the **Callback URL** with `https://localhost:12345`. This field is required for configuration though the callback URL will not be used.
      3. Select **Full access (full)** from the available **Selected OAuth Scopes** to allow access to all data accessible to the active user.

   4. Ignore the other sections and finalize the connected app creation by selecting **Save**, then **Confirm** on the next page. Allow two to ten minutes to pass before attempting to use the connected app.

Once the connected app is created, navigate to it from the App Manager page. Select **Manage**, then **Edit Policies**. Under **OAuth Policies > Permitted Users** select **All users may self-authorize**.

The username-password authentication method supports the following configuration options:

| Name  | Required | Description |
|--- |--- |---|
| `This is a Salesforce sandbox account` | Yes | Determines if the connection should be made to a Salesforce sandbox account. Sets the default value for `Login URL`: `login.salesforce.com` for standard accounts and `test.salesforce.come` for sandbox accounts. |
| `Username` | Yes | The username of the account that the connected app is imitating. |
| `Password` | Yes | The password of the account that the connected app is imitating.  |

:::callout{theme="neutral"}
If you experience authorization problems when trying to connect from Foundry and see `Failed: API security token required` in the **Salesforce Login History** of the user, you must add the user's security token to the end of the password.

The security token is an automatically generated key that must be added to the password to log in to Salesforce from an untrusted network. Salesforce does not allow users to view the security token within the application; instead, you must log in to Salesforce as the *integration user* and navigate to **My Settings** in the top right corner. Then, navigate to **Personal > Reset My Security Token**.
:::

### Networking

If a direct connection is running your Salesforce connector, you must add a [network egress policy](/docs/foundry/administration/configure-egress/) to allowlist the connection.

Choose to add an existing policy, or create a new policy.

To allowlist a direct connection for Salesforce, add the following policies:

* Login URL: Requires `DNS`, port `443` (HTTPS), and one of the following:
  * `login.salesforce.com` (production)
    **OR**
  * `test.salesforce.com` (sandbox)

* Instance URL: Requires `DNS` for `<site>.my.salesforce.com`, port `443` (HTTPS).

### Certificates and private keys

SSL connections validate servers certificates. Normally, SSL validations happen through a certificate chain; by default, both agent and Foundry workers trust most industry-standard certificate chains. If the server to which you are connecting has a self-signed certificate, or if there is TLS interception during the validation, the connector must trust the certificate. Learn more about [using certificates in Data Connection](/docs/foundry/data-connection/set-up-source/#optional-add-certificates).

## Configuration options

The Salesforce connector supports the following configuration options:

| Name                        | Required                | Default                                                                | Description                                                                                                                   |
|-----------------------------|-------------------------|------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| `API version`               | Yes                     | 50                                                                     | The Salesforce API version.                                                                                 |
| `Connected app credentials` | Yes                     | `JWT bearer token`                                                     | Contains credentials needed to connect to Salesforce. Review the [Authentication](#authentication) sections above for more information. |
| `Login URL`                 | No | `login.salesforce.com` (production), or `test.salesforce.com` (sandbox) | The URL used to connect to retrieve OAuth tokens. |
| `Timeout`                   | No                      | 60                                                                     | The duration of time before the HTTP client connection times out while waiting for a response. Time is in seconds.  |
| `Proxy settings`             | No                      | No                                                                     | The proxy configuration to use when connecting to Salesforce.                                                                 |

## Sync data from Salesforce

Use the [exploration view](/docs/foundry/data-connection/source-exploration/) to sync tables. Additional configuration options are available when editing a sync.

### Incremental

During incremental syncs with the Salesforce connector, new data is synced if the incremental column value is *greater than or equal* to the previous observed maximum value. This behavior, though required for precision and correctness of synced data, will lead to duplicate rows in the output dataset. Incremental pipelines should always contain a deduplication step.

### Filtering

You can add row filters to a sync configuration to exclude data that does not fit a set criteria.
Use the condition tree to define your filter:

* Logical operators:
  * `ALL`: Requires all nodes nested beneath to be true.
  * `ANY`: Requires at least one of the nested nodes to be true.
* Conditions:
  * Select from a list of available columns.
  * Depending on the column type, choose an appropriate operator.
  * Set a value to compare against the selected column.

Be sure to **Save** your configurations to apply them to the sync.

## Migration

If you already have a Salesforce connector, you may be running a legacy version. To identify your connector version, migrate to **Connection settings > Connection details**. If source configuration shows a **Custom YAML** section with a `type: salesforce` field, you are using a legacy Salesforce connector. You must migrate to the latest version to receive Palantir support beyond bug fixes.

### Migrate connector

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) app and select **+ New Source** in the upper right corner of the screen.
   1. Select **Salesforce** from the available connector types.
   2. Choose to run the source capabilities [in Foundry](/docs/foundry/data-connection/core-concepts/#foundry-worker) or [on an agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
   3. Follow the additional configuration prompts to continue the set up of your connector using the information in the sections below.
2. Configure the authentication to match that of the legacy source. In the legacy source configuration, find the  `auth-method` or `authentication-method` block in the custom YAML.
   * If `type: oauth2-jwt`, configure the new source with [JWT authentication](#jwt-token):
     * `claim-sub` from the custom YAML becomes `Username` in new connector configuration.
     * `x509-cert` is exported to PFX, then Base64 encoded and becomes `Certificate`. Learn more about certificates in the [JWT authentication](#jwt-token) section above.
   * If the PFX is password protected, toggle on `The certificate is password protected` and enter the `Certificate password`.
     * `claim-iss` from the custom YAML becomes becomes `Consumer key` in the new connector configuration.
   * If `type: oauth2-username-password`, configure the new source with [username-password authentication](#username-password):
     * `username` from the custom YAML becomes `Username`in the new connector configuration.
     * `password` from the custom YAML becomes becomes `Password`in the new connector configuration.
     * `client-id` and `client-secret` properties on the legacy source are *not* required by the new connector.
3. Configure other properties:
   * `auth-url` from the custom YAML becomes becomes `Login URL`in the new connector configuration.
   * If `auth-url` had a value of `test.salesforce.com` in the custom YAML, toggle on `Is Salesforce sandbox account` in the new connector configuration.

### Migrate syncs

After configuring a new Salesforce connector, create syncs for the objects that were previously synced by the legacy connector. Use the [exploration view](/docs/foundry/data-connection/source-exploration/) to bulk sync multiple objects at once and create new datasets.

:::callout{theme="neutral"}
If using the same API version, both the legacy and new Salesforce connectors will use the same schema; all downstream applications should continue to function if inputs are remapped.
:::

You must migrate downstream pipelines to use the new sync datasets. Once you have confirmed that no other consumers require the legacy datasets, you can delete the datasets, associated syncs, and connections. Use [Data Lineage](/docs/foundry/data-lineage/overview/) to find where the legacy datasets are used in your environment.
