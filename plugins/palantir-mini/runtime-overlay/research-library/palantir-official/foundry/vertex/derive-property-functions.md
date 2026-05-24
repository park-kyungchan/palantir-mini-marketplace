---
sourceUrl: "https://www.palantir.com/docs/foundry/vertex/derive-property-functions/"
canonicalUrl: "https://palantir.com/docs/foundry/vertex/derive-property-functions/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9a2dcc853caab0591be50f745dc5f6389d1bb8a6c527bf0b518bfee5a58bee01"
product: "foundry"
docsArea: "vertex"
locale: "en"
upstreamTitle: "Documentation | Graphs > Derive properties using Functions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Derive properties using Functions

[Functions](/docs/foundry/functions/overview/) can be used to create **derived properties** on objects. These can be displayed in the object view, shown in extended node labels and used to color nodes in the layer styling options.

Any function that meets the following criteria can be used as a **derived property**:

* The method is `public`.
* The method uses the `@Functions()` decorator.
* The method returns a FunctionsMap.
* All keys in the `FunctionMap` are objects.
* All values in the `FunctionsMap` are primitives or a custom type with primitives for each field.
* The method has been tagged for release.
* The method operates on object sets (`ExampleDataRoute[]`, for example) and not a single object (such as `ExampleDataRoute`). This ensures the function isn't called for every object on the graph individually, which can be cause very slow performance for large graphs.
* The method has no other inputs besides the object set.

For example:

```typescript
import { Function, FunctionsMap, Double } from "@foundry/functions-api";
import { ExampleDataRoute } from "@foundry/ontology-api";

export class VertexDerivedPropertyFunctions {
    @Function()
    public async flightCancellationPercentage(routes: ExampleDataRoute[]): Promise<FunctionsMap<ExampleDataRoute, Double>> {
        const routeMap = new FunctionsMap<ExampleDataRoute, Double>();

        const allFlights = await Promise.all(routes.map(route => route.flights.allAsync()));

        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            const flights = allFlights[i];
            const cancelledFlights = flights.filter(flight => flight.cancelled);
            const cancellationPercentage = (cancelledFlights.length / flights.length) * 100;
            routeMap.set(route, cancellationPercentage);
        }

        return routeMap;
    }
}
```
