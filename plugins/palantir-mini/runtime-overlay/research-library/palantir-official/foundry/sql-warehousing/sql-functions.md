---
sourceUrl: "https://www.palantir.com/docs/foundry/sql-warehousing/sql-functions/"
canonicalUrl: "https://palantir.com/docs/foundry/sql-warehousing/sql-functions/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e2a52d6c5a9079dbb3bc725a79820991c924b0aa2983a17bc7034eef68c98725"
product: "foundry"
docsArea: "sql-warehousing"
locale: "en"
upstreamTitle: "Documentation | SQL in Foundry > Ontology SQL functions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ontology SQL functions

:::callout{theme="neutral" title="Beta"}
Ontology SQL functions are in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and some features may not be available on your environment. Functionality may change during active development. Contact Palantir support to request access to Beta features.
:::

Ontology SQL functions allow you to define reusable, parameterized queries over [ontology](/docs/foundry/ontology/overview/) objects using SQL. Once published, an ontology SQL function can be used anywhere in Foundry that accepts ontology functions, including Workshop, Actions, Automate, and the Ontology SDK (OSDK).

Ontology SQL functions are read-only: you cannot modify the ontology from within an ontology SQL function.

:::callout{theme="warning"}
Beta ontology SQL functions do not currently support high-concurrency workloads and may need to queue when resource availability is low, or fail under load. For additional query and data constraints, refer to the [Ontology SQL limitations and constraints](/docs/foundry/sql-warehousing/ontology-sql/#limitations-and-constraints).
:::

## Define your function with SQL

You can write ontology SQL functions in [SQL Studio](/docs/foundry/sql-warehousing/sql-studio/). You must be in [Object mode](/docs/foundry/sql-warehousing/sql-studio/#object-mode) to create a function.

Functions support parameters, which are declared using [variables](/docs/foundry/sql-warehousing/ontology-sql/#using-variables) in the [SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/). In the example below, `animalParam` is a parameter that is passed in when the function is called. The default value `'dog'` is used when testing the query in the editor.

Parameters can only hold literal values (for example, a string, number, or boolean) of the [data types](/docs/foundry/sql-warehousing/sql-dialect/#data-types) supported by the ontology SQL dialect. A parameter cannot contain a SQL fragment or expression, and can only be used in positions where the SQL dialect expects a literal value, such as the right-hand side of a `WHERE` clause comparison.

```sql tab="SQL function example"
DECLARE @animalParam STRING = 'dog';

SELECT *
FROM `ri.ontology.main.object-type...`
WHERE animaltype = @animalParam;
```

## Publish your function

When you are satisfied with your function, save your worksheet and select the **Publish** button. Your worksheet must be saved to a project before you can publish the function.

<img src="./media/publish-function.png" alt="Publish function button." width=250>

In the **Publish function** dialog, provide a **Name** and **API name** for your function, as with any other function in Foundry.

<img src="./media/publish-function-name.png" alt="Publish function name and API name dialog." width=500>

## Use your function

Ontology SQL functions return a list of structs whose fields match the selected columns, with one struct per row in the result. When only a single column is selected, the function returns a list of that column's type instead. For example, `SELECT animal, animalType, age FROM ...` returns `List<Struct<animal: STRING, animalType: STRING, age: INTEGER>>`, while `SELECT animal FROM ...` returns `List<STRING>`.

After your function is published, it can be [used throughout Foundry](/docs/foundry/functions/use-functions/) like any other ontology function, including in Workshop, Actions, Automate, and OSDK. Ontology SQL functions can also be called from TypeScript and Python functions. As with other functions in Foundry, Ontology SQL functions support querying on [branches](/docs/foundry/global-branching/overview/) and [scenarios](/docs/foundry/workshop/scenarios-overview/).

For details on Ontology SQL more broadly, refer to the [Ontology SQL overview](/docs/foundry/sql-warehousing/ontology-sql/).
