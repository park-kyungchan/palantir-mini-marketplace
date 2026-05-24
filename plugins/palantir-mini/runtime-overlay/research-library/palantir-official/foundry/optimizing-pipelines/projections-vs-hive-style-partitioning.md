---
sourceUrl: "https://www.palantir.com/docs/foundry/optimizing-pipelines/projections-vs-hive-style-partitioning/"
canonicalUrl: "https://palantir.com/docs/foundry/optimizing-pipelines/projections-vs-hive-style-partitioning/"
sourceLastmod: "2026-05-12T17:06:26.149Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "82d115ac1c5c28b3f1b125597c7eb8bde9cce6275d4562e12122710a8ea71ef4"
product: "foundry"
docsArea: "optimizing-pipelines"
locale: "en"
upstreamTitle: "Documentation | Dataset projections > Comparison with hive-style partitioning"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Comparison of projections and hive-style partitioning

The use cases for projections (in particular, filter-optimized projections) partially overlap with those for [hive-style partitioning](/docs/foundry/optimizing-pipelines/hive-style-partitioning/). This page outlines some of the key differences between the two techniques, which include:

* [Automatic compaction](#automatic-compaction) for projections
* [Immediate usability](#immediate-usability) for hive-style partitioning
* [Data content constraints](#data-content-constraints) for projections
* [Suitability for high-cardinality columns](#suitability-for-high-cardinality-columns)
* [Supported consumers](#supported-consumers)

## Automatic compaction

Projections are automatically compacted to prevent excessive incremental file build-up over time. There is no automatic compaction for datasets that are written with hive-style partitioning.

## Immediate usability

When a dataset is written with hive-style partitioning, readers will immediately benefit from optimized queries. However, because projection datasets are built asynchronously after the transaction is committed on the canonical dataset, a SNAPSHOT transaction on the canonical dataset will result in a period of time when readers do not benefit at all until the next projection build completes.

## Data content constraints

Datasets written with hive-style partitioning are typically written in the open Apache Parquet format, which does not impose any notable constraints on data content. However, filter-optimized projections use a proprietary format that has a few constraints (most notably, string columns with very long values are not supported).

## Suitability for high-cardinality columns

With hive-style partitioning, at least one file is written per unique value, so performing hive-style partitioning on a high-cardinality column will result in an excessive amount of output files. Filter-optimized projections are designed to handle high-cardinality columns well (especially timestamp columns in the context of timeseries data).

## Supported consumers

Spark, Polars, and other query engines can benefit from hive-style partitioning. However, only Spark (specifically Foundry Spark, the Spark version used within Foundry) is able to benefit from filter-optimized projections.

Additionally, code in Python or Java that uses the transforms filesystem APIs can leverage the information stored in file paths with hive-style partitioning to implement advanced custom optimizations. Projections are not exposed to user code in this way.
