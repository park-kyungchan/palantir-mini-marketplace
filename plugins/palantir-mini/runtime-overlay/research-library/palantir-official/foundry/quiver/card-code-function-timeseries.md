---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-code-function-timeseries/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-code-function-timeseries/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5c0c9ac3e621bb22df43583d5ac8c342269ac194ebd8f67a9f8217c83851633a"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > Code function time series"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Code function time series

:::callout{theme="neutral" title="Beta"}
The code function time series card is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development. Contact Palantir Support to request access to the code function time series card.
:::

The code function time series card creates a plot of time series returned by a [Python function](/docs/foundry/functions/python-getting-started/). To return a time series, you must define a `NumericTimeSeries` or a `CategoricalTimeSeries` custom type. [Learn more about outputting time series data from Python functions.](/docs/foundry/time-series/time-series-in-functions/#return-time-series)

* Choose a function from the **Select a Function...** dropdown menu of the card editor to the right of the screen.
* Once you make a selection, the inputs of the function will appear below. Enter the inputs as required.
* Toggle on the **Auto-update** option if you want the analysis to always use the latest version of the function. By default, the function’s version will be set to the latest version available at the time of creation. You can change the version manually using the dropdown menu.

:::callout{theme="warning"}
To optimize performance of the Quiver analysis, limit the number of points returned by the function and the number of downstream cards in which the code function time series card is used.
:::

## Input type

Object set, single object, number, string, time, boolean, number array, string array, time array, boolean array

## Output type

Time series
