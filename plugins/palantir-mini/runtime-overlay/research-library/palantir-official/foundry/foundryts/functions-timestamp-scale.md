---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-timestamp-scale/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-timestamp-scale/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7301a32235b6b1eb9bf84acf82b2869616b3c321deadcc552283c4a82822ea9d"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.timestamp_scale"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.timestamp\_scale

## foundryts.functions.timestamp\_scale(factor)

(DEPRECATED) Returns a function that multiplies each timestamp of a single time series by the specified integer
factor.

For a source time series with points `(timestamp, value)`, upon scaling by `factor`,
the resulting time-scaled time series will have points `(timestamp * factor, value)`.

* **Parameters:**
  **factor** ([*int*](https://docs.python.org/3/library/functions.html#int)) – The scaling factor that is multiplied with each timestamp in the series.
* **Returns:**
  A function that accepts a single time series as input and returns the time-scaled time series.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description               |
|---------------|------------------|---------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point    |
| value         | float            | Scaled value of the point |

:::callout{theme="success" title="See Also"}
[`scale()`](/docs/foundry/foundryts/functions-scale/#foundryts.functions.scale), [`time_shift()`](/docs/foundry/foundryts/functions-time-shift/#foundryts.functions.time_shift), [`value_shift()`](/docs/foundry/foundryts/functions-value-shift/#foundryts.functions.value_shift)
:::

:::callout{theme="warning" title="Note"}
This operation is deprecated and performs a no-op, leaving the resulting time series unchanged. This function will
be removed from future releases.

The backend will automatically unify different time-units to the same
unit.
:::

## Examples

```pycon
>>> series = F.points(
...     (1, 1.0),
...     (101, 2.0),
...     (200, 4.0),
...     (201, 8.0),
...     name="series",
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    1.0
1 1970-01-01 00:00:00.000000101    2.0
2 1970-01-01 00:00:00.000000200    4.0
3 1970-01-01 00:00:00.000000201    8.0
```

```pycon
>>> timescaled_series = F.timestamp_scale(99)(series) # NO-OP, DEPRECATED OPERATION
>>> timescaled_series.to_pandas() # resulting series is unchanged
                      timestamp  value
0 1970-01-01 00:00:00.000000001    1.0
1 1970-01-01 00:00:00.000000101    2.0
2 1970-01-01 00:00:00.000000200    4.0
3 1970-01-01 00:00:00.000000201    8.0
```
