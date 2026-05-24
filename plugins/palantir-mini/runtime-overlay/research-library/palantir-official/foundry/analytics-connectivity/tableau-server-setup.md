---
sourceUrl: "https://www.palantir.com/docs/foundry/analytics-connectivity/tableau-server-setup/"
canonicalUrl: "https://palantir.com/docs/foundry/analytics-connectivity/tableau-server-setup/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6bdb2f938d5e3492938453975cdb0f00d1ddf9edb4ce23ed1a479e4a68807f9e"
product: "foundry"
docsArea: "analytics-connectivity"
locale: "en"
upstreamTitle: "Documentation | Tableau > Tableau Server setup"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Tableau Server setup

Follow the below steps to set up Tableau Server for publishing. These steps must be performed by an administrator. The JDBC driver (`.jar`) and Tableau connector (`.taco`) files are the same as for Tableau Desktop.

## Step 1: Install Foundry Datasets JDBC Driver

Navigate to [Downloads: Foundry Datasets JDBC driver](/docs/foundry/analytics-connectivity/downloads/#foundry-datasets-jdbc-driver) to download the `.jar` file. Place it in the directory where Tableau Server looks for drivers. If using Windows, the location is `C:\Program Files\Tableau\Drivers`.

## Step 2: Install the Tableau Connector File

Navigate to [Downloads: Tableau Connector](/docs/foundry/analytics-connectivity/downloads/#foundry-datasets-tableau-connector) to download the `.taco` file. Place the file in `[Your Tableau Server Install Directory]/data/tabsvc/vizqlserver/Connectors`. By default, on Windows this is `C:\ProgramData\Tableau\Tableau Server\data\tabsvc\vizqlserver\Connectors`.

Alternatively, you can create a new directory to store connectors, then configure Tableau Server to use that directory by running `tsm configuration set -k native_api.connect_plugins_path -v C:/tableau_connectors`. Then, place the `.taco` file there instead.

### (Optional) Step 3: Setup OAuth for Desktop and Server

If you would like report creators to be able to authenticate via OAuth on Tableau Desktop and publish reports using OAuth, this must be configured. See [Tableau OAuth: Setup Guide](/docs/foundry/analytics-connectivity/tableau-oauth-setup/) for more information.

### Step 4: Restart Tableau Server

Every time the connector file is changed, you must restart Tableau Server.
