---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/common-operations-code-repositories/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/common-operations-code-repositories/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8736fc8fedc849e870ed821b83232334c90f078772e5f825f0203f0680b629db"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | Common operations > Code Repositories"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Code Repositories

## Python

### Create stable primary keys in PySpark

This code uses the `concat_ws()` and `sha2()` functions in PySpark to create stable and unique primary keys by concatenating multiple columns and optionally hashing the result. This approach ensures that primary keys are robust, stable, and effective for uniquely identifying rows in datasets.

Primary keys should be unique, non-null, and stable. Using non-deterministic or unstable primary keys, such as monotonically increasing IDs or random numbers, can lead to several issues:

1. Object identification: Objects in the Ontology are identified by their primary keys. Edits to objects can be lost if each build of the backing dataset generates new sets of IDs.
2. Change tracking: Tracking changes to datasets and rows becomes difficult if primary keys are not stable and reproducible.
3. Pipeline consistency: Incremental runs of pipelines producing primary keys or downstream pipelines depending on the dataset can lead to duplicates and other inconsistencies.

A good practice for creating primary keys is to use a combination of columns in the dataset that can uniquely identify each row. For example, in an attendance dataset, the combination of `student ID` and `date` columns can uniquely identify each row.

Below is an example code snippet to produce primary keys for a dataset where each row is uniquely identified by columns A, B, and C. The `concat_ws()` function is used for concatenation, and the `sha2()` function ensures the same length and format for each key optionally.

```python
from pyspark.sql import functions as F

# Concatenate all columns
df = df.withColumn("primary_key", F.concat_ws(":", "A", "B", "C"))

# Optionally create a hash to ensure the same length and format for all keys
df = df.withColumn("primary_key", F.sha2(F.col("primary_key"), 256))
```

By following these best practices, you can ensure that your primary keys are robust, stable, and effective for uniquely identifying rows in your datasets.

language: Python

* Date submitted: 2024-09-16
* Tags: `pyspark`, `dataframe`
