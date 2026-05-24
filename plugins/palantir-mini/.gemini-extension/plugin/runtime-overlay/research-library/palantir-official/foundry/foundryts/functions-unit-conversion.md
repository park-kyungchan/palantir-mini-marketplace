---
sourceUrl: "https://www.palantir.com/docs/foundry/foundryts/functions-unit-conversion/"
canonicalUrl: "https://palantir.com/docs/foundry/foundryts/functions-unit-conversion/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "85645c2593a3e65b544929c67f5784a0ba95705a117f0766fa2fef674e2c30ba"
product: "foundry"
docsArea: "foundryts"
locale: "en"
upstreamTitle: "Documentation | API Reference > functions.unit_conversion"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# foundryts.functions.unit\_conversion

## foundryts.functions.unit\_conversion(from\_unit, to\_unit)

Returns a function that converts all values in a single time series from the specified unit value to the
specified unit.

The unit passed can either be a value from `Unit` or a valid `Alias` from the list of available units and
conversions below:

**Length**

| Unit     | Alias              | Names      |
|----------|--------------------|------------|
| m        | meter              | Meter      |
| cm       | centimeter         | Centimeter |
| mm       | millimeter         | Millimeter |
| μm       | micron, micrometer | Micrometer |
| nm       | nanometer          | Nanometer  |
| angstrom |                    | Angstrom   |
| km       | kilometer          | Kilometer  |
| in       | inch               | Inch       |
| ft       | foot               | Foot       |
| yd       | yard               | Yard       |
| mi       | mile               | Mile       |

**Temperature Units**

| Unit   | Alias        | Names      |
|--------|--------------|------------|
| °C     | Celsius      | Celsius    |
| K      | kelvin       | Kelvin     |
| °F     | Fahrenheit   | Fahrenheit |
| °R     | °Ra, rankine | Rankine    |

**Pressure Units**

| Unit   | Alias            | Names                                     |
|--------|------------------|-------------------------------------------|
| Pa     | n/m2, pascal     | Pascal                                    |
| hPa    | hectopascal      | Hectopascal                               |
| kPa    | kPaa, kilopascal | Kilopascal                                |
| kPag   |                  | Kilopascal<br/>gauge                      |
| atm    |                  | Atmosphere                                |
| bar    | bara             | Bar                                       |
| barg   |                  | Bar gauge                                 |
| fth2o  |                  | Foot of<br/>Water Column                  |
| inh2o  |                  | Inches of<br/>water                       |
| inhg   |                  | Inch of<br/>Mercury                       |
| Torr   | mmhg             | Torr (mmhg)                               |
| mTorr  |                  | Millitorr                                 |
| psi    | psia             | Pound-force<br/>per square<br/>inch       |
| psig   |                  | Pound-force<br/>per square<br/>inch gauge |

**Time Units**

| Unit   | Alias       | Names       |
|--------|-------------|-------------|
| s      | second      | Second      |
| ms     | millisecond | Millisecond |
| μs     | microsecond | Microsecond |
| ns     | nanosecond  | Nanosecond  |
| min    | minute      | Minute      |
| hr     | hour        | Hour        |

**Mass Units**

| Unit   | Alias    | Names    |
|--------|----------|----------|
| kg     | kilogram | Kilogram |
| g      | gram     | Gram     |
| lb     | pound    | Pound    |

Contact your service administrator to access and extend the list of units and conversions for your deployment.

* **Parameters:**
  * **from\_unit** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Original unit to convert values from.
  * **to\_unit** ([*str*](https://docs.python.org/3/library/stdtypes.html#str)) – Desired unit to convert values to.
* **Returns:**
  A function that accepts a single time series as input and returns the time series with values converted to the
  specified unit.
* **Return type:**
  (`FunctionNode`) -> `FunctionNode`

## Dataframe schema

| Column name   | Type             | Description            |
|---------------|------------------|------------------------|
| timestamp     | pandas.Timestamp | Timestamp of the point |
| value         | float            | Value of the point     |

:::callout{theme="warning" title="Note"}
This function is only applicable to numeric series.
:::

## Examples

```pycon
>>> series = F.points(
...     (1, 8.0),
...     (101, 4.0),
...     (200, 2.0),
...     (201, 1.0),
...     (299, 35.0),
...     (300, 16.0),
...     (1000, 64.0),
...     name="series",
... )
>>> series.to_pandas()
                      timestamp  value
0 1970-01-01 00:00:00.000000001    8.0
1 1970-01-01 00:00:00.000000101    4.0
2 1970-01-01 00:00:00.000000200    2.0
3 1970-01-01 00:00:00.000000201    1.0
4 1970-01-01 00:00:00.000000299   35.0
5 1970-01-01 00:00:00.000000300   16.0
6 1970-01-01 00:00:00.000001000   64.0
```

```pycon
>>> unit_converted = F.unit_conversion("m", "mm")(series)
>>> unit_converted.to_pandas()
                      timestamp    value
0 1970-01-01 00:00:00.000000001   8000.0
1 1970-01-01 00:00:00.000000101   4000.0
2 1970-01-01 00:00:00.000000200   2000.0
3 1970-01-01 00:00:00.000000201   1000.0
4 1970-01-01 00:00:00.000000299  35000.0
5 1970-01-01 00:00:00.000000300  16000.0
6 1970-01-01 00:00:00.000001000  64000.0
```
