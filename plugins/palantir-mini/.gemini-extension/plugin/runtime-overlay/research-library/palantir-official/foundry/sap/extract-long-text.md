---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/extract-long-text/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/extract-long-text/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d5c68c4de4c3e60037f3278b02b6ba2f47d1ee3273d1dea75aef4af3e5d5de78"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | How-Tos > Extract long text from SAP"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Extract long text from SAP

Long texts (also referred to as SAPscript texts or text objects) are the containers attached to SAP ERP objects to accommodate long text in SAP systems. Users can add free text and even apply formatting without being blocked by common database or application restrictions. Users can add long texts to common SAP objects such as sales orders, materials, or notifications.

Long texts are stored in the `STXL` table in a compressed format. This table holds the long texts for all SAP objects. It needs to be decompressed in order to be readable in Foundry.

## Prerequisites

* [Palantir Foundry Connector 2.0 for SAP Applications](/docs/foundry/sap/overview/) SP16 or above

## Extracting long text

The Foundry SAP Connector has the functionality to decompress long texts before sending the `STXL` table to Foundry. A new record needs to be added to the configuration table to activate this functionality. To add a new record:

1. Run the transaction `/n/PALANTIR/DECOMPRESS`

2. In the configuration table, fill in the following Connector parameters:
   1. `OBJECT TYPE`: `SLT`, `TABLE` or `REMOTETABLE` (depending on your setup)
   2. `OBJECT`: `STXL`
   3. `FIELD`: `CLUSTD`
   4. `ITEM NO`: `1`
   5. `INTERFACE COMPONENT`: `DECOMPRESSION_LRAW`

3. Create a new sync and ingest the long texts table. Since the `STXL` table is typically very large, it is best to filter the table by object name.

   The format of the sync config is as follows:

   ```yaml
   type: magritte-sap-source-adapter
   sapType: <slt>/<table>/<remotetable>
   obj: STXL
   context: <SLT_Context>/<Remote_Agent_Context>
   filter: <filters>
   ```

   An example sync:

   ```yaml
   type: magritte-sap-source-adapter
   sapType: table
   obj: STXL
   filter: TDOBJECT=QMEL
   ```

   You can filter the `STXL` table by object names and text ids. For example:

   * Notification Object: `TDOBJECT=QMEL`
   * Notification Object header long texts: `TDOBJECT=QMEL;TDID=LTXT`
   * Purchase Order header texts: `TDOBJECT=EKKO`
   * Purchase Order item texts: `TDOBJECT=EKPO`
