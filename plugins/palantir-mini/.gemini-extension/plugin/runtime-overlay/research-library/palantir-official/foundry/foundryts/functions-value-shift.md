---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-value-shift/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-value-shift/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f8deb13b40d0d1201efc63391157ef98c7db93c456cdf000d98f92674fd421b5"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.value_shift"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.value\_shift

## foundryts.functions.value\_shift(delta)

Returns a function that shifts all values of a single time series by the specified delta.

For a source time series with points `(timestamp, value)`, upon shifting by `delta`,
the resulting value-shifted time series will have points `(timestamp, value + delta)`.

* **Parameters:**
  **delta** ([*int*](https://docs.python.org/3/library/functions.html#int)) – The amount by which to shift the value of each point.
* **Returns:**
  A function that accepts a single time series as input and returns the value-shifted time series.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description                |
|---------------|------------------|----------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point     |
| value         | float            | Shifted value of the point |

:::callout{theme="success" title="See Also"}
[`timestamp_scale()`](/docs/foundry/foundryts/functions-timestamp-scale/#foundryts.functions.timestamp_scale), [`time_shift()`](/docs/foundry/foundryts/functions-time-shift/#foundryts.functions.time_shift)
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
>>> value_shifted = F.value_shift(3.0)(series)
>>> value_shifted.to_pandas()
                      timestamp    value
0 1970-01-01 00:00:00.000000100  3.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  6.14159
3 1970-01-01 00:00:02.147483647  4.00000
```

```pycon
>>> negative_value_shifted = F.value_shift(-3.0)(series)
>>> negative_value_shifted.to_pandas()
                      timestamp    value
0 1970-01-01 00:00:00.000000100 -3.00000
1 1970-01-01 00:00:00.000000200      inf
2 1970-01-01 00:00:00.000000300  0.14159
3 1970-01-01 00:00:02.147483647 -2.00000
```
