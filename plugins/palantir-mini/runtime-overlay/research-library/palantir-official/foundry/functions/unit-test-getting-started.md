---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/unit-test-getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/unit-test-getting-started/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3fed3325162c9568979fa6ea1ee8fcae5e0eed5f76802569ad0cf3f57d3972e4"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Unit testing > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

Functions ships with support for [Jest ↗](https://jestjs.io/) unit tests. Follow the steps in this guide to get unit testing tools set up for your repository.

By default, functions includes a unit test located in the test file `functions-typescript/src/__tests__/index.ts`. You can create test files anywhere in the `__tests__` folder.

## Example

For example, we may want to test the following function `addOne` in `functions-typescript/src/index.ts`:

```typescript
import { Function, Integer } from "@foundry/functions-api";

export class MyFunctions {

    @Function()
    public addOne(n: Integer): Integer {
         return n + 1;
    }
}
```

We can test the function `addOne` by writing the following test `test add one`:

```typescript
import { MyFunctions } from ".."

describe("example test suite", () => {
    const myFunctions = new MyFunctions();
    test("test add one", () => {
        expect(myFunctions.addOne(42)).toEqual(43);
    });
});
```

Refer to the [Jest API ↗](https://jestjs.io/docs/en/api) for details about the full testing API available to you.

## Running tests

You can run all your tests by clicking on the `Test` button located on the top right, or run each individual test by clicking on the triangular "Play" button located beside the line number for each test.

![button-run-tests](/docs/resources/foundry/functions/button-run-tests.png)

When you click **Commit**, all tests will also run in Checks:

<img src="./media/run-tests.png" alt="run-tests" width="500"/>

## Next steps

Next, learn about the range of options available for testing functions that interact with the Ontology:

* [Create stub objects](/docs/foundry/functions/unit-test-stub-objects/)
* [Verify Ontology edits](/docs/foundry/functions/unit-test-ontology-edits/)
* [Stub Object searches and aggregations](/docs/foundry/functions/unit-test-object-searches/)
