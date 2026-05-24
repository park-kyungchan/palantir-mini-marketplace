---
source: https://www.palantir.com/docs/foundry/code-examples/dataset-metadata-operations-local-environment
fetched: 2026-04-20
section: dev-toolchain
doc_title: Dataset Metadata Operations (Local Environment)
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

Code examplesDataset metadata operations[Local environment](/docs/foundry/code-examples/dataset-metadata-operations-local-environment/)

Local environment
=================

Python
------

### Dataset row count

How can I calculate in bulk the number of rows in many datasets?

This code uses the Foundry API to trigger row count computation for a list of dataset RIDs. It sends a POST request to the Foundry Stats API with the dataset RID and branch as parameters.

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
from shutil import ExecError
from wsgiref import headers
import requests
from urllib3 import Retry
import json
import pprint

'''
Script will trigger row count computation on the set of provided dataset rids
'''

# Base variables
base_url = "https://STACK_NAME.palantircloud.com"
branch = "master"

DATASETS_RIDS = [
    "ri.foundry.main.dataset.6d2cd3de-0052-xxxxx-c7ae2c4ab1d8"
]

headers = {
    'Authorization': 'Bearer eyg_PUT_YOUR_TOKEN_HERE_xxxx',
    'Content-Type': 'application/json'
}

# Proxies
proxyDict = {
    # "https": "https://proxyIfNeeded:port"
}

# Retries
retry = Retry(connect=1, backoff_factor=0.5)
adapter = requests.adapters.HTTPAdapter(max_retries=retry)
http = requests.Session()
http.mount("https://", adapter)

def trigger_row_count(dataset_rid, branch):
    response = http.post(f'{base_url}/foundry-stats/api/stats/datasets/{dataset_rid}/branches/{branch}', headers=headers,
                         proxies=proxyDict)
    raw_response = response.text
    curr_response = json.loads(raw_response)
    pprint.pprint(curr_response)

    return curr_response

for curr_dataset_rid in DATASETS_RIDS :
    trigger_row_count(curr_dataset_rid, branch)
```

* Date submitted: 2024-03-26
* Tags: `export`, `python`, `metrics`, `metadata`, `local`

### Get superset of columns across datasets

How can I get the set of all columns across multiple datasets?

This code uses the requests library to fetch the schema of each dataset in a list of target datasets, and then iterates through the fields in the schema to create a dictionary containing the frequency of each column in the superset of columns.

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
import time

from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import requests
import json
import pprint
import logging
import datetime
import collections


'''
Script that generates the superset of columns with their frequency from a set of datasets
'''

headers = {
    'Authorization': 'Bearer eyg_PUT_YOUR_TOKEN_HERE_xxxx',
    'Content-Type': 'application/json',
}

## STACK_NAME
base_url = "STACK_NAME.palantircloud.com"
branch = "master"


target_datasets = ["ri.foundry.main.dataset.4c2ac089-xxxx-4df863eaf823"]

# Proxies
proxyDict = {
    #"https": "https://proxyIfNeeded:port"
}

# Retries
retry = Retry(connect=1, backoff_factor=0.5)
adapter = HTTPAdapter(max_retries=retry)
http = requests.Session()
http.mount("https://", adapter)


global_list_fields = {}

for curr_dataset in target_datasets :
    # Get schema of the dataset
    print(f"Step 1. Get Schema of dataset")
    response = http.get(f'{base_url}/foundry-metadata/api/schemas/datasets/{curr_dataset}/branches/{branch}', headers=headers, proxies=proxyDict)
    print(f"Step 1. Response of getting schema of dataset")
    raw_response = response.text
    print(raw_response)
    curr_schema = json.loads(raw_response)
    list_fields = curr_schema["schema"]["fieldSchemaList"]

    for field in list_fields:
        curr_key = f"{field['name']} - {field['type']}"
        # Increment counter
        global_list_fields[curr_key] = global_list_fields.get(curr_key, 0) + 1

print("Unsorted dict")
pprint.pprint(global_list_fields)

# Sort it
sorted_dict = {k: v for k, v in sorted(global_list_fields.items(), key=lambda item: item[1])}
print("Sorted dict")
pprint.pprint(sorted_dict)
```

* Date submitted: 2024-03-26
* Tags: `python`, `API`, `metadata`, `code repositories`, `code authoring`, `local`

### Get the path for a given resource RID

How can I find the path of a resource from its RID?

This code uses the requests library to send an HTTP GET request to the specified host with the given RID, and retrieves the path of the resource. It also handles retries and proxies.

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
from requests.adapters import HTTPAdapter
import requests
from urllib3 import Retry

'''
Script to return the path of a given Resource IDentifier (RID).
'''

# Headers
headers = {
    'Authorization': 'Bearer xxx', # Replace 'xxx' with your bearer token
    'Content-Type': 'application/json',
}

# Host
host = 'host.com:443'

# Proxies
proxyDict = {
    'https': 'http://proxy.domain.com:3333'
}

# Retries
retry = Retry(connect=1, backoff_factor=0.5)
adapter = HTTPAdapter(max_retries=retry)
http = requests.Session()
http.mount('https://', adapter)

# Enter the rid of the resource you want the path of
RESOURCE_RID = ''

# Throw an error if the reference has failed to be created
try:
    print(f'Fetching path for rid {RESOURCE_RID} ...')
    response = http.get(f'https://{host}/compass/api/resources/{RESOURCE_RID}/path-json', headers=headers, proxies=proxyDict)
    print('Completed request')
    print(f'The path is: {response.text}')
except requests.exceptions.RequestException as e:
    raise Exception(f"An error occurred in the request.\nReturning the path for the repository: {RESOURCE_RID} failed due to: {response.status_code} - {response.text}\nException: {e}")
```

* Date submitted: 2024-03-26
* Tags: `api`, `python`, `metadata`, `local`

[←

PREVIOUSCode Repositories](/docs/foundry/code-examples/dataset-metadata-operations-code-repositories/)

[NEXTGraph and tree structured datasets / Transforms

→](/docs/foundry/code-examples/graph-and-tree-structured-datasets-transforms/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Local environment](#local-environment)
  + [Python](#python)
