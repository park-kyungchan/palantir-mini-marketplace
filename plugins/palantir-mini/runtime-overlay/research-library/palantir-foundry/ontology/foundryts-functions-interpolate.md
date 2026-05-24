---
source: https://www.palantir.com/docs/foundry/foundryts/functions-interpolate/
fetched: 2026-04-20
section: ontology-deep
doc_title: foundryts.functions.interpolate
---

# foundryts.functions.interpolate

```python
foundryts.functions.interpolate(before=None, internal=None, after=None, frequency=None, rename_columns_by=None, static_column_name=None)
```

Returns a function that joins one or more time series into a single multi-column time series, filling missing values via interpolation. Aligns timestamps across all input series with configurable strategies per time-range: `before` (before first point), `internal` (between points), `after` (after last point).

**Parameters:**
- `before` (str | List[str], optional) — external interpolation strategy before first point (default: `NONE`)
- `internal` (str | List[str], optional) — internal interpolation strategy between points (default: `NONE`)
- `after` (str | List[str], optional) — external interpolation strategy after last point (default: `NONE`)
- `frequency` (str | pandas.Timedelta, optional) — resample to fixed frequency (e.g. `'10ns'`, `'1s'`); no fixed freq by default
- `rename_columns_by` (str | Callable, optional) — metadata key or callable to name per-series output columns
- `static_column_name` (str, optional) — single static column name override

**Returns:** `(Union[FunctionNode, NodeCollection]) -> Union[FunctionNode, NodeCollection]`

## Internal interpolation strategies

| Strategy | Description |
|----------|-------------|
| `LINEAR` | Linear interpolation between adjacent defined points. Do NOT use for enum series. |
| `NEAREST` | Value of the nearest point by timestamp |
| `PREVIOUS` | Value of the previous defined point (step forward) |
| `NEXT` | Value of the next defined point (step backward) |
| `NONE` | No interpolation — missing timestamps yield null in output |

## External interpolation strategies (before/after)

| Strategy | Description |
|----------|-------------|
| `NEAREST` | Clamp to first or last defined point value |
| `NONE` (default) | Do not extend beyond the series bounds |

Per-series strategies: pass a list where each element corresponds to one input series.

## Output schema

| Column | Type | Description |
|--------|------|-------------|
| timestamp | pandas.Timestamp | Aligned timestamp |
| `<series-name>` | Union[float, str] | One column per input series; NaN where not interpolated |

## Key usage patterns

```python
# Linear join of two series (multi-column output)
F.interpolate(internal="LINEAR")([series_1, series_2])

# Fixed-frequency resampling
F.interpolate(internal="NEAREST", frequency="10ns")(series_1)

# Different strategy per series
F.interpolate(internal=["LINEAR", "NONE"])(NodeCollection([series_1, series_2]))

# Extend beyond bounds
F.interpolate(before="NEAREST", after="NEAREST")([series_1, series_2])
```

**See also:** `scatter()`, `dsl()`
