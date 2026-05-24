---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/snowflake-iceberg-integration/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/snowflake-iceberg-integration/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bb37fd5b0197777464fc6f3089d08a3723992aa72717220b7ab5870370932dfb"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Iceberg tables > Connect Foundry's Iceberg catalog to Snowflake"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Connect Foundry's Iceberg catalog to Snowflake

Foundry can integrate with Snowflake through the [Snowflake connector](/docs/foundry/available-connectors/snowflake/).

Snowflake can integrate with Foundry-managed Iceberg tables through an [Apache Iceberg REST catalog integration ↗](https://docs.snowflake.com/en/user-guide/tables-iceberg-configure-catalog-integration-rest). If you encounter issues with these instructions, follow the [authentication troubleshooting instructions](/docs/foundry/iceberg/authentication/#troubleshooting-authentication).

:::callout{theme="warning" title="Limitations"}
Currently, Snowflake only supports reading Foundry-managed Iceberg tables with [bring-your-own-bucket storage](/docs/foundry/iceberg/iceberg-byob/). <br><br>
Snowflake does not currently support reading tables with [client-side encryption](/docs/foundry/iceberg/iceberg-settings/#configuring-iceberg-encryption-settings).
:::

## 1. Create a catalog integration

1. Enable your Snowflake instance to egress to your Foundry instance and to the [Iceberg storage bucket](/docs/foundry/iceberg/iceberg-byob/).
2. Configure [network ingress](/docs/foundry/administration/configure-ingress/) in Foundry to allow your Snowflake instance to connect to Foundry.
3. Run the following query in Snowflake to create a [catalog integration ↗](https://docs.snowflake.com/en/user-guide/tables-iceberg#label-tables-iceberg-catalog-integration-def). You need to use the [ACCOUNTADMIN role ↗](https://docs.snowflake.com/en/user-guide/security-access-control-considerations#using-the-accountadmin-role) to run the query. See the [Snowflake documentation ↗](https://docs.snowflake.com/en/sql-reference/sql/create-catalog-integration-rest) for more details.

   The following example uses [OAuth2 authentication](/docs/foundry/iceberg/authentication/):

   ```sql
   CREATE CATALOG INTEGRATION <name_your_integration>
     CATALOG_SOURCE = ICEBERG_REST
     TABLE_FORMAT = ICEBERG
     ENABLED = TRUE
     CATALOG_NAMESPACE = '<your_foundry_namespace>' -- Foundry folder, for example 'FoundryNamespace.MyProject.tables' for /FoundryNamespace/MyProject/tables
     REST_CONFIG = (
       CATALOG_NAME = 'foundry'
       CATALOG_URI = 'https://<your_foundry>/iceberg'
       CATALOG_API_TYPE = 'public'
       ACCESS_DELEGATION_MODE = VENDED_CREDENTIALS
     )

     REST_AUTHENTICATION = (
       TYPE = OAUTH
       OAUTH_TOKEN_URI = 'https://<your_foundry>/iceberg/v1/oauth/tokens'
       OAUTH_CLIENT_ID = '<client_id>'
       OAUTH_CLIENT_SECRET = '<client_secret>'
       OAUTH_ALLOWED_SCOPES = ( 'api:iceberg-read', 'api:iceberg-write' )
     );
   ```

## 2. Verify the integration

1. Verify that the integration is configured correctly by running the following query. See [Snowflake documentation ↗](https://docs.snowflake.com/en/sql-reference/functions/system_verify_catalog_integration) for more details.

   ```sql
   SELECT SYSTEM$VERIFY_CATALOG_INTEGRATION('<your_integration_name>');
   ```

2. Verify that you can [list namespaces ↗](https://docs.snowflake.com/en/sql-reference/functions/system_list_namespaces_from_catalog) and [list Iceberg tables ↗](https://docs.snowflake.com/en/sql-reference/functions/system_list_iceberg_tables_from_catalog) from the Foundry Iceberg REST catalog.

   ```sql
   SELECT SYSTEM$LIST_NAMESPACES_FROM_CATALOG(
        '<your_integration_name>',
        '<your_foundry_folder>', -- Foundry folder, for example 'FoundryNamespace.MyProject.tables' for /FoundryNamespace/MyProject/tables
        1
    );
   SELECT SYSTEM$LIST_ICEBERG_TABLES_FROM_CATALOG(
        '<your_integration_name>',
        '<your_foundry_folder>', -- Foundry folder, for example 'FoundryNamespace.MyProject.tables' for /FoundryNamespace/MyProject/tables
        1
    );
   ```

## 3. Register and read a table

Create a table that links to a Foundry table and verify that you can read data from it. This only reads data from Foundry, and does not overwrite or delete the table.

```sql
CREATE OR REPLACE ICEBERG TABLE <database>.<schema>.<name_your_table_in_snowflake>
    CATALOG = '<your_integration_name>'
    CATALOG_TABLE_NAME = '<table_rid>' -- or '<table_name_in_foundry>'
    CATALOG_NAMESPACE = 'foundry'  -- or '<table_namespace_in_foundry>' for example 'FoundryNamespace.MyProject.tables' for /FoundryNamespace/MyProject/tables
    AUTO_REFRESH = TRUE;

SELECT * FROM <database>.<schema>.<name_your_table_in_snowflake>;
```

## 4. Optionally write to a table

Write data to a Foundry Iceberg table in Snowflake.

```sql
INSERT INTO <database>.<schema>.<name_your_table_in_snowflake> VALUES
    <value_1>,
    <value_2>,
    <value_3>;
```

## 5. Optionally link the integration to a database

1. Create a new database linked to the catalog integration:

   ```sql
   CREATE DATABASE <name_your_integration_database>
     LINKED_CATALOG = (
       CATALOG = '<your_integration_name>'
     );
   ```

2. Verify the catalog link status. See the [Snowflake documentation ↗](https://docs.snowflake.com/en/sql-reference/functions/system_catalog_link_status) for more details.

   ```sql
   SELECT SYSTEM$CATALOG_LINK_STATUS('<name_your_integration_database>');
   ```
