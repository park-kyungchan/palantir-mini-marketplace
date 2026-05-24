---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-integral/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-integral/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "1c6e7018f784f9f75f77e95621b02de6fa5f4f719e5dbba44756a3794c172923"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.integral"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.integral

## foundryts.functions.integral(method='LINEAR')

Returns a function that calculates the per-second integral for a single time series.

For every point in the time series, `(t_i, v_i)`, output a tick with the value equal to the integral of all
points up to that point (inclusive).

The integral is calculated using [↗ Reimann sums](https://en.wikipedia.org/wiki/Riemann_sum) for estimation. The
integration uses the `method` in the argument where supported options are:

| Method                      | Description                                                                                                                                                                                                                                                                                                                              |
|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| LHS                         | Left-Hand Sum (LHS) approximates the integral by summing the values at the<br/>beginning of each interval. It tends to underestimate for increasing trends and<br/>overestimate for decreasing trends. Assumes initial values are representative of<br/>the entire interval, useful when historical values strongly influence the total. |
| RHS                         | Right-Hand Sum (RHS) approximates the integral by summing the values at the end<br/>of each interval. It tends to overestimate for increasing trends and underestimate<br/>for decreasing trends. Assumes final values are indicative of the trend, useful<br/>when recent values are more reflective of the cumulative trend.           |
| > LINEAR<br/><br/>(default) | Trapezoidal Rule averages the values at the start and end of each interval. It<br/>provides a balanced approximation, reducing overestimation or underestimation.<br/>Useful for fluctuating trends as it accounts for both early and recent values.                                                                                     |

* **Parameters:**
  **method** ([*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Method used to estimate the integral value for a given point, valid options listed in table above
  (default is `LINEAR`).
* **Returns:**
  A function that accepts a single time series as input and returns a time series with per-second integral values.
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
[`derivative()`](/docs/foundry/foundryts/functions-derivative/#foundryts.functions.derivative)
:::

## Examples

```pycon
>>> series = F.points(
...     (1000, 1.0), (3000, 3.0), (5000, 0.0), (6000, 5.0), (8000, -7.0),
...     name="series"
... )
>>> series.to_pandas()
                   timestamp  value
0 1970-01-01 00:00:00.000001    1.0
1 1970-01-01 00:00:00.000003    3.0
2 1970-01-01 00:00:00.000005    0.0
3 1970-01-01 00:00:00.000006    5.0
4 1970-01-01 00:00:00.000008   -7.0
```

```pycon
>>> linear_integral = F.integral(method="LINEAR")(series)
>>> linear_integral.to_pandas()
                   timestamp     value
0 1970-01-01 00:00:00.000001  0.000000
1 1970-01-01 00:00:00.000003  0.000004
2 1970-01-01 00:00:00.000005  0.000007
3 1970-01-01 00:00:00.000006  0.000009
4 1970-01-01 00:00:00.000008  0.000007
```

```pycon
>>> lhs_integral = F.integral(method="LHS")(series)
>>> lhs_integral.to_pandas()
                   timestamp     value
0 1970-01-01 00:00:00.000001  0.000000
1 1970-01-01 00:00:00.000003  0.000002
2 1970-01-01 00:00:00.000005  0.000008
3 1970-01-01 00:00:00.000006  0.000008
4 1970-01-01 00:00:00.000008  0.000018
```

```pycon
>>> rhs_integral = F.integral(method="RHS")(series)
>>> rhs_integral.to_pandas()
                   timestamp     value
0 1970-01-01 00:00:00.000001  0.000000
1 1970-01-01 00:00:00.000003  0.000006
2 1970-01-01 00:00:00.000005  0.000006
3 1970-01-01 00:00:00.000006  0.000011
4 1970-01-01 00:00:00.000008 -0.000003
```
