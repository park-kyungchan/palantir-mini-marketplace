---
source: https://www.palantir.com/docs/foundry/code-examples/notional-data-generation-transforms
fetched: 2026-04-20
section: dev-toolchain
doc_title: Notional Data Generation (Transforms)
---

- Documentation

  * [Documentation](/docs/foundry/)
  * [Apollo](/docs/apollo/)
  * [Gotham](/docs/gotham/)

Search

+

K

[API Reference ↗](/docs/foundry/api-reference/)Send feedback

en

enjpkrzh

ABXY

ABXYABXYABXYABXYABXYABXY

* Capabilities

  + [AI Platform (AIP)](/docs/foundry/aip/overview/)
  + [Data connectivity & integration](/docs/foundry/data-integration/overview/)
  + [Model connectivity & development](/docs/foundry/model-integration/overview/)
  + [Ontology building](/docs/foundry/ontology/overview/)
  + [Developer toolchain](/docs/foundry/dev-toolchain/overview/)
  + [Use case development](/docs/foundry/app-building/overview/)
  + [Observability](/docs/foundry/observability/overview/)
  + [Analytics](/docs/foundry/analytics/overview/)
  + [Product delivery](/docs/foundry/devops/overview/)
  + [Security & governance](/docs/foundry/security/overview/)
  + [Management & enablement](/docs/foundry/administration/overview/)
* [Getting started](/docs/foundry/getting-started/overview/)
* [Architecture center](/docs/foundry/architecture-center/overview/)
* Platform updates

  + [Announcements](/docs/foundry/announcements/)
  + [Release notes](/docs/foundry/announcements/release-notes/)

* Product QAs

  + [Automate](/docs/foundry/questions-answers/automate/)
  + [Builds](/docs/foundry/questions-answers/builds/)
  + [Carbon (Community)](/docs/foundry/questions-answers/carbon-community/)
  + [Code Repositories](/docs/foundry/questions-answers/code-repositories/)
  + [Code Repositories (Community)](/docs/foundry/questions-answers/code-repositories-community/)
  + [Code Workspaces](/docs/foundry/questions-answers/code-workspaces/)
  + [Code Workspaces (Community)](/docs/foundry/questions-answers/code-workspaces-community/)
  + [Contour](/docs/foundry/questions-answers/contour/)
  + [Contour (Community)](/docs/foundry/questions-answers/contour-community/)
  + [Data Connection](/docs/foundry/questions-answers/data-connection/)
  + [Foundry Metadata (Community)](/docs/foundry/questions-answers/foundry-metadata-community/)
  + [Functions](/docs/foundry/questions-answers/functions/)
  + [Functions (Community)](/docs/foundry/questions-answers/functions-community/)
  + [Linter](/docs/foundry/questions-answers/linter/)
  + [Media sets](/docs/foundry/questions-answers/media-sets/)
  + [Media sets (Community)](/docs/foundry/questions-answers/media-sets-community/)
  + [Notepad](/docs/foundry/questions-answers/notepad/)
  + [Notifications (Community)](/docs/foundry/questions-answers/notifications-community/)
  + [Object Views (Community)](/docs/foundry/questions-answers/object-views-community/)
  + [Ontology](/docs/foundry/questions-answers/ontology/)
  + [Ontology SDK](/docs/foundry/questions-answers/ontology-sdk/)
  + [Pipeline Builder](/docs/foundry/questions-answers/pipeline-builder/)
  + [Pipeline Builder (Community)](/docs/foundry/questions-answers/pipeline-builder-community/)
  + [Projects (Community)](/docs/foundry/questions-answers/projects-community/)
  + [Quiver](/docs/foundry/questions-answers/quiver/)
  + [Quiver (Community)](/docs/foundry/questions-answers/quiver-community/)
  + [Slate](/docs/foundry/questions-answers/slate/)
  + [Streaming](/docs/foundry/questions-answers/streaming/)
  + [Vertex](/docs/foundry/questions-answers/vertex/)
  + [Webhooks](/docs/foundry/questions-answers/webhooks/)
  + [Workshop](/docs/foundry/questions-answers/workshop/)
  + [Workshop (Community)](/docs/foundry/questions-answers/workshop-community/)
* Code examples

  + Notional data generation

    - [Transforms](/docs/foundry/code-examples/notional-data-generation-transforms/)
  + Raw file parsing

    - [Functions on Objects](/docs/foundry/code-examples/raw-file-parsing-functions-on-objects/)
    - [Transforms](/docs/foundry/code-examples/raw-file-parsing-transforms/)
  + Functions on objects

    - [Functions on Objects](/docs/foundry/code-examples/functions-on-objects-functions-on-objects/)
  + Dataset metadata operations

    - [Code Repositories](/docs/foundry/code-examples/dataset-metadata-operations-code-repositories/)
    - [Local environment](/docs/foundry/code-examples/dataset-metadata-operations-local-environment/)
  + Graph and tree structured datasets

    - [Transforms](/docs/foundry/code-examples/graph-and-tree-structured-datasets-transforms/)
    - [Functions on Objects](/docs/foundry/code-examples/graph-and-tree-structured-datasets-functions-on-objects/)
  + Common operations

    - [Code Repositories](/docs/foundry/code-examples/common-operations-code-repositories/)
    - [Transforms](/docs/foundry/code-examples/common-operations-transforms/)
    - [Functions on Objects](/docs/foundry/code-examples/common-operations-functions-on-objects/)
  + Geospatial computation

    - [Transforms](/docs/foundry/code-examples/geospatial-computation-transforms/)
  + Fuzzy matching

    - [Transforms](/docs/foundry/code-examples/fuzzy-matching-transforms/)
  + Incremental transforms

    - [Transforms](/docs/foundry/code-examples/incremental-transforms-transforms/)
  + Foundry APIs

    - [Local environment](/docs/foundry/code-examples/foundry-apis-local-environment/)
  + External transforms

    - [Transforms](/docs/foundry/code-examples/external-transforms-transforms/)

Code examplesNotional data generation[Transforms](/docs/foundry/code-examples/notional-data-generation-transforms/)

Transforms
==========

Python
------

### Notional data generation

How can I create fake data in a transform?

This code uses the synthesizer library to generate a random dataset with specified columns and data types.

```
Copied!

1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
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

[←

PREVIOUSProduct QAs / Workshop (Community)](/docs/foundry/questions-answers/workshop-community/)

[NEXTRaw file parsing / Functions on Objects

→](/docs/foundry/code-examples/raw-file-parsing-functions-on-objects/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Transforms](#transforms)
  + [Python](#python)
