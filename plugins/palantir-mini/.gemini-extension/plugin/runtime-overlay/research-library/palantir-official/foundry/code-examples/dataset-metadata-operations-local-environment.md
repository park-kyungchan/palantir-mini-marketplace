---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/dataset-metadata-operations-local-environment/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/dataset-metadata-operations-local-environment/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1187c985600e28c5cd5d7fe7d4ad1fe808a11e8750110bdac4cdcd785f12bf3d"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | Dataset metadata operations > Local environment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Local environment

## Python

### Dataset row count

How can I calculate in bulk the number of rows in many datasets?

This code uses the Foundry API to trigger row count computation for a list of dataset RIDs. It sends a POST request to the Foundry Stats API with the dataset RID and branch as parameters.

```python
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

```python

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

```python
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
