---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/jupyter/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/jupyter/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "44d5274b73020fdc898ace275d0fbf66da08f97ca49432554eb0c4db870f18eb"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Iceberg tables > Jupyter® in Code Workspaces"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Iceberg with Jupyter® notebook in Code Workspaces

The below instructions provide current details on how to read and write to Iceberg tables in a Jupyter® notebook. This beta workflow will be simplified in the future.

## Set up Code Workspaces to use Iceberg

1. **PySpark setup:** Set up a code workspace to use PySpark following the instructions in [FAQ: Can I use PySpark in Code Workspaces?](/docs/foundry/code-workspaces/code-workspaces-faq/#can-i-use-pyspark-in-code-workspaces).
2. **Upload Iceberg JARs:** Download the `Spark 3.5 with Scala 2.12` and `aws-bundle` JARs from [Iceberg's releases page ↗](https://iceberg.apache.org/releases/). Create a new folder called `/libs`, and upload the JARs into this folder.
3. **Network policy:** Import the network policy for your Iceberg storage bucket into your code workspace.

## Example Jupyter® notebook code

To begin, create a Spark session. Note that running this code will prompt you to enter a user token, which can be generated in your account settings. See [User-generated tokens](/docs/foundry/platform-security-third-party/user-generated-tokens/) for a step-by-step guide on creating a token.

```python
from pyspark.sql import SparkSession
from getpass import getpass

spark = (
    SparkSession.builder
        .master("local[*]")
        .appName("foundry")
        .config("spark.jars", "file:///home/user/repo/libs/iceberg-spark-runtime-3.5_2.12-1.9.1.jar,file:///home/user/repo/libs/iceberg-aws-bundle-1.9.1.jar")
        .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
        .config("spark.sql.catalog.foundry", "org.apache.iceberg.spark.SparkCatalog")
        .config("spark.sql.catalog.foundry.type", "rest")
        .config("spark.sql.catalog.foundry.uri", "https://<your_foundry_url>/iceberg")
        .config("spark.sql.catalog.foundry.default-namespace", "foundry")
        .config("spark.sql.catalog.foundry.token", getpass("Foundry token:"))
        .config("spark.sql.defaultCatalog", "foundry")
        .getOrCreate()
)
```

[Iceberg's documentation ↗](https://iceberg.apache.org/spark-quickstart/#adding-a-catalog) provides more context on the above parameters which are used to establish connectivity to the Iceberg catalog. Remember to update the `spark.jars` filepaths using the names of the JARs you uploaded in Step 2.

Of these, the Foundry-specific [Iceberg catalog parameters ↗](https://iceberg.apache.org/docs/latest/spark-configuration/#catalog-configuration) are:

| Parameter | Value | Description |
| --- | --- | --- |
| `spark.sql.catalog.foundry` | `org.apache.iceberg.spark.SparkCatalog` | Catalog [implementation class ↗](https://iceberg.apache.org/javadoc/0.11.1/org/apache/iceberg/spark/SparkCatalog.html). |
| `spark.sql.catalog.foundry.type` | `rest` | Underlying catalog implementation type, i.e. REST |
| `spark.sql.catalog.foundry.uri` | `https://<your_foundry_url>/iceberg` | URL for the REST catalog |
| `spark.sql.catalog.foundry.default-namespace` | `foundry` | Default namespace for the catalog |
| `spark.sql.catalog.foundry.token` | `getpass("Foundry token:")` | Prompts for token access credentials |

:::callout{theme="warning" title="Escaping whitespace"}
If your path contains a whitespace, you must ensure that the space is correctly escaped. With Spark, you can use backticks (`` ` ``) to escape whitespace, for example `` `/.../My folder/Iceberg table` ``. With PyIceberg, you can use URL encoding.
:::

Now you can use your Spark session to read and write from your Iceberg tables. For example, following the Iceberg documentation's [quickstart guide ↗](https://iceberg.apache.org/spark-quickstart/#creating-a-table), you can create a table and insert rows.

```python tab="PySpark"
from pyspark.sql.types import DoubleType, FloatType, LongType, StructType,StructField, StringType
schema = StructType([
  StructField("vendor_id", LongType(), True),
  StructField("trip_id", LongType(), True),
  StructField("trip_distance", FloatType(), True),
  StructField("fare_amount", DoubleType(), True),
  StructField("store_and_fwd_flag", StringType(), True)
])

df = spark.createDataFrame([], schema)
df.writeTo("`/.../taxis`").create()

schema = spark.table("`/.../taxis`").schema
data = [
    (1, 1000371, 1.8, 15.32, "N"),
    (2, 1000372, 2.5, 22.15, "N"),
    (2, 1000373, 0.9, 9.01, "N"),
    (1, 1000374, 8.4, 42.13, "Y")
  ]
df = spark.createDataFrame(data, schema)
df.writeTo("`/.../taxis`").append()
```

```python tab="Spark SQL"
spark.sql("""
        CREATE TABLE `/.../taxis`
        (
        vendor_id bigint,
        trip_id bigint,
        trip_distance float,
        fare_amount double,
        store_and_fwd_flag string
        )
        PARTITIONED BY (vendor_id);
    """)

spark.sql("""
        INSERT INTO `/.../taxis`
        VALUES (1, 1000371, 1.8, 15.32, 'N'), (2, 1000372, 2.5, 22.15, 'N'), (2, 1000373, 0.9, 9.01, 'N'), (1, 1000374, 8.4, 42.13, 'Y');
    """) 
```

***

*Jupyter®, JupyterLab®, and the Jupyter® logos are trademarks or registered trademarks of NumFOCUS.*

All third-party trademarks (including logos and icons) referenced remain the property of their respective owners. No affiliation or endorsement is implied.
