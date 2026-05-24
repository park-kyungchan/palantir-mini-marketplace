---
source: https://www.palantir.com/docs/foundry/code-examples/external-transforms-transforms
fetched: 2026-04-20
section: dev-toolchain
doc_title: External Transforms (Transforms)
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

Code examplesExternal transforms[Transforms](/docs/foundry/code-examples/external-transforms-transforms/)

Transforms
==========

Python
------

### Fetch and update data incrementally from API using PySpark

How do I fetch data from an API and update it incrementally using external transforms?

This code uses PySpark and the requests library to fetch data from an API between a specified date range and update the output incrementally. It additionally supports paging if the API also supports paging.

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
from pyspark.sql import functions as F
from transforms.api import incremental, transform, Output
import requests
from transforms.external.systems import EgressPolicy, use_external_systems, Credential
import logging
from datetime import datetime as dt
import json


def _get_data(token, start_date, end_date, next_link_url='<YOUR_URL>'):
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}

    data = {
        "from": start_date,
        "to": end_date,
    }
    response = requests.post(next_link_url, json=data, headers=headers)
    logging.warn(response.json())
    data = response.json()["data"]
    return json.dumps(data)


@use_external_systems(
    creds=Credential(),
    egress=EgressPolicy(),
)
@incremental()
@transform(
    output=Output(),
)
def compute(output, creds, egress, ctx):
    token = creds.get("token")
    if ctx.is_incremental:
        previous = output.dataframe('current').localCheckpoint()
        if NEXT_LINK_COLUMN in previous.columns:
            latest_row = (
                previous
                .where(F.col(LAST_MODIFIED_COLUMN).isNotNull())
                .orderBy([F.col(REQUEST_TIMESTAMP_COLUMN).desc(), F.col(LAST_MODIFIED_COLUMN).desc()])
                .limit(1).collect()[0]
            )
            next_link_url = latest_row[NEXT_LINK_COLUMN]
            last_date = latest_row[LAST_MODIFIED_COLUMN]
        else:
            last_date = previous.orderBy(F.col(LAST_MODIFIED_COLUMN).desc()).limit(1).collect()[0][LAST_MODIFIED_COLUMN]
    
    today = dt.today().strftime("%Y-%m-%d")
    
    data = _get_data(token, last_date, today, next_link_url)
    
    df = ctx.spark_session.createDataFrame([{'date': last_date, 'data': data}])
    output.set_mode("modify")
    output.write_dataframe(df)
```

* Date submitted: 2024-04-26
* Tags: `API`, `pyspark`, `incremental`, `dataframe`, `external transform`

[←

PREVIOUSFoundry APIs / Local environment](/docs/foundry/code-examples/foundry-apis-local-environment/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Transforms](#transforms)
  + [Python](#python)
