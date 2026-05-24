---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/unit-test-stub-objects/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/unit-test-stub-objects/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d05be9b12e502bba78b89106ee4597b7a8c3759e6c340e3e5571c73d8bd0f21e"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Unit testing > Create stub objects"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create stub objects

You can create and define your mock objects using `Objects.create()`, which can be used the same way as if it was a regular function. You can then use these mock objects when writing unit tests. Here is an example:

```typescript
import { MyFunctions } from ".."

import { Objects, ExampleDataAirport } from "@foundry/ontology-api";

describe("example test suite", () => {
    const myFunctions = new MyFunctions();

    test("test created objects", () => {
        const JFK = Objects.create().exampleDataAirport("JFK Test");
        JFK.displayAirportName = "John F. Kennedy International";
        expect(myFunctions.getAirportName(JFK)).toEqual("John F. Kennedy International");
    });
});
```

For reference, the above example is using the Jest syntax [`expect(...).toEqual(...)` ↗](https://jestjs.io/docs/expect#toequalvalue).
