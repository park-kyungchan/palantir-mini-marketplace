---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/netsuite-suiteanalytics/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/netsuite-suiteanalytics/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "4c2daec8cab537c3d904df57f3a5841c32b37c3096211671eafd32c50049c905"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Oracle NetSuite > NetSuite SuiteAnalytics"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Oracle NetSuite SuiteAnalytics

Connect Foundry to Oracle NetSuite via SuiteAnalytics Connect to sync data from your NetSuite ERP to Foundry.

:::callout{theme="note"}
SuiteAnalytics needs to be enabled on your NetSuite instance. See [NetSuite documentation ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_3996274388.html#To-enable-the-Connect-Service-feature%3A) to enable it.
:::

## Supported capabilities

| Capability | Status |
| --- |--- |
| Exploration | 🟢 Generally available |
| Batch syncs | 🟢 Generally available |
| Incremental | 🟢 Generally available |

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **JDBC** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Authentication

You can authenticate with SuiteAnalytics with a **username/password** combination. We recommend the use of service user credentials rather than individual user credentials.

### Configure user roles and permissions in NetSuite

In NetSuite, to control access, each user is assigned one or more roles, and each role is a collection of permissions that define what tasks the user can perform and what data they can access. We recommend the following configuration for the user that will connect to Foundry:

1. Create a dedicated role with appropriate permissions.
   1. From NetSuite’s tool bar, select **Setup** > **Users/Roles** > **Manage Roles** > **New** and provide an explicit name to the role. We recommend using `foundry-role`.
   2. Add system-wide permissions to the role by navigating to the bottom of the role page and selecting **Permissions** > **Setup**. Select **SuiteAnalytics Connect**, select **Add** then **Save**.
      * *Note: NetSuite documentation recommends adding the **SuiteAnalytics Connect: Read All** permission, but it is irrelevant for NetSuite2.com data source (see [here for details ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_3998867068.html#bridgehead_1539708454)). Adding this permission will not have any effect.*
   3. Add table permissions to the role for tables you want to be able to query from Foundry by navigating to the bottom of the role page and selecting **Permissions** > **Lists**. Select the tables you want, select **Add** then **Save**.
2. Assign the new role to a user.
   1. From NetSuite’s tool bar, select **Setup** > **Users/Roles** > **Manage Users**. Select the user you want to use to connect to Foundry, and select **Edit**.
   2. Navigate to the **Access** tab and make sure the **Give Access** checkbox is ticked.
   3. In the **Roles** tab, select the newly created role (`foundry-role`) from the dropdown list, select **Add** then **Save**.
      * *Note: NetSuite documentation alternatively recommends using the **Data Warehouse Integrator** role instead of a custom one. However, this role requires access with token-based authentication (see [here for more details ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_3998867068.html#subsect_162885566786)), which is not available in Foundry.*

To verify that you added the correct permissions, log in as the user you have assigned the new role to, and check that you can view all the data that you expect.

## Networking

The SuiteAnalytics connector requires network access to the NetSuite Connect instance to which you want to connect.

### Option 1: Foundry worker connection

If your connection runs on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), the appropriate [egress policies](/docs/foundry/administration/configure-egress/) must be added when setting up the source.

The **service host** and **port** that need to be allowed can be found on **NetSuite's configuration homepage** at `https://<YOUR_ACCOUNT_ID>.app.netsuite.com/app/external/odbc/suiteAnalyticsConnectDownload.nl`.
To access this page without your NetSuite account ID:

1. Log in to the homepage of your NetSuite account.
2. Find the bottom-left **Settings** panel and select **Set Up SuiteAnalytics Connect**.

The **service host** is typically of the form **\<ACCOUNT\_ID>.connect.api.netsuite.com** and the port **1708**.

If such an egress policy does not exist, you can [request a new one](/docs/foundry/data-connection/set-up-source/#configure-a-network-policy); otherwise you can [add it](/docs/foundry/data-connection/set-up-source/#choose-your-network-policy-foundry-worker).

:::callout{theme="warning"}
Because this is using a non-HTTPS protocol, you will need to add both:

* A DNS policy referencing your service host by name, and
* A CIDR policy referencing explicitly the IP range. You can get the IP range of your NetSuite instance by running `nslookup you-service-host` in a terminal. IP addresses of NetSuite services may change at any time without notice.
:::

### Option 2: Agent worker connection

If your connection runs on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker), you must ensure that the agent host has firewalls open to the host names, IP addresses, and ports required to connect to your NetSuite Connect instance.

## Connection details

| Option | Required? | Description |
| --- | --- | --- |
| `URL` | Yes | In the form `jdbc:ns://<SERVICE_HOST>:<SERVICE_PORT>` where `SERVICE_HOST` and `SERVICE_PORT` can be retrieved from [NetSuite's configuration homepage](#option-1-foundry-worker-connection). Typically of the form **`jdbc:ns://<ACCOUNT_ID>.connect.api.netsuite.com:1708`**|
| `Driver class` | Yes | Needs to be **com.netsuite.jdbc.openaccess.OpenAccessDriver** |
| `Drivers` | Yes | **(Option 1)** For [Foundry worker connection](/docs/foundry/data-connection/core-concepts/#foundry-worker), upload the latest JDBC driver that you can download from [NetSuite's configuration homepage](#option-1-foundry-worker-connection).  <br /><br />**(Option 2)** For [agent worker connections](/docs/foundry/data-connection/core-concepts/#agent-worker), the same JDBC driver that **Option 1** will need to be properly signed to be uploaded on the agent. Contact your Palantir representative to do so. See how to [add drivers to an agent](/docs/foundry/available-connectors/custom-jdbc-sources/#jdbc-drivers) for more details.  |
| `Credentials` | Yes | The **username** and **password** of the user used to connect to Foundry. |
| `JDBC properties` | Yes | The entire list of available properties is described [here ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4425626714.html#Connection-Properties). The following properties are mandatory: <br /><br />  - **CustomProperties** : `(AccountID=<ACCOUNT_ID>;RoleID=<ROLE_ID>)` <br />*The **ROLE\_ID** is the Internal ID associated with the role you assigned to the user (`foundry-role`). You can find this value next to the role name on the **Setup** > **Users/Roles** > **Manage Roles** page. If Internal ID is not displayed, see [how to turn it on ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N3423996.html#Setting-the-Internal-ID-Preference).*  <br /><br />  - **NegotiateSSLClose** : `false` <br /><br />  - **ServerDataSource** : `NetSuite2.com`  <br /> *As of November 8, 2021, new Connect users can access the Connect Service using the NetSuite2.com data source only. See [Oracle NetSuite's documentation ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N752122.html#Connect-Data-Source) for more details.* <br /><br />  - **encrypted** : `1`|

Other connection parameters are the same as for any [JDBC source](/docs/foundry/available-connectors/custom-jdbc-sources/#jdbc-properties).

## Creating a sync

The NetSuite SuiteAnalytics source can be [explored](/docs/foundry/data-connection/source-exploration/) to discover tables and create new syncs.
You can also [manually create new syncs](/docs/foundry/data-connection/set-up-sync/) from the overview page of the source.
