---
sourceUrl: "https://www.palantir.com/docs/foundry/analytics-connectivity/qlik-sense-setup/"
canonicalUrl: "https://palantir.com/docs/foundry/analytics-connectivity/qlik-sense-setup/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "65b0d851ad65c6b64519f4171121848393ee3ea7fce0e5b9c56fc8f5dbccf9f8"
product: "foundry"
docsArea: "analytics-connectivity"
locale: "en"
upstreamTitle: "Documentation | Qlik Sense > Server setup"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Server setup

You can now access Palantir Foundry datasets from Qlik Sense and use them to build interactive dashboards. To use Foundry with Qlik Sense, you must have the Foundry ODBC Driver installed on your Qlik Sense server.

Follow the below guide to complete the setup. These steps must be completed by someone with access to the Qlik Sense server.

### Step 1: Install the ODBC Driver

Navigate to the [Downloads Page: ODBC Driver](/docs/foundry/analytics-connectivity/downloads/#foundry-datasets-odbc-driver) to download the driver. Install it on the Qlik Sense server.

### Step 2: Configure the Foundry DSNs

Qlik Sense requires ODBC DSNs to be pre-configured.

1. On the Qlik Sense server, open the Windows ODBC Administration tool, and create a new System DSN for the `FoundrySqlDriver`.
2. Set your Foundry URL as the server.
3. Select "Additional Properties", and add a new property `UserAgent` with a value of `QLIKSENSE`. This will enable settings optimized for Qlik Sense.
4. Click **OK** to save the DSN.

We recommend leaving the access token field blank in the DSN, and setting it later when you create a connection within Qlik Sense. Keep in mind that if you set a token within the DSN, anyone with access to that DSN within Qlik will be able to view the data the token provides access to.

:::callout{theme="warning" title="UserAgent property"}
It is important to set the `UserAgent` property. Without it, data will not load correctly.
:::

### (Optional) Step 3: Pre-configure Qlik Sense connections

If users are able to create their own connections within Qlik Sense, you can skip this step. Otherwise, you'll need to pre-configure the Foundry connections and grant access to users. See the [Getting Started](/docs/foundry/analytics-connectivity/qlik-sense-getting-started/) guide for how to create connections.
