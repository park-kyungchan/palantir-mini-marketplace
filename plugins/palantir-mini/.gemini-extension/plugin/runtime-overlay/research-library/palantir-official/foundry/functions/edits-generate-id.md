---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/edits-generate-id/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/edits-generate-id/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9fbfb29bc393116171a5e9df57881688bd2d4eed6f22a2a63c42885bd6544bb1"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | TypeScript v1 > Generate unique IDs for new objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Generate unique IDs for new objects

:::callout{theme="warning"}
The following documentation is specific to TypeScript v1 functions. For more [robust capabilities](/docs/foundry/functions/language-feature-support/#typescript-v1-vs-typescript-v2), including support for Ontology SDK and configurable resource requests, we recommend [migrating to TypeScript v2](/docs/foundry/functions/typescript-v2-migration/).
:::

When writing an [Ontology edit function](/docs/foundry/functions/edits-overview/) that creates objects, you may want to generate a unique ID for the newly created object. You can set this up in functions by using the `@foundry/functions-utils` package to generate a globally unique identifier.

## Import the package

The `@foundry/functions-utils` package is installed by default, but if the package is not present in the `package.json` file:

* In the `"dependencies"` section, add `"@foundry/functions-utils": "0.1.0"`

As mentioned in the [documentation on adding dependencies](/docs/foundry/functions/add-dependencies/), remember to restart Code Assist to have the new package available for autocomplete.

## Use the package in code

To generate a unique ID, you can use the `Uuid.random()` utility function from the `@foundry/functions-utils` package. The below code example shows how you could use the `random` function in an example Ontology edit function.

```typescript
import { OntologyEditFunction, Timestamp } from "@foundry/functions-api";
import { Objects } from "@foundry/ontology-api";
import { Uuid } from "@foundry/functions-utils";

export class ExampleEditFunctions {
    @Edits(FlightScenario)
    @OntologyEditFunction()
    public createFlightScenario(): void {
        const scenario = Objects.create().flightScenarios(Uuid.random());
        scenario.scenarioName = "New scenario";
        scenario.creationTime = Timestamp.now();
    }
}
```
