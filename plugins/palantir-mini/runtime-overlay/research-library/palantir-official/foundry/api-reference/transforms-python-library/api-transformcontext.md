---
sourceUrl: "https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transformcontext/"
canonicalUrl: "https://palantir.com/docs/foundry/api-reference/transforms-python-library/api-transformcontext/"
sourceLastmod: "2026-05-12T17:06:26.167Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d58ef700168139f097754181abd11128241977dec2be7e3f17db6152347d1b57"
product: "foundry"
docsArea: "api-reference"
locale: "en"
upstreamTitle: "Documentation | transforms.api > TransformContext"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# transforms.api.TransformContext

## *class* transforms.api.TransformContext(foundry\_connector, parameters=None, environment={}) {#transforms.api.TransformContext}

A context object that can optionally be injected into the compute function of a transform.

Can be accessed by adding a `ctx` argument to the compute function as shown below:

```python
>>> @transform.using(...)
... def compute(ctx, ...):
...     ...
```

### abort\_job() {#transforms.api.TransformContext.abort\_job}

Aborts the job and ends execution. This will abort all output transactions.

### *property* auth\_header {#transforms.api.TransformContext.auth\_header}

The auth header used to run the transform.

* **Type:**
  [str ↗](https://docs.python.org/3/library/stdtypes.html#str)

### *property* environment {#transforms.api.TransformContext.environment}

The list of solved conda packages.

* **Type:**
  List\[[str ↗](https://docs.python.org/3/library/stdtypes.html#str)]

### *property* fallback\_branches {#transforms.api.TransformContext.fallback\_branches}

The fallback branches configured when running the transform.

* **Type:**
  List\[[str ↗](https://docs.python.org/3/library/stdtypes.html#str)]

### *property* parameters {#transforms.api.TransformContext.parameters}

Transform parameters.

* **Type:**
  [dict ↗](https://docs.python.org/3/library/stdtypes.html#dict) of ([str ↗](https://docs.python.org/3/library/stdtypes.html#str), any)

### *property* spark\_session {#transforms.api.TransformContext.spark\_session}

The Spark session used to run the transform.

* **Type:**
  [pyspark.sql.SparkSession ↗](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.SparkSession.html#pyspark.sql.SparkSession)
