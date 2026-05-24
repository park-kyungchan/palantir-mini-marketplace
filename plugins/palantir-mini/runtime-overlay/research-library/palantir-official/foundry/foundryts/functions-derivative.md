---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-derivative/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-derivative/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "536e496ff475bf024b9dd0016f8b0e64438890a191a04e31afada1f2daedfc8b"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.derivative"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.derivative

## foundryts.functions.derivative()

Returns a function that calculates the per-second value change for a single time series.

For every point in the time series, starting from the second point, output a tick with the derivative of the value
of the previous point in time. Each value is scaled to a per-second rate irrespective of the original frequency
at which the ticks are stored.

* **Returns:**
  A function that accepts a single time series as input and returns a time series with per-second derative values.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description            |
|---------------|------------------|------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point |
| value         | float            | Value of the point     |

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

:::callout{theme="success" title="See Also"}
[`integral()`](/docs/foundry/foundryts/functions-integral/#foundryts.functions.integral)
:::

## Examples

```pycon
>>> series = F.points(
...     (100, 100.0), (120, 200.0), (130, 230.0), (166, 266.0), (167, 366.0), name="series"
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000100  100.0
1 1970-01-01 00:00:00.000000120  200.0
2 1970-01-01 00:00:00.000000130  230.0
3 1970-01-01 00:00:00.000000166  266.0
4 1970-01-01 00:00:00.000000167  366.0
```

```pycon
>>> derivative_series = F.derivative()(series)
>>> derivative_series.to_pandas()
                      timestamp         value
0 1970-01-01 00:00:00.000000120  5.000000e+09
1 1970-01-01 00:00:00.000000130  3.000000e+09
2 1970-01-01 00:00:00.000000166  1.000000e+09
3 1970-01-01 00:00:00.000000167  1.000000e+11
```
