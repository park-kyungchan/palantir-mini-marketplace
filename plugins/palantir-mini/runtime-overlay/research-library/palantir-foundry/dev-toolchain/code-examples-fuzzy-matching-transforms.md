---
source: https://www.palantir.com/docs/foundry/code-examples/fuzzy-matching-transforms
fetched: 2026-04-20
section: dev-toolchain
doc_title: Fuzzy Matching (Transforms)
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

Code examplesFuzzy matching[Transforms](/docs/foundry/code-examples/fuzzy-matching-transforms/)

Transforms
==========

Python
------

### Fuzzy matching of entity names using phonetic codes

How do I perform fuzzy matching of entity names using phonetic codes in PySpark?

This code uses PySpark to clean entity names, generate phonetic codes, and perform fuzzy matching of entity names using the Jaro similarity metric. It is useful for matching similar entity names in two datasets.

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
from pyspark.sql import functions as F
from pyspark.sql import types as T
from transforms.api import transform_df, Input, Output
import re
import jellyfish


def _add_phonetic_codes(df):
    # Generate phonetic codes for each part of the name
    df = df.withColumn(
        "name_part", F.split("cleaned_name", " ")
    ).withColumn(
        "name_part", F.explode("name_part")
    ).withColumn(
        "phonetic_code", F.soundex("name_part")
    ).drop("name_part")
    return df


@transform_df(
    Output(),
    entities2=Input(),
    entities1=Input(),
)
def compute(sanctions, entities):

    # Set up UDF for cleaning text
    def clean_text(text):
        cleaned_text = re.sub(r" +", " ", re.sub(r"[./-]+", "", text)).lower()
        return cleaned_text

    clean_text_udf = F.udf(clean_text, T.StringType())

    # Clean entity name
    entities2 = entities2.withColumn("cleaned_name", clean_text_udf(F.col("name")))
    entities1 = entities1.withColumn("cleaned_name", clean_text_udf(F.col("entity_name")))

    # Add phonetic codes
    entities2 = _add_phonetic_codes(entities2)
    entities1 = _add_phonetic_codes(entities1)

    # Fuzzy join
    matched_entities = entities1.join(
        entities2, on=["phonetic_code"], how="inner"
    ).select(
        entities1.cleaned_name.alias("cleaned_name1"), entities1.id.alias("entity_id1")
        entities2.cleaned_name.alias("cleaned_name2"), entities2.id.alias("entity_id2")
    ).drop("phonetic_code")
    matched_entities = matched_entities.dropDuplicates()

    # Set up UDF for string comparison
    @F.udf()
    def jaro_compare(name1, name2):
        return jellyfish.jaro_similarity(name1, name2)

    # Fuzzy matching
    matched_entities = matched_entities.withColumn(
        "match_score", jaro_compare("cleaned_name1", "cleaned_name2")
    )
    matched_entities = matched_entities.filter(entities.match_score > 0.75)
    matched_entities = matched_entities.select("entity_id1", "entity_id2")
    return matched_entities
```

* Date submitted: 2024-05-23
* Tags: `pyspark`, `fuzzy matching`, `phonetic codes`, `jaro similarity`

[←

PREVIOUSGeospatial computation / Transforms](/docs/foundry/code-examples/geospatial-computation-transforms/)

[NEXTIncremental transforms / Transforms

→](/docs/foundry/code-examples/incremental-transforms-transforms/)

© 2026 Palantir Technologies Inc. All rights reserved.

[Cookies Statement ↗](https://www.palantir.com/cookie-statement/)[Privacy Statement ↗](https://www.palantir.com/privacy-and-security/)

Cookie Settings

Contents
--------

* [Transforms](#transforms)
  + [Python](#python)
