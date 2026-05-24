---
source: https://www.palantir.com/docs/foundry/foundryts/
fetched: 2026-04-20
section: ontology-deep
doc_title: FoundryTS overview
---

# FoundryTS

FoundryTS is a Python library for running scalable queries against time series data. It provides an interface to Foundry's efficient time series storage and uses Foundry's Spark cluster to distribute computations.

## Key concepts

- Time series data lives in Foundry's time series storage layer (not the Ontology object store).
- FoundryTS exposes a Python API to search, transform, and aggregate time series.
- Queries are executed in a distributed manner on a Spark cluster.

## API surface

The FoundryTS library consists of:
- `FoundryTS` — the singleton entrypoint.
- `Interval` — time interval representation.
- `NodeCollection` — collection of time series nodes returned by search.
- `functions.*` — transformation and aggregation functions (cumulative_aggregate, derivative, distribution, dsl, exponential_regression, first_point, integral, interpolate, last_point, linear_regression, mean, periodic_aggregate, points, polynomial_regression, rolling_aggregate, scale, scatter, series, skip_nonfinite, statistics, sum, time_extent, time_range, time_series_search, time_shift, timestamp_scale, udf, unit_conversion, value_shift, where).
- `nodes.*` — FunctionNode, SummarizerNode.
- `objects.*` — FoundryObject, Object.
- `search.*` — Property, Search, ontology.

See the [time series documentation](https://www.palantir.com/docs/foundry/time-series/time-series-overview/) for more on how time series work in Foundry.
