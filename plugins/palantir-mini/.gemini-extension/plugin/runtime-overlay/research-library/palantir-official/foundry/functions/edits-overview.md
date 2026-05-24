---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/edits-overview/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/edits-overview/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "3fa53bc61d58ccf20b7f2bf951d9f3e368c620733ce9af28314ebe0e87312e07"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Language agnostic features > Ontology edits"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Ontology edits

An **Ontology edit** is the act of creating, modifying, or deleting an object. Functions support returning [Ontology edits](/docs/foundry/functions/types-reference/#ontology-edit) for use in a [function-backed action](/docs/foundry/action-types/function-actions-overview/).

* TypeScript v1 functions are authored using the `@OntologyEditFunction` decorator, which provides special semantics to simplify your code. TypeScript v1 functions also use the [`@Edits` decorator](/docs/foundry/functions/api-ontology-edits/#the-edits-decorator)  to provide actions with provenance information, which the actions may use to [enforce permissions](/docs/foundry/action-types/permissions/). You can write unit tests for TypeScript v1 Ontology edit functions using the APIs available for [verifying Ontology edits](/docs/foundry/functions/unit-test-ontology-edits/).
* TypeScript v2 functions are authored using the [`createEditBatch`](/docs/foundry/functions/typescript-v2-ontology-edits/#construct-an-ontology-edits-batch) function exported from the `@osdk/functions` package. These functions rely on the `Edits` type to provide actions with provenance information.
* Python functions are authored by creating an edits container using the [`FoundryClient`](/docs/foundry/functions/python-ontology-edits/#construct-an-ontology-edits-container) exported from the Ontology SDK. These functions rely on the `edits` parameter of the [`@function`](/docs/foundry/functions/python-ontology-edits/#define-an-edit-function) decorator to provide actions with provenance information.

The rest of this document describes how Ontology edit functions work behind the scenes to provide you with a better understanding of the underlying infrastructure.

### When edits are applied

A common misunderstanding about Ontology edit functions is whether or not running them will update objects in the Ontology. When you run an Ontology edit function in the functions helper in **Authoring**, edits are not applied to the actual objects. The only way to update objects using a function is by configuring an action to use the function as described in the documentation for [function-backed actions](/docs/foundry/action-types/function-actions-overview/).

This means that you can freely run Ontology edit functions in the functions helper to validate results on various inputs, without concern that the objects themselves will be updated.

![Results pane](/docs/resources/foundry/functions/results-pane-edits.png "Results pane showing edits made to objects.")

### Caveats

#### Edits and object search

Changes to objects and links are propagated to the object set APIs *after* your function has finished executing. This means that `Objects.search()` APIs will use the old objects, properties, and links. As a result, search, filtering, search arounds, and aggregations may not reflect the edits to the Ontology, including creation and deletion. Your function will need to handle this case manually.

For the following example, assume there is an Employee with ID 1.

```typescript tab="TypeScript v1"
import { OntologyEditFunction, Edits } from "@foundry/functions-api";
import { Employee, Objects } from "@foundry/ontology-api";

export class CaveatEditFunctions {
    @Edits(Employee)
    @OntologyEditFunction()
    public async editAndSearch(): Promise<void> {
        const employeeOne = Objects.search().employee().filter(e => e.id.exactMatch(1)).all()[0];
        employeeOne.name = "Bob";

        const count = await Objects.search().employee().filter(e => e.name.exactMatch("Bob")).count() ?? -1;
        console.log(count);
        // Expected: 1, Actual: 0
    }
}
```

```typescript tab="TypeScript v2"
import { Client } from "@osdk/client";
import { Employee } from "@ontology/sdk";
import { Edits, createEditBatch } from "@osdk/functions";

type OntologyEdit = Edits.Object<Employee>;

async function editAndSearch(client: Client): OntologyEdit[] {
    const batch = createEditBatch<OntologyEdit>(client);

    const employeeOne = await client(Employee).fetchOne(1);
    batch.update(employeeOne, { name: "Bob" });

    const count = await client(Employee)
        .where({
            name: {
                $eq: "Bob"
            }
        })
        .aggregate({
            $select: {
                $count: "unordered"
            }
        })
        .then(response => response.$count);
    console.log(count);
    // Expected: 1, Actual: 0

    return batch.getEdits();
}

export default editAndSearch;
```

```python tab="Python"
from functions.api import function, OntologyEdit
from ontology_sdk import FoundryClient
from ontology_sdk.ontology.objects import Employee

@function(edits=[Employee])
def edit_and_search() -> list[OntologyEdit]:
    client = FoundryClient()
    ontology_edits = client.ontology.edits()

    employee = client.ontology.objects.Employee.get(1)
    editable_employee = ontology_edits.objects.Employee.edit(employee)
    editable_employee.name = "Bob"

    count = client.ontology.objects.Employee.where(Employee.object_type.name == "Bob").count().compute()
    print(count)
    # Expected: 1, Actual: 0

    return ontology_edits.get_edits()
```

#### Optional arrays in function-backed actions

While omitted optional arrays are handled as `undefined` when running an `@OntologyEditFunction` in code repositories, they are passed as empty arrays when executing the function through an action.
