---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-series/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-series/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f2f0d6664317b033eb119ed31d2e6b26c748c2355fffe909716d503b7252ca2f"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.series"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.series

## foundryts.functions.series(\*args)

Creates a reference to all input time series that operations can be applied on.

Each input time series ID is translated to an element in a `NodeCollection` where each element
is just a reference to the existing time series in the Foundry ecosystem.

* **Parameters:**
  **\*args** (

  ```
  *
  ```

  str) – Args for all time series IDs to use for creating time series references in the `NodeCollection`.
* **Returns:**
  A \:py:class\`NodeCollection\` of all the time series IDs passed.
* **Return type:**
  py\:class:

  ```
  `
  ```

  NodeCollection

## Dataframe schema

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| series        | str               | Time series ID         |
| timestamp     | pandas.Timestamp  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

:::callout{theme="success" title="See Also"}
[`points()`](/docs/foundry/foundryts/functions-points/#foundryts.functions.points)
:::

## Examples

```pycon
>>> altimeter_series = F.series(
...     "altimeter_aircraft-1",
...     "altimeter_aircraft-2",
... )
>>> altimeter_series.to_pandas()
                   series               timestamp     value
0    altimeter_aircraft-1 2024-09-06 07:00:00.000 -1.185493
1    altimeter_aircraft-1 2024-09-06 07:01:30.983  0.830117
2    altimeter_aircraft-1 2024-09-06 07:03:01.966  0.115240
3    altimeter_aircraft-1 2024-09-06 07:04:32.949  0.059973
4    altimeter_aircraft-1 2024-09-06 07:06:03.932 -0.290032
..                    ...                     ...       ...
495  altimeter_aircraft-2 2024-09-06 19:30:36.585  1.204543
496  altimeter_aircraft-2 2024-09-06 19:32:07.568 -1.183036
497  altimeter_aircraft-2 2024-09-06 19:33:38.551  0.216189
498  altimeter_aircraft-2 2024-09-06 19:35:09.534 -0.854239
499  altimeter_aircraft-2 2024-09-06 19:36:40.517  0.312806
```
