---
sourceUrl: "https://www.palantir.com/docs/foundry/dynamic-scheduling/scheduling-inline-metrics/"
canonicalUrl: "https://palantir.com/docs/foundry/dynamic-scheduling/scheduling-inline-metrics/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2d5397f056e7253344f0302f80ab8611b0956113005a80f38009887d76708838"
product: "foundry"
docsArea: "dynamic-scheduling"
locale: "en"
upstreamTitle: "Documentation | Dynamic Scheduling > Inline metrics"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Inline metrics

Inline metrics provides application builders with a streamlined method for displaying key data directly in the chart.

* Header metrics are aligned with the timeline (x-axis) of the widget, offering high-level aggregations for the entire schedule.
* Row metrics are aligned with each row, providing insights into the scheduling and assignment of individual resource objects.

<img src="./media/inline-metrics-example.png" alt="Scheduling gantt chart configured with header and row metrics." width="800" >

## Functions signature

Inline metrics require functions that return a list of a [custom type](/docs/foundry/functions/types-reference/) that matches the following shape:

```
interface InlineMetricsBucket {
    range: IRange<Timestamp>;
    value: Double
}
```

Inline metrics can support alternative return types as well.

```typescript
// NOTE: The name of the interface is not important - only the names of the keys
interface InlineMetricsBucketInteger {
    range: IRange<Timestamp>;
    value: Integer
}

interface InlineMetricsBucketString {
    range: IRange<LocalDate>;
    value: string
}
```

The `range` key can support `IRange` types of `Timestamp`, `LocalDate`, or `Integer` (with numerical values representing epoch milliseconds).

The value key can support `string`, `Integer`, or `Double` values.

## Sample header metric function

```typescript

import { IRange, Double, Timestamp } from "@foundry/functions-api";

interface InlineMetricBucketV1Double {
    range: IRange<Timestamp>;
    value: Double;
}

// Counts the number of tasks within the given range bucketed by a step in days
@Function()
public getInlineMetricsV1WithObjectCounts(startTime: Timestamp, endTime: Timestamp, step: Double): Array<InlineMetricBucketV1Double> {
    const tasks = Objects.search().schedulingMaintenanceTask().filter(x =>
        x.startTime.range().gte(startTime).lte(endTime)
    ).all();
    const buckets: InlineMetricBucketV1Double[] = [];

    let current = startTime;
    let count = 0
    while (current < endTime) {
        const currentEnd: Timestamp = current.plusDays(step);
        const tasksInRange = tasks.filter(x => x.startTime! >= current && x.startTime! <= currentEnd);
        buckets.push({
            range: {
                min: current,
                max: currentEnd
            },
            value: tasksInRange.length
        })
        current = currentEnd;
        count++;
    }
    return buckets
}

```

Since header metrics are displayed as a header alongside the x-axis, these functions are not necessarily tied to any specific objects as inputs.

## Sample row metric function

```typescript
// Returns the name of the row alongside the number bucket to which it belongs
@Function()
public getInlineMetricsV1StringWithObject(techs: ObjectSet<SchedulingTechnician_1>, startTime: Timestamp, endTime: Timestamp, step: Double): Array<InlineMetricBucketV1String> {
    const techName = techs.all()[0].fullName;
    const buckets: Array<InlineMetricBucketV1String> = [];

    let current = startTime;
    let count = 0;
    while (current < endTime) {
        const currentEnd: Timestamp = current.plusDays(step);
        buckets.push({
            range: {
                min: current,
                max: currentEnd
            },
            value: `${techName}-${count}`,
        })
        current = currentEnd;
        count++;
    }
    return buckets
}
```

Row metrics accept the corresponding row object as runtime input. When specifying your function in the configuration, you can specify the object parameter as runtime input and the widget will automatically pass the corresponding row through to the function for you.

<img src="./media/inline-metrics-runtime-input.png" alt="Runtime input for metric configuration." width="300" >

## Widget configuration

The Scheduling Gantt Chart widget config has a **Metrics** section which includes options for header-level and row-level metrics.

<img src="./media/inline-metrics-config-section.png" alt="Metrics section in the Scheduling Gantt Chart config panel." width="300" >

Within the metric configuration setup, you can provide a display title, select an icon, and/or set up conditional coloring.

<img src="./media/inline-metrics-config.png" alt="Individual metric configuration screen." width="300" >
