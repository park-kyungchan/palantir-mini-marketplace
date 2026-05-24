---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/ingest-hana-views/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/ingest-hana-views/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6f86c8bf05e1671683a10f95c219f7845703d677071e23b3816d8f94da878bc9"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | How-Tos > Ingest HANA views from SAP"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ingest HANA views from SAP

To extract data from a HANA view to Foundry, the HANA view needs to be published as an external view. This document describes the steps for doing that.

## Prerequisites

* SAP HANA Studio or SAP HANA Tools for Eclipse
* ABAP Development Tools for Eclipse

Note that these tools are available from [SAP development tools ↗](https://tools.hana.ondemand.com).

## External views

An external view is a special view in the ABAP Dictionary that defines an SAP HANA view in ABAP programs.

External views can only be created using the ABAP Development Tools (ADT) and only if the current database is an SAP HANA database.

When an external view is activated, an alias with the name of the view is created on the SAP HANA database that points to the SAP HANA view. The names of the view fields of the external view can be defined differently from the names of the view fields of the SAP HANA view. This performs a mapping of HANA-specific data types to the predefined types in ABAP Dictionary. The following table lists the currently supported HANA-specific data types and indicates which ABAP Dictionary types they are mapped to by default.

| HANA Type    | Meaning                      | Type in ABAP Dictionary |
|--------------|------------------------------|-------------------------|
| `SMALLINT`     | 2-byte integer               | `INT2`                    |
| `INTEGER`      | 4-byte integer               | `INT4`                    |
| `BIGINT`       | 8-byte integer               | `INT8`                    |
| `DECIMAL`      | Packed number                | `DEC`                     |
| `SMALLDECIMAL` | Packed number                | `DEC`                     |
| `FLOAT`        | Binary floating point number | `FLTP`                    |
| `NVARCHAR`     | Unicode character string     | `CHAR`                    |
| `VARBINARY`    | Byte string                  | `RAW`                     |
| `BLOB`         | Byte string                  | `RAWSTRING`               |
| `NCLOB`        | Unicode character string     | `STRING`                  |

External views can be displayed using the ABAP Dictionary tool in the SAP GUI-based ABAP Workbench, but not edited.

### Creating external view on top of SAP HANA view

1. Create new ABAP repository object and select **Dictionary View**.
2. In the next screen, choose the **External View** option and give a name and description to your external view.
3. Next, you can verify the column mapping from the SAP HANA view to the external view.
4. You can test your external view by displaying its content using the SE16 transaction code.

### Ingesting HANA views in Foundry

Foundry can ingest the external views that you create via a [sync](/docs/foundry/sap/sap-sync-setup/#foundry-sap-sync).

HANA views are not yet part of the list of supported SAP Object Types in the sync UI. To configure them, navigate to the Advanced view and define your sync as follows:

```yaml
type: magritte-sap-source-adapter
sapType: hanaview
obj: <NAME_OF_VIEW>
```
