---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/configure-functions/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/configure-functions/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "52551493bbf109c2c012f2a3135373a1cf83064877d63dc0da91fb5e1f5c39cb"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | How-Tos > Configure function module extraction"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SAP functions

SAP function modules allow users to encapsulate and reuse global functions in the SAP system. Functions are managed in a central function library. The SAP system contains several predefined function modules that can be called. Users may also create custom functions based on business requirements.
SAP functions have input variables, output variables, changing variables and exceptions. Variables can be a single value, a dictionary (referred to as a "structure") or a list of dictionaries (referred to as a "table").
Function modules are bi-directional: they can both extract data and write back data to an SAP system.

## Prerequisites

:::callout{theme="neutral"}
In order to extract function results, the Foundry technical user needs the following authorization roles (or a custom role that has same authorization objects as the following roles):

* `/PALANTIR/SERVICE_USER`
* `/PALANTIR/CONTENT_FUNCTION_ALL`
* Any particular authorization role or object required to run the specific SAP function
:::

## Configuration

The Connector can only extract data from functions having at least one tabular output parameter. If the function returns more than one output parameter, the user will need to specify which output to write to the Foundry dataset using the `paramName` parameter.

### Simple example

This example sync configuration returns the `USERLIST` parameter of the `BAPI_USER_GETLIST` function:

```yaml
type: magritte-sap-source-adapter
sapType: function
obj: BAPI_USER_GETLIST
paramName: USERLIST
```

### Using input parameters

Input parameters for functions requiring them can be defined using the `inputParams`. Input parameters can have different types:

* **single value type**

```yaml
inputParams:
  singleValueType_key : 'value'
```

* **structure type**

```yaml
inputParams:
  structureType_key : '{"key1": "value1", "key2": "value2"}'
```

* **table type**

```yaml
inputParams:
  tableType_key : '[{"key1": "value1", "key2": "value2"},{"key1": "value3", "key2": "value4"}]'
```

In the following example sync configuration, the function `EM_GET_NUMBER_OF_ENTRIES` expects an input parameter `IT_TABLES` of **table type**:

```yaml
type: magritte-sap-source-adapter
sapType: function
obj: EM_GET_NUMBER_OF_ENTRIES
inputParams:
  IT_TABLES: '[{"TABNAME":"TSTC"}]'
paramName: IT_TABLES
```
