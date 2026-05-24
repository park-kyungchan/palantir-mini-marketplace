---
source: https://www.palantir.com/docs/foundry/code-examples/dataset-metadata-operations-code-repositories
fetched: 2026-04-20
section: dev-toolchain
doc_title: Dataset Metadata Operations (Code Repositories)
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

Code examplesDataset metadata operations[Code Repositories](/docs/foundry/code-examples/dataset-metadata-operations-code-repositories/)

Code Repositories
=================

Python
------

### Create stable primary keys in PySpark

This code uses the `concat_ws()` and `sha2()` functions in PySpark to create stable and unique primary keys by concatenating multiple columns and optionally hashing the result. This approach ensures that primary keys are robust, stable, and effective for uniquely identifying rows in datasets.

Primary keys should be unique, non-null, and stable. Using non-deterministic or unstable primary keys, such as monotonically increasing IDs or random numbers, can lead to several issues:

1. Object identification: Objects in the Ontology are identified by their primary keys. Edits to objects can be lost if each build of the backing dataset generates new sets of IDs.
2. Change tracking: Tracking changes to datasets and rows becomes difficult if primary keys are not stable and reproducible.
3. Pipeline consistency: Incremental runs of pipelines producing primary keys or downstream pipelines depending on the dataset can lead to duplicates and other inconsistencies.

A good practice for creating primary keys is to use a combination of columns in the dataset that can uniquely identify each row. For example, in an attendance dataset, the combination of `student ID` and `date` columns can uniquely identify each row.

Below is an example code snippet to produce primary keys for a dataset where each row is uniquely identified by columns A, B, and C. The `concat_ws()` function is used for concatenation, and the `sha2()` function ensures the same length and format for each key optionally.

```
Copied!

1
2
3
4
5
6
7
from pyspark.sql import functions as F

# Concatenate all columns
df = df.withColumn("primary_key", F.concat_ws(":", "A", "B", "C"))

# Optionally create a hash to ensure the same length and format for all keys
df = df.withColumn("primary_key", F.sha2(F.col("primary_key"), 256))
```

By following these best practices, you can ensure that your primary keys are robust, stable, and effective for uniquely identifying rows in your datasets.

* Language: Python
* Date submitted: 2024-09-16
* Tags: `pyspark`, `dataframe`

[←

PREVIOUSFunctions on objects / Functions on Objects](/docs/foundry/code-examples/functions-on-objects-functions-on-objects/)

[NEXTLocal environment

→](/docs/foundry/code-examples/dataset-metadata-operations-local-environment/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Code Repositories](#code-repositories)
  + [Python](#python)
