---
source: https://www.palantir.com/docs/foundry/foundryts/functions-last-point/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.last_point
---

# foundryts.functions.last_point

```python
foundryts.functions.last_point()
```

Returns a function that extracts the latest point from a single time series. Returns an empty summary when the series is empty.

**Returns:** `(FunctionNode) -> SummarizerNode`

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| timestamp | pandas.Timestamp | Timestamp of the last point |
| value | Union[float, str] | Value of the last point |

## Example

```python
>>> series = F.points((1, 0.0), (101, 10.2), (200, 11.3), (123450, 11.8))
>>> F.last_point()(series).to_pandas()
# timestamp: 1970-01-01 00:00:00.000123450   value: 11.8
```

**See also:** `first_point()`, `time_extent()`
