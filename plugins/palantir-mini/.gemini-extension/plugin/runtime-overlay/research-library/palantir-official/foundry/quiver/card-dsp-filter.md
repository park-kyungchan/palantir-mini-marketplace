---
sourceUrl: "https://www.palantir.com/docs/foundry/quiver/card-dsp-filter/"
canonicalUrl: "https://palantir.com/docs/foundry/quiver/card-dsp-filter/"
sourceLastmod: "2026-05-12T17:06:26.156Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "55d40aa32eb40c7042beeb581d5a8f2f5d84eb2fc7db59e214d13ee99e51975e"
product: "foundry"
docsArea: "quiver"
locale: "en"
upstreamTitle: "Documentation | Detailed card index > DSP filter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Digital Signal Processing (DSP) filter

DSP (digital signal processing) filters are commonly used on input series to reduce their noise. This is typically a more rigorous option to "smooth" a series than using a [rolling aggregate](/docs/foundry/quiver/card-rolling-aggregate/).

Quiver includes three separate filtering algorithms/prototypes:

* [Butterworth ↗](https://en.wikipedia.org/wiki/Butterworth_filter)
* [Chebyshev ↗](https://en.wikipedia.org/wiki/Chebyshev_filter)
* [Inverse Chebyshev ↗](https://en.wikipedia.org/wiki/Chebyshev_filter).

For each algorithm, a filter response must be selected from the following options:

* [Lowpass ↗](https://en.wikipedia.org/wiki/Low-pass_filter)
* [Highpass ↗](https://en.wikipedia.org/wiki/High-pass_filter)
* [Bandpass ↗](https://en.wikipedia.org/wiki/Band-pass_filter)
* [Bandstop ↗](https://en.wikipedia.org/wiki/Band-stop_filter)

## Input type

Time series

## Output type

Time series

### Example

![DSP filter example](/docs/resources/foundry/quiver/card-dsp-filter.png)

## Usage information

| Functionality | Availability |
| --- | --- |
| [Standard Quiver card](/docs/foundry/quiver/core-concepts/#cards) | Supported |
| [Transform table transform](/docs/foundry/quiver/cards-transform-table/) | Supported |
