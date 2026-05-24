---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-first-point/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-first-point/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5fb74c0c32c91ca94209e7b4072105a5655b6de05f7136f3e3a7dc523d303ac0"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.first_point"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.first\_point

## foundryts.functions.first\_point()

Returns a function that extracts the earliest point for a single time series.

The returned point is the first occuring point within the range of a given time series.
Returns an empty summary when the series is empty.

* **Returns:**
  A function that accepts a single time series and returns the first point in the provided series. The dataframe
  contains a single row with the first point.
* **Return type:**
  ([FunctionNode](/docs/foundry/foundryts/nodes-function-node/#foundryts.nodes.FunctionNode)) -> SummarizerNode

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="success" title="See Also"}
[`time_extent()`](/docs/foundry/foundryts/functions-time-extent/#foundryts.functions.time_extent), [`last_point()`](/docs/foundry/foundryts/functions-last-point/#foundryts.functions.last_point)
:::

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
>>> fp = F.first_point()(series)
>>> fp.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    0.0
```
