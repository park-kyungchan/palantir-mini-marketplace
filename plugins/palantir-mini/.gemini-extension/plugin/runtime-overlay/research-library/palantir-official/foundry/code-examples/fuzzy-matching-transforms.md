---
sourceUrl: "https://www.palantir.com/docs/foundry/code-examples/fuzzy-matching-transforms/"
canonicalUrl: "https://palantir.com/docs/foundry/code-examples/fuzzy-matching-transforms/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f68c0feabb3e29455781b52761b629a3e01276c2bd2cc204a931092fac4c9200"
product: "foundry"
docsArea: "code-examples"
locale: "en"
upstreamTitle: "Documentation | Fuzzy matching > Transforms"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transforms

## Python

### Fuzzy matching of entity names using phonetic codes

How do I perform fuzzy matching of entity names using phonetic codes in PySpark?

This code uses PySpark to clean entity names, generate phonetic codes, and perform fuzzy matching of entity names using the Jaro similarity metric. It is useful for matching similar entity names in two datasets.

```python
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
