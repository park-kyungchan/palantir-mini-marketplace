---
sourceUrl: "https://www.palantir.com/docs/foundry/sql-warehousing/arrow-flight-sql/"
canonicalUrl: "https://palantir.com/docs/foundry/sql-warehousing/arrow-flight-sql/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bdba72c7338067c883a2afe23170d2914cdcb58650ba5b65d9c71114521b689c"
product: "foundry"
docsArea: "sql-warehousing"
locale: "en"
upstreamTitle: "Documentation | SQL in Foundry > Arrow Flight SQL"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Arrow Flight SQL

:::callout{theme="neutral" title="Beta"}
Arrow Flight SQL support is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. Contact Palantir Support to request enabling Arrow Flight SQL.
:::

[Arrow Flight SQL ↗](https://arrow.apache.org/docs/format/FlightSql.html) is a protocol for interacting with SQL servers. Arrow Flight SQL uses the Apache Arrow in-memory format and Flight RPC protocol for efficient and portable data transfer.

Foundry implements the Arrow Flight SQL protocol, meaning that any Flight SQL client can connect to Foundry, enabling many third-party connections without the need for custom configuration.

## JDBC Driver

Arrow Flight SQL offers a [JDBC driver ↗](https://arrow.apache.org/java/main/flight_sql_jdbc_driver.html) that can be used with any JDBC-based client application, such as [DBeaver ↗](https://dbeaver.io/), [DataGrip ↗](https://www.jetbrains.com/datagrip/), or others. Follow the instructions below to set up and use the JDBC driver in Foundry.

### Part 1: Install the JDBC driver

Download the [JDBC driver (.jar file) ↗](https://mvnrepository.com/artifact/org.apache.arrow/flight-sql-jdbc-driver). Once downloaded, place the file into the appropriate location as specified in the client application's documentation for configuring JDBC connections.

### Part 2: Construct the JDBC connection string

The JDBC connection string format is:

```
jdbc:arrow-flight-sql://<FOUNDRY_HOSTNAME>:443/?token=<TOKEN>
```

* `FOUNDRY_HOSTNAME` is the hostname of your Foundry environment (such as `subdomain.palantirfoundry.com`).
* `TOKEN` is a security token generated from the **Settings** page inside Foundry. See the [user-generated tokens](/docs/foundry/platform-security-third-party/user-generated-tokens/) documentation for instructions on how to obtain a token.

If the JDBC client requires a username and password to be specified, specify the username to be `token` and the password to be a [user-generated token](/docs/foundry/platform-security-third-party/user-generated-tokens/).

If the JDBC client requires the driver class to be specified explicitly, specify `org.apache.arrow.driver.jdbc.ArrowFlightJdbcDriver`.

### (Optional) Part 3: Execute a SQL query

If supported by the client application, test a SQL query that returns rows from a Foundry dataset:

```sql
SELECT * FROM `/Path/To/Dataset` LIMIT 10
```

The client application may instead allow you to browse projects and select datasets to access data.

For the full set of JDBC connection parameters, see [the Flight SQL documentation ↗](https://arrow.apache.org/java/main/flight_sql_jdbc_driver.html).

## Roles and permissions

Access to SQL queries via Arrow Flight SQL is governed by the `Query` operation. See [SQL permissions](/docs/foundry/sql-warehousing/sql-permissions/) for more details.
