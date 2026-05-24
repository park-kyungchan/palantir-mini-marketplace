---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/netsuite-suiteql-jdbc/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/netsuite-suiteql-jdbc/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b2e509e11e79f1b5ef324a33303bb258a0f588b73313faa5f1a6696b998b34fd"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Oracle NetSuite > NetSuite SuiteQL (JDBC)"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Oracle NetSuite SuiteQL

Connect Foundry to Oracle NetSuite using the SuiteQL framework and start syncing data from your NetSuite ERP to Foundry.

## Supported capabilities

| Capability | Status |
| --- |--- |
| Exploration | 🟢 Generally available |
| Batch syncs | 🟢 Generally available |
| Incremental | 🟢 Generally available |

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **NetSuite SuiteQL** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Authentication

The NetSuite SuiteQL source uses [token-based authentication (TBA) ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_4247329078.html#To-set-up-TBA-in-your-NetSuite-account%3A).

:::callout{theme="neutral"}
The token-based authentication feature must be enabled on your account. To enable TBA, see [NetSuite documentation ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/bridgehead_4253254429.html#procedure_4253064345).
:::

#### Configure user roles and permissions in NetSuite

Access control in NetSuite is configured via the assignment of roles to a user; each role is a collection of permissions that define what tasks the user can perform and what data they can access. We recommend the following configuration for the user that will connect to Foundry:

1. Create a dedicated role with appropriate permissions.
   1. From NetSuite’s tool bar, select **Setup** > **Users/Roles** > **Manage Roles** > **New** and provide an explicit name to the role. We recommend using `foundry-role`.
      * You can optionally tick the **Web Services only** configuration box.
   2. Add system-wide permissions to the role by navigating to the bottom of the role page and selecting **Permissions** > **Setup**. The minimal required permissions you need to add are:
      * **Log In using access tokens**
      * **REST Web Services**
      * **Custom Record Types**
      * **Custom Fields**
      * Remember to **Save** after adding the required permissions.
   3. Add report permissions to the role by navigating to the bottom of the role page and selecting **Permissions** > **Reports**. Select:
      * **SuiteAnalytics Workbook**,
      * Remember to **Add** the permissions and then **Save**.
   4. Add table permissions to the role for tables you want to be able to query from Foundry by navigating to the bottom of the role page and selecting **Permissions** > **Lists**. Select the tables you want, select **Add** then **Save**.

2. Assign the new role to a user.
   1. From NetSuite’s tool bar, select **Setup** > **Users/Roles** > **Manage Users**. Select the user you want to use to connect to Foundry, and select **Edit**.
   2. Navigate to the **Access** tab and make sure the **Give Access** checkbox is ticked.
   3. In the **Roles** tab, select the newly created role (`foundry-role`) from the dropdown list, select **Add** then **Save**.

To verify that you added the correct permissions, log in as the user you have assigned the new role to, and check that you can view all the data that you expect.

#### Configure integration and access tokens in NetSuite

Integration records are used in NetSuite to manage connections to external systems. We recommend the following configuration to connect to Foundry:

1. Create a new Integration record using TBA (see [more details ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/bridgehead_4249032125.html#procedure_4253065190)).
   1. From NetSuite’s tool bar, select **Setup** > **Integration** > **Manage Integrations** > **New** and provide an explicit name to the integration. We recommend `foundry-integration`.
   2. Make sure the **State** is **Enabled** and that only **Token-based Authentication** is ticked. All other boxes should be unticked.
   3. After you **Save**, make a note of the **`CLIENT ID`** and **`CLIENT SECRET`**. You will need them to configure Foundry.

:::callout{theme="neutral"}
`CLIENT ID` and `CLIENT SECRET` will be displayed only the first time you save the integration record. You must reset them to get new ones, which invalidates the previous values.
:::

2. Create and assign a TBA token.
   1. From NetSuite’s tool bar, select **Setup** > **User/Roles** > **Access Tokens** > **New**.
      * If you can't manage tokens for other users, navigate to the bottom-left **Settings** panel on NetSuite's homepage and select **Manage Access Tokens**.
   2. Select the newly created **application** (`foundry-integration` in our example), the user to which you've assigned the newly created role (`foundry-role`), and the newly created role.
      * If you can't manage tokens for other users, your user will be selected by default. Make sure your user has the newly created role (`foundry-role`) assigned to it.
   3. After you **Save**, make a note of the **`TOKEN ID`** and **`TOKEN SECRET`**. You will need them to configure Foundry.

:::callout{theme="neutral"}
`TOKEN ID` and `TOKEN SECRET` will only be displayed the first time you save the token. You will need to create a new token to get a new `TOKEN ID` and `TOKEN SECRET`.
:::

[Learn more about token management in NetSuite. ↗](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4254975694.html)

### Networking

The NetSuite SuiteQL connector requires network access to the NetSuite instance to which you want to connect.

#### Option 1: Foundry worker connection

If your connection runs on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker), you will need to add the following [egress policy](/docs/foundry/administration/configure-egress/) to the source:

* \<ACCOUNT\_ID>.suitetalk.api.netsuite.com on port 443. You can find your account id in the url when connected to NetSuite.

If this egress policy does not exist, you can [request the egress policy](/docs/foundry/data-connection/set-up-source/#configure-a-network-policy); otherwise, you can [add the egress policy](/docs/foundry/data-connection/set-up-source/#choose-your-network-policy-foundry-worker).

#### Option 2: Agent worker connection

If your connection runs on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker), you must ensure that the agent host has firewalls open to the host names, IP addresses, and ports required to connect to your NetSuite Connect instance.

### Connection details

| Option | Required? | Description |
| --- | --- | --- |
| `Account ID` | Yes | NetSuite Account ID, found as a prefix in your NetSuite's instance URL |
| `Client ID` | Yes | `CLIENT ID` copied when creating the [`foundry-integration`](#configure-integration-and-access-tokens-in-netsuite) |
| `Client secret` | Yes | `CLIENT SECRET` copied when creating the [`foundry-integration`](#configure-integration-and-access-tokens-in-netsuite) |
| `Access token` | Yes | `TOKEN ID` copied when creating the [TBA token](#configure-integration-and-access-tokens-in-netsuite) |
| `Access token secret` | Yes | `TOKEN SECRET` copied when creating the [TBA token](#configure-integration-and-access-tokens-in-netsuite) |

## Creating a sync

The NetSuite SuiteQL source can be [explored](/docs/foundry/data-connection/source-exploration/) to discover tables and create new syncs.
You can also [manually create new syncs](/docs/foundry/data-connection/set-up-sync/) from the overview page of the source.

## Notes

### Schema definition of SuiteQL tables

The schema of native SuiteQL tables is hardcoded within the driver, but your account or role may not have permissions to see all columns; by default, the first 1000 extracted rows of a table are used to determine the exact columns that are available for viewing with your role.

You can change this behavior by modifying the `RowScanDepth` connection property. In particular, setting `RowScanDepth` to `0` will allow you to see all columns, but may result in permission exceptions.

Read more about schema definition for native SuiteQL tables in the [JDBC Driver for NetSuite documentation on SuiteQL ↗](https://cdn.cdata.com/help/DNK/jdbc/pg_suiteql.htm).

To change the value of `RowScanDepth`, navigate to the source **Connection details** page, then go to **More options** followed by **JDBC properties**.

![Navigate to More options then JDBC properties](/docs/resources/foundry/available-connectors/netsuite-suiteql-add-jdbc-properties.png)

From the **JDBC properties**, you can add `RowScanDepth` and set the desired value.

![Set the RowScanDepth value](/docs/resources/foundry/available-connectors/netsuite-suiteql-rowscandepth.png)
