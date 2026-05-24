---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/user-facing-error/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/user-facing-error/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "aad567f231972360eebf5d0e4867277a4b43689b8bc68676907b36420e7b95c9"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Language agnostic features > User-facing errors"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# User-facing errors

When running functions in other parts of the platform, such as Workshop or actions, you may want to throw an error with a detailed message. To do so, throw a `UserFacingError`. For example:

```typescript tab="TypeScript v1"
import { Function, UserFacingError } from "@foundry/functions-api";
import { Employee } from "@foundry/ontology-api";

export class MyFunctions {
    @Function()
    public async searchExactlyFiveEmployees(employees: Employee[]): Proimse<string> {
        if (employees.length != 5) {
            throw new UserFacingError(`Pass in exactly 5 employees. Received ${employees.length}.`);
        }

        // search employees
    }
}
```

```typescript tab="TypeScript v2"
import { Osdk } from "@osdk/client";
import { Employee } from "@ontology/sdk";
import { UserFacingError } from "@osdk/functions";

export default async function searchExactlyFiveEmployees(employees: Array<Osdk.Instance<Employee>>): Promise<string> {
    if (employees.length != 5) {
        throw new UserFacingError(`Pass in exactly 5 employees. Received ${employees.length}.`);
    }

    // search employees
}
```

```python tab="Python"
from functions.api import function, UserFacingError
from ontology_sdk import FoundryClient
from ontology_sdk.ontology.objects import Aircraft

@function()
def search_exactly_five_employees(
    employees: list[Aircraft]
) -> str:
    if not len(aircraft) == 5:
        raise UserFacingError(f"Pass in exactly 5 employees. Received ${len(aircraft)}.")

    # search employees
```

When running this as a [Function-backed Action](/docs/foundry/action-types/function-actions-overview/) in a [Workshop application](/docs/foundry/workshop/functions-use/) with an incorrect number of employees, users will see the following error:

![user-facing-error](/docs/resources/foundry/functions/user-facing-error.png)

By adding a detailed user facing error message, you can help other users of your Function quickly identify and fix the issue.
