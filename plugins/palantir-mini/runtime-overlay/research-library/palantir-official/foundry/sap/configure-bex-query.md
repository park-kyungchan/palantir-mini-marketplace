---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/configure-bex-query/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/configure-bex-query/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "75267b500da6c90cb6eda16afeb320bc06eb6d5bdb5dbdebdacf6b24cdd2bd5b"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | How-Tos > Configure BEx query extraction"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# BEx query

BEx is a multidimensional query framework on top of SAP BW InfoProvider. BEx queries use standard SAP BW access methods and all authorization concepts from SAP BW are inherited.
BEx queries represent business logic applied to InfoProvider views, and metadata is therefore crucial to understand filters, variables, rows, columns, cell-based formulas, exceptions and conditions.

:::callout{theme="neutral"}
If the BEx query has dynamic columns (a characteristic on columns with key figures such that every key figure is repeated along with the characteristic value) then this will create a dynamic output. Dynamic columns are not supported by Foundry so adjust your query accordingly if this is the case.
:::

## Extracting data

Use the `bex` object type to extract data from BEx queries.

Example sync configuration:

```yaml
type: magritte-sap-source-adapter
sapType: bex
obj: PALQ16
```

## Supported parameters

Additional parameters are supported when configuring transaction code extraction:

* [filter](#filter)
* [charFilter](#charFilter)
* [freeChars](#freeChars)
* [dropColumns](#dropColumns)
* [technicalNames](#technicalNames)

Multiple parameters can be defined in the same sync.

### filter

Provide filters values for BEx query variables.

Example sync configuration:

```yaml
type: magritte-sap-source-adapter
sapType: bex
obj: PALQ16
filter: VAR006=A;VAR006=B
```

### charFilter

Filter the data *after* the query is run.

```yaml
type: magritte-sap-source-adapter
sapType: bex
obj: PALQ16
charFilter: PMAT=M001
```

### freeChars

Add characteristics to the output. These characteristics need to be defined as *free characteristics* in the BEx query.

The following example adds PAL01 to the output:

```yaml
type: magritte-sap-source-adapter
sapType: bex
obj: PALQ16
freeChars: PAL01
```

### dropColumns

Remove key characteristics from the output.

The following example removes `PAL01` from the output:

```yaml
type: magritte-sap-source-adapter
sapType: bex
obj: PALQ16
dropColumns: PAL01
```

### technicalNames

Allows to toggle between technical and humand-readable (language-dependent) column names.

Example sync configuration:

```yaml
type: magritte-sap-source-adapter
sapType: bex
obj: PALQ16
technicalNames: true
```
