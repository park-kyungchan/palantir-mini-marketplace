---
sourceUrl: "https://www.palantir.com/docs/foundry/sap/sap-dynamic-filters/"
canonicalUrl: "https://palantir.com/docs/foundry/sap/sap-dynamic-filters/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "335f3e34edfb0061f8d1c2b39be923120f0768002704505c39efe9cd46e07ca6"
product: "foundry"
docsArea: "sap"
locale: "en"
upstreamTitle: "Documentation | Foundry SAP setup > Dynamic filters"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Dynamic filters

Dynamic filters allow the use of special keywords and functions to create more flexible and powerful filtering for syncs.

:::callout{theme="neutral"}
Dynamic filters are available as of add-on version SP26.
:::

## Fixed keywords

The following fixed keywords return dynamic date values.

| Keyword                 | Description                                                      |\
|-------------------------|------------------------------------------------------------------|
| `[CURRENTYEAR]`         | Returns the current year in `YYYY` format                        |
| `[TODAY]`               | Returns today's date in `YYYYMMDD` format                        |
| `[LASTDAYOFMONTH]`      | Returns the last day of the current month in `YYYYMMDD` format   |
| `[LASTDAYOFLASTMONTH]`  | Returns the last day of the previous month in `YYYYMMDD` format  |
| `[FIRSTDAYOFMONTH]`     | Returns the first day of the current month in `YYYYMMDD` format  |
| `[FIRSTDAYOFLASTMONTH]` | Returns the first day of the previous month in `YYYYMMDD` format |

## Functions for date calculations

The following dynamic functions perform various date calculations.

| Function     | Description                                                                      |
|--------------|----------------------------------------------------------------------------------|
| `[ADDDAY]`   | Adds days to the selected date (for example, `[ADDDAY(22102022,1)]` → `23102022`)         |
| `[ADDMONTH]` | Adds months to the selected date                                                 |
| `[ADDYEAR]`  | Adds years to the selected date                                                  |
| `[GETMONTH]` | Returns the month of the selected date in a 2-digit format (01, 02, 03, ..., 12) |
| `[GETDAY]`   | Returns the day of the month in a 2-digit format                                 |
| `[GETYEAR]`  | Returns the year of the selected date                                            |

## Function usage and nesting

Functions can be used directly with fixed keywords or nested inside each other for more complex calculations. For example:

* Single function: `[ADDDAY([TODAY], 1)]`
* Nested functions: `[GETDAY([ADDDAY([FIRSTDAYOFMONTH], -1)])]`

## Filter usage examples

Dynamic filters can be used in simple, nested, or chained nested formats. Here are some examples of each:

* Simple filter: `BUDAT>[TODAY]`
* Nested filter: `BUDAT>[ADDDAY([FIRSTDAYOFMONTH], -1)]`
* Chained nested filter: `BUDAT<[ADDDAY([ADDDAY([TODAY],[GETDAY([TODAY])])],1)]`

By combining fixed keywords and dynamic functions, versatile and powerful filters can be created to adapt to various data analysis scenarios.
