---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/timeseries-aggregations/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/timeseries-aggregations/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8cf7dc6e00471fd9ae06a0e06f8873fb71ea3c02c9257788d4e189912801c112"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Time series > Time series aggregations"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time series aggregations

Quiver supports several time series aggregations that can operate on either one or several series at a time.

## Single series aggregate

Single series aggregates operate on a single, continuous, time series producing one aggregated value for each specified *time window*.

### Supported aggregation options

The following options are supported:

* **Sum:** Sum of all points in each window.
* **Mean:** Average of all points in each window.
* **Standard deviation:** Standard deviation of all points in each window.
* **Max:** Largest value in each window.
* **Min:** Smallest value in each window.
* **Difference:** Difference between the last point and first point in each window.
* **Relative difference:** Percent change between the last point and first point in each window.
* **Product:** Product of all points in each window.
* **Count:** Number of points in each window.
* **First:** Value of the first point in each window.
* **Last:** Value of the last point in each window.

### Quiver cards using this aggregate

* [**Cumulative aggregate:**](/docs/foundry/quiver/card-cumulative-aggregate/) This card applies a data point aggregation for each point in the input series, where the time window ranges from the start of the series to the current point (inclusive).
* [**Periodic aggregate:**](/docs/foundry/quiver/card-periodic-aggregate/) This card divides the time series into contiguous time windows of fixed duration and applies a data point aggregation to each. Windows with no data points are not included in the output.
* [**Rolling aggregate:**](/docs/foundry/quiver/card-rolling-aggregate/) This card applies a data point aggregation for each point in the input series where the time window ends at the current timestamp (inclusive) and spans a specified duration. As new data points are added to the window, old points fall out of it if they are outside the specified duration.
* [**Time series numeric aggregation:**](/docs/foundry/quiver/card-time-series-numeric-aggregation/) This card applies a data point aggregation to a single time window spanning the entire series.
* [**Time series scatter plot:**](/docs/foundry/quiver/card-time-series-scatter-plot/) This card uses a periodic aggregate.
* [**Bollinger bands:**](/docs/foundry/quiver/card-bollinger-bands/) This card uses a rolling aggregate.

## Multi-series aggregate

Multi-series aggregates align multiple continuous time series and combine one value from each series producing an aggregated value for each timestamp.

### Supported aggregation options

The following options are supported:

* **Sum:** Sum of points across all series at each timestamp.
* **Mean:** Average of points across all series at each timestamp.
* **Standard deviation:** Standard deviation of points across all series at each timestamp.
* **Max:** Largest value in any series at each timestamp.
* **Min:** Smallest value in any series at each timestamp.
* **Product:** Product of points across all series at each timestamp.

### Quiver cards using this aggregate

* [**Linear aggregation**](/docs/foundry/quiver/card-linear-aggregation/)
* [**Linked series aggregation**](/docs/foundry/quiver/card-linked-series-aggregation/)
* [**Time series formula:**](/docs/foundry/quiver/card-time-series-formula/) This card allows you to perform most of the operations in the above list, but with mathematical operators.

## Interval aggregate

Interval aggregates operate on an interval time series which can be produced via the [Filter time series](/docs/foundry/quiver/card-filter-time-series/) card. They produce one aggregated value for each interval in the series. Aggregates are *inclusive* of points at the start timestamp of each interval and *exclusive* of points at the end timestamp.

### Supported aggregation options

The following options are supported:

* **Sum:** Sum of all points in each interval.
* **Mean:** Average of all points in each interval.
* **Standard deviation:** Standard deviation of all points in each interval.
* **Max:** Largest value in each interval.
* **Min:** Smallest value in each interval.
* **Difference:** Difference between the last point and first point in each interval.
* **Relative difference:** Percent change between the last point and first point in each interval.
* **Product:** Product of all points in each interval.
* **Count:** Number of points in each interval.
* **First:** Value of the first point in each interval.
* **Last:** Value of the last point in each interval.
* **Duration:** Length of each interval in the precision that the time series is configured with (usually milliseconds).
* **Rate change:** Difference between the last point and first point in each interval divided by the interval's length in the precision that the time series is configured with (usually milliseconds).

### Quiver cards using this aggregate

* [**Segment statistics**](/docs/foundry/quiver/card-segment-statistics/)
* [**Event statistics**](/docs/foundry/quiver/card-event-statistics/)
