---
source: https://www.palantir.com/docs/foundry/foundryts/functions-first-point/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.first_point
---

# foundryts.functions.first_point

```python
foundryts.functions.first_point()
```

Returns a function that extracts the earliest point from a single time series. Returns an empty summary when the series is empty.

**Returns:** `(FunctionNode) -> SummarizerNode`

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| timestamp | pandas.Timestamp | Timestamp of the first point |
| value | Union[float, str] | Value of the first point |

## Example

```python
>>> series = F.points((1, 0.0), (101, 10.2), (200, 11.3), (123450, 11.8))
>>> F.first_point()(series).to_pandas()
# timestamp: 1970-01-01 00:00:00.000000001   value: 0.0
```

**See also:** `last_point()`, `time_extent()`
