---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/interval/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/interval/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fae642d366380b402ce4d7c4c78febdf0ef461b6dc24aecbc5386fa2e25ee2fb"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > Interval"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.Interval

## *class* foundryts.Interval(start=None, end=None, name=None, metadata=None)

An interval defined by start and end time.

Intervals are useful for splitting time series in a [`NodeCollection`](/docs/foundry/foundryts/node-collection/#foundryts.NodeCollection) to time ranges for
each interval or for representing results of FoundryTS interval functions such as
[`foundryts.functions.time_series_search()`](/docs/foundry/foundryts/functions-time-series-search/#foundryts.functions.time_series_search).

Intervals can hold optional metadata.

* **Parameters:**
  * **start** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* *datetime* *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The start timestamp (inclusive) of the interval (default is `pandas..Timestamp.min`).
  * **end** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* *datetime* *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – The end timestamp (exclusive) of the interval (default is `pandas..Timestamp.min`).
  * **name** ([*int*](https://docs.python.org/3/library/functions.html#int) *|* *datetime* *|* [*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *optional*) – Optional name for the interval (default is `None`).
  * **metadata** (*Dict* *\[*[*str*](https://docs.python.org/3/library/stdtypes.html#str) *,* *Any* *]* *,* *optional*) – Optional metatadata dictionary for the interval (default is `None`).

## Examples

```pycon
>>> from foundryts import Interval
>>> interval = Interval(start='2018-01-01', end='2018-02-01', name='january', metadata={'days': 31})
>>> interval
Interval(start='2018-01-01 00:00:00', end='2018-02-01 00:00:00', name='january', metadata={'days': 31})
>>> interval.name
'january'
>>> interval.metadata['days']
31
```

#### *property* end

End time as `codex_core.Timestamp`.

#### *property* end\_codex

Copy of [`Interval.end()`](#foundryts.Interval.end) which will be migrated to return Python native, non-codex Conjure types in
the future.

#### *property* end\_native

End time as `int | datetime | str`

#### *property* end\_ns

End time in nanoseconds.

#### *property* metadata

Return metadata dictionary.

#### *property* name

Name of the interval.

#### *property* start

Start time as `codex_core.Timestamp`.

#### *property* start\_codex

Copy of [`Interval.start()`](#foundryts.Interval.start) which will be migrated to return Python native, non-codex Conjure types
in the future.

#### *property* start\_native

Start time as `int | datetime | str`

#### *property* start\_ns

Start time in nanoseconds.
