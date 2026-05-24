---
sourceUrl: "https://www.palantir.com/docs/foundry/iceberg/changelogs/"
canonicalUrl: "https://palantir.com/docs/foundry/iceberg/changelogs/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "66191210029dda3cad11ee758232902258e6f24131901380a2d77e306622acca"
product: "foundry"
docsArea: "iceberg"
locale: "en"
upstreamTitle: "Documentation | Changelogs and CDC > Overview"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Iceberg changelogs and CDC pipelines

Foundry transforms make it easy to build robust, scalable Change Data Capture (CDC) pipelines leveraging Apache Iceberg’s changelog and snapshot features. You can use CDC in transforms to efficiently process new, updated, or deleted records since the last pipeline run, enabling efficient, incremental, low-latency data movement and processing.

In addition to existing support for append-only [incremental transforms](/docs/foundry/transforms-python/incremental-overview/) on datasets, Foundry now offers full CDC processing support for Iceberg tables as part of the `transforms-tables` library. This capability leverages Iceberg’s [changelog views ↗](https://iceberg.apache.org/docs/nightly/spark-procedures/#create_changelog_view) to retrieve inserts, updates, and deletes between Iceberg table snapshots.

## Benefits of CDC processing

Using CDC with Iceberg tables offers a number of benefits including:

* **Efficient incremental processing:** CDC avoids reprocessing the entire dataset on every run, improving performance and reducing costs.
* **Streaming and real-time pipelines:** CDC enables low-latency data movement by processing only new and changed records.
* **Audit and slowly changing dimensions (SCD):** CDC lets you track before/after changes for full audit trails or SCD Type 2 implementations.

## Quick start: using changelog views in Python transforms

You can use the Palantir transforms API to read and write changelogs from Iceberg tables:

```python
from transforms.api import incremental, transform
from transforms.tables import TableInput, TableOutput

@incremental(v2_semantics=True)
@transform(
    source=TableInput("<PATH>/your_iceberg_input_table"),
    output=TableOutput("<PATH>/your_iceberg_output_table"),
)
def cdc_transform(ctx, source, output):
    # Read only the changes since the last run
    changelog_df = source.changelog(["your_primary_key"])
    # Apply your business logic to the changelog
    output.apply_changelog(changelog_df, ["your_primary_key"])
```

For more detailed guides and examples, see the next sections with changelog [code examples](/docs/foundry/iceberg/changelog-code-examples/) and a [technical primer](/docs/foundry/iceberg/changelog-primer/), including a walkthrough of an example with no primary keys in the input.
