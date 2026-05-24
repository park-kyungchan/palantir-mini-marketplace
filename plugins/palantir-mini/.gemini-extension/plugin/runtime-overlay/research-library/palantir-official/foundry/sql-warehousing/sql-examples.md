---
sourceUrl: "https://www.palantir.com/docs/foundry/sql-warehousing/sql-examples/"
canonicalUrl: "https://palantir.com/docs/foundry/sql-warehousing/sql-examples/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bbe2b7cee01f252aa8569dd1ad16cc8647c68c321516e6afeffcfb2a3c43839c"
product: "foundry"
docsArea: "sql-warehousing"
locale: "en"
upstreamTitle: "Documentation | SQL in Foundry > SQL examples"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SQL examples

This page provides hands-on SQL examples for common tasks in Foundry, including reading and writing tabular data and querying ontology object types. Examples can be run from [SQL Studio](/docs/foundry/sql-warehousing/sql-studio/), the embedded [SQL console](/docs/foundry/sql-warehousing/sql-console/), or external SQL clients connected via [Arrow Flight SQL](/docs/foundry/sql-warehousing/arrow-flight-sql/). For full syntax reference, see the [SQL dialect](/docs/foundry/sql-warehousing/sql-dialect/) documentation.

## Tabular data

The following examples query and modify [datasets](/docs/foundry/data-integration/datasets/) and [Iceberg tables](/docs/foundry/data-integration/iceberg-tables/) in [data mode](/docs/foundry/sql-warehousing/sql-studio/#data-mode), executed by the [Furnace](/docs/foundry/sql-warehousing/furnace/) engine.

### Create and read a dataset

```sql
-- Create a dataset
CREATE OR REPLACE TABLE `/path/dataset-name` USING parquet AS
SELECT *
FROM `/path/dataset-input`;

-- Query a dataset
SELECT *
FROM `/path/dataset-name`
WHERE column = 'value';
```

### Create and modify an Iceberg table

:::callout{theme="neutral"}
You must have [Iceberg tables](/docs/foundry/iceberg/overview/) enabled in your environment to create Iceberg tables.
:::

```sql
-- Create an empty Iceberg table
CREATE TABLE `/path/table-name` (
    id   INT,
    name STRING
)
USING iceberg;

-- Insert rows
INSERT INTO `/path/table-name`
VALUES (1, 'apple'), (2, 'pear');

-- Update rows
UPDATE `/path/table-name`
SET name = 'clementine'
WHERE id = 2;

-- Delete rows
DELETE FROM `/path/table-name`
WHERE id = 1;
```

## Ontology object types

The following examples query ontology object types in [object mode](/docs/foundry/sql-warehousing/sql-studio/#object-mode), executed by the [Ontology SQL](/docs/foundry/sql-warehousing/ontology-sql/) engine. Object types are referenced by their resource identifier (RID).

### Query an object type

```sql
SELECT employeeId, firstName, department
FROM `ri.ontology.main.object-type.<employee-rid>`
WHERE department = 'Engineering';
```

### Query a many-to-many link

```sql
-- Find all cars driven by a specific person
SELECT c.*
FROM `ri.ontology.main.relation.<relation-rid>` AS linkTable
INNER JOIN `car` AS c
  ON c.`carId` = linkTable.`person_vehicles`
WHERE linkTable.`car_drivers` = 'person-123';
```

For details on link table column conventions and other object-querying patterns, see the [Ontology SQL](/docs/foundry/sql-warehousing/ontology-sql/) documentation.

## Troubleshooting

If you see an error such as `Output folder is not enabled for Iceberg tables. Please use a different format.`, you may be trying to write an Iceberg table to an unsupported location. This indicates that [Iceberg tables](/docs/foundry/iceberg/overview/) are not enabled for your environment or for the specific project location you are writing to. Modify your code to write to a different data format (for example, `USING parquet`), or contact Palantir Support to enable Foundry Iceberg tables.
