---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-time-extent/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-time-extent/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "460fb68ff90f5d61216c2ad893c41aa22f890a2ebe7abbcbe368b30b0ebf0f4f"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.time_extent"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.time\_extent

## foundryts.functions.time\_extent()

Returns a function that extracts the time extent (earliest and latest timestamps) of a single time series.

The returned function computes the time extent by identifying the range from the first to the last timestamp
in the given time series.

* **Returns:**
  A function that accepts a single time series and returns its time extent. The dataframe contains a single row
  with the time extent.
* **Return type:**
  ([FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)) -> SummarizerNode

## Dataframe schema

| Column name               | Type             | Description                                 |
|---------------------------|------------------|---------------------------------------------|
| extent.earliest\_timestamp | pandas.Timestamp | Timestamp of the first point in the series. |
| extent.latest\_timestamp   | pandas.Timestamp | Timestamp of the last point in the series.  |

## Examples

```pycon
>>> series = F.points(
...     (1, 0.0),
...     (101, 10.2),
...     (200, 11.3),
...     (123450, 11.8),
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    0.0
1 1970-01-01 00:00:00.000000101   10.2
2 1970-01-01 00:00:00.000000200   11.3
3 1970-01-01 00:00:00.000123450   11.8
```

```pycon
>>> time_ext = F.time_extent()(series)
>>> time_ext.to_pandas()
      extent.earliest_timestamp       extent.latest_timestamp
0 1970-01-01 00:00:00.000000001 1970-01-01 00:00:00.000123450
```
