---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/create-sap-rfc-connection/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/create-sap-rfc-connection/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f40637658ec5a214352cbc65eeebda562ff592f4fc4b4b8f0893759ac0ba0e5c"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | SAP Add-on > Create an RFC connection"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create an RFC connection

In this section, an RFC Destination connection is created that will be used to extract data from a remote SAP system.

1. To create an RFC connection, enter the `SM59` transaction code.
2. Create a new ABAP connection and select `3` as connection type.
3. In the **Technical Settings** tab, fill in the **Target Host** and **System Number** according to the values for the SAP Source System such as the ECC instance.
4. In the **Logon & Security** tab, fill in the login credentials and Client number (3-digit number). SAP stores test and production data in the same table and uses a **client (MANDT)** column to enable different clients (for example, test and production) to retrieve only the relevant client data. For the production environment, enter the Client number for the production client.
5. Save the connection configuration.
6. Authorize the test from the application toolbar and test the connection.
