---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/external-transforms-transforms/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/external-transforms-transforms/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "dac172535ab22e8cb075ccca77472ed36d0a897ff446aac91b74b978f6784ac5"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | External transforms > Transforms"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transforms

## Python

### Fetch and update data incrementally from API using PySpark

How do I fetch data from an API and update it incrementally using external transforms?

This code uses PySpark and the requests library to fetch data from an API between a specified date range and update the output incrementally. It additionally supports paging if the API also supports paging.

```python
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
