---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-scale/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-scale/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "df953ed8899049d725a49a078bd3b0b35b4248ef04dd5da30c9b7608b09a9f3c"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.scale"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.scale

## foundryts.functions.scale(factor)

Returns a function that multiplies each value in a single time series by the specified factor.

For a source time series with points `(timestamp, value)`, upon scaling by `factor`,
the resulting scaled time series will have points `(timestamp, value * factor)`.

* **Parameters:**
  **factor** ([*float*](https://docs.python.org/3/library/functions.html#float)) – The scaling factor that is multiplied with the value of each point.
* **Returns:**
  A function that accepts a single time series as input and returns the scaled time series.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description               |
|---------------|------------------|---------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point    |
| value         | float            | Scaled value of the point |

:::callout{theme="success" title="See Also"}
[`timestamp_scale()`](/docs/foundry/foundryts/functions-timestamp-scale/#foundryts.functions.timestamp_scale), [`value_shift()`](/docs/foundry/foundryts/functions-value-shift/#foundryts.functions.value_shift)
:::

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series = F.points(
...     (100, 0.0),
...     (200, float("inf")),
...     (300, 3.14159),
...     (2147483647, 1.0),
...     name="series"
... )
>>> series.to_pandas()
                      timestamp    value
0 1970-01-01 00:00:00.000000100  0.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  3.14159
3 1970-01-01 00:00:02.147483647  1.00000
```

```pycon
>>> scaled = F.scale(1.5)(series)
>>> scaled.to_pandas()
                      timestamp     value
0 1970-01-01 00:00:00.000000100  0.000000
1 1970-01-01 00:00:00.000000200       inf
2 1970-01-01 00:00:00.000000300  4.712385
3 1970-01-01 00:00:02.147483647  1.500000
```
