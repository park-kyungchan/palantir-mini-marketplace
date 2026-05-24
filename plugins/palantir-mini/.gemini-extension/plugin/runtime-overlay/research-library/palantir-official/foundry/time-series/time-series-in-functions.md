---
sourceUrl: "https://www.palantir.com/docs/foundry/time-series/time-series-in-functions/"
canonicalUrl: "https://palantir.com/docs/foundry/time-series/time-series-in-functions/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "aaa44fc5136a9fde3449d0747b8ad38375b1f1f3f4f98f2314a3ae672e80f7a4"
product: "foundry"
docsArea: "time-series"
locale: "en"
upstreamTitle: "Documentation | Using time series > Use time series in Functions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Time series in Functions

Functions supports operations on time series properties. In this page, we cover how to set up and use time series properties in functions.

## Initial set up

To use time series in Functions, you will need to have already stored time series in the Ontology. You can follow the steps outlined [here](/docs/foundry/time-series/time-series-setup/) to get started.

Once your time series are stored in the ontology, we need to [create a code repository](/docs/foundry/functions/getting-started/) for our time series Functions. In this repository, we start by [importing Ontology types](/docs/foundry/functions/foo-getting-started/#import-ontology-types) so we can reference the time series stored in these Ontology types.

Now you're ready to work with time series in Functions.

## Working with time series in Functions

To access time series in Functions, start by creating an [object-backed Function](/docs/foundry/functions/foo-getting-started/#add-an-object-backed-function) in your code repository. These functions can directly access the time series properties in your Ontology. Once you have written a Function, there are two ways to run your new function. You can either [test your Function in live preview](/docs/foundry/functions/foo-getting-started/#test-in-live-preview) or [publish your Function](/docs/foundry/functions/foo-getting-started/#publish-the-new-function) and start using it in other applications throughout the platform.

### Python functions

:::callout{theme="warning"}
The [FoundryTS library](/docs/foundry/foundryts/overview/) is not compatible with functions. Instead, the Python OSDK offers an alternative for accessing time series data through Ontology properties.
:::

#### Access data

The [Python OSDK](/docs/foundry/ontology-sdk/python-osdk/) allows you to read data points from time series properties (TSPs) into pandas or Polars DataFrames.

The DataFrame contains two columns:

| Column name   | Type              | Description            |
|---------------|-------------------|------------------------|
| timestamp     | pandas.Timestamp | polars.datatypes.Datetime  | Timestamp of the point |
| value         | Union\[float, str] | Value of the point     |

```py
@function
def aircraft_altimeter_mean(aircraft: Aircraft) -> float:
    """Get the mean of altimeter readings for a given Ontology aircraft object."""
    df = aircraft.altimeter.to_pandas(all_time=True)
    return df["value"].mean()
```

```py
@function
def aircraft_altimeter_mean(aircraft: Aircraft) -> float:
    """Get the mean of altimeter readings for a given Ontology aircraft object."""
    df = aircraft.altimeter.to_polars(all_time=True)
    return df.select(pl.col("value").mean()).item()
```

#### Return time series

To return time series data from a Python function, use the following `dataclasses` as the return type. This enables Quiver to find your functions for displaying the [output time series in Quiver cards](/docs/foundry/quiver/card-code-function-timeseries/).

```py
from dataclasses import dataclass
from typing import List

import pandas as pd
import polars as pl

@dataclass
class NumericTimeSeries:
    timestamp: List[float]
    value: List[float]

    @staticmethod
    def from_pandas(df: pd.DataFrame) -> "NumericTimeSeries":
        df["timestamp"] = [
            timestamp.timestamp() * 1000 for timestamp in df["timestamp"]
        ]
        return NumericTimeSeries(**df.to_dict("list"))

@dataclass
class CategoricalTimeSeries:
    timestamp: List[float]
    value: List[str]

    @staticmethod
    def from_pandas(df: pd.DataFrame) -> "CategoricalTimeSeries":
        df["timestamp"] = [
            timestamp.timestamp() * 1000 for timestamp in df["timestamp"]
        ]
        return CategoricalTimeSeries(**df.to_dict("list"))
```

The `dataclass` can then be used in the return annotation of the function so that it is discoverable by Quiver.

:::callout{theme="neutral"}
The timestamps should be in epoch milliseconds. The static factories provide useful utilities for converting data from DataFrames into a format that Quiver can understand.
:::

```py
@function
def fake_series() -> NumericTimeSeries:
    df = pandas.DataFrame({
        "timestamp": [
            pd.Timestamp("2025-03-19 08:00:00"),
            pd.Timestamp("2025-03-19 09:00:00"),
            pd.Timestamp("2025-03-19 10:00:00")
        ],
        "value": [1.0, 2.0, 2.5]
    })
    return NumericTimeSeries.from_pandas(df)
```

### TypeScript functions

The following sections provide examples of common TypeScript function operations.

#### Return the first or last point

Since functions do not have a built-in type for time series points, you can instead return the value or the timestamp. For example, the following function reads the latest temperature on a machine:

```ts
    @Function()
    public async getLatestTemperature(machine: MachineRoot): Promise<Double | undefined> {
        const latest = await machine.temperatureId?.getLastPointV2();
        return latest?.value;
    }
```

You can similarly get the first temperature reading with the following function:

```ts
    @Function()
    public async getEarliestTemperature(machine: MachineRoot): Promise<Double | undefined> {
        const earliest = await machine.temperatureId?.getFirstPointV2();
        return earliest?.value;
    }
```

#### Aggregate over a series

One useful aggregation is to compute the average over a range of points. Consider the following function that gets the average temperature of an example machine:

```ts
    @Function()
    public async getAverageTemperature(machine: MachineRoot): Promise<Double | undefined> {
        const aggregation = await machine.temperatureId?.aggregate()
            .overEntireRange()
            .mean()
            .compute();
        return aggregation?.mean!;
    }
```

#### Take the derivative

Building on the example above, you can also retrieve the average change in temperature on the same machine by using the following compute function:

```ts
    @Function()
    public async getAverageTemperature(machine: MachineRoot): Promise<Double | undefined> {
        const aggregation = await machine.temperatureId?.derivative()
            .aggregate()
            .overEntireRange()
            .mean()
            .compute();
        return aggregation?.mean;
    }
```

#### Specify a time range

You can apply other transforms in addition to derivatives to a time series. The following is an example of how you can apply timestamp parameters as a range on a time series:

```ts
    @Function()
    public async getAverageTemperatureOverRange(
        machine: MachineRoot,
        start: Timestamp,
        end: Timestamp): Promise<Double | undefined>
    {
        const latest = await machine.temperatureId?.timeRange({min: start, max: end})
            .aggregate()
            .overEntireRange()
            .mean()
            .compute();
        return latest?.mean;
    }
```
