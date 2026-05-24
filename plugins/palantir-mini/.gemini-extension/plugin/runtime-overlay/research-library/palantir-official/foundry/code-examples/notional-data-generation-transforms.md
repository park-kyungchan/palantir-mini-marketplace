---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/notional-data-generation-transforms/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/notional-data-generation-transforms/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "cf29e2cfa184fbc890deffc3e154a951a48f863821a8bf76e0455fa48f9bc5fa"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | Notional data generation > Transforms"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transforms

## Python

### Notional data generation

How can I create fake data in a transform?

This code uses the synthesizer library to generate a random dataset with specified columns and data types.

```python
from transforms.api import transform_df, Output, configure
from synthesizer import DataFrameTransformOrchestrator
import pyspark.sql.functions as F


'''
Transform to generate data from scratch
Think about importing "synthetizer" library !
'''

ROW_SPEC = {
    "level_1": {
        "random_element": {
            "elements": list(range(0, 10))
        }
    },
    "level_2": {
        "random_element": {
            "elements": list(range(0, 20))
        }
    },
    "level_3": {
        "random_element": {
            "elements": list(range(0, 50))
        }
    },
    "level_4": {
        "random_element": {
            "elements": list(range(0, 100))
        }
    },
    "ThisIsFakeData": "first_name",
    "First_Name": "first_name",
    "Last_Name": "last_name",
    "Phone_Number": "phone_number",
    "Address_Contact": "address",
    "Birth_Date": {
        "date_time_between": {
            "start_date": "-80y",
            "end_date": "-3m"
        }
    },
    "Title": {
        "random_element": {
            "elements": ["Mr.", "Mrs.", "Ms.", "Dr."]
        }
    },
}


@transform_df(
    Output("/Palantir/awesome-foundry/[PipelineMocking] Dataset Generation/generated_data"),
)
def function_40(ctx):
    # Parameters
    ROW_COUNT = 10_000

    # Create a dataset generator
    orch = DataFrameTransformOrchestrator(
        ROW_SPEC,
        ROW_COUNT,
        ctx.spark_session
    )

    # Generate the dataset
    df = orch()

    # Create new columns, perform operations on it ...
    df = df.withColumn("pk", F.concat_ws("__", "level_1", "level_2", "level_3", "level_4"))

    return df
```

* Date submitted: 2024-03-26
* Tags: `code authoring`, `code repositories`, `data generation`, `unstructured`, `synthesizer`
