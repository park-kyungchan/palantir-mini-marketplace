---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/undefined-values/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/undefined-values/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "6e000f47f96638fb759d09c249a8a088297ab0f16b90ae5247d3562baaaebc9f"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | TypeScript v1 > Handle undefined values"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Handle undefined values

:::callout{theme="warning"}
The following documentation is specific to TypeScript v1 functions. For more [robust capabilities](/docs/foundry/functions/language-feature-support/#typescript-v1-vs-typescript-v2), including support for Ontology SDK and configurable resource requests, we recommend [migrating to TypeScript v2](/docs/foundry/functions/typescript-v2-migration/).
:::

Below are two useful patterns for handling `undefined` values which may be returned from accessing properties or links.

### Explicit checks

```typescript
@Function()
public getFullName(employee: Employee): string {
    if (!(employee.firstName && employee.lastName)) {
        throw new UserFacingError("Cannot derive full name because either first or last name is undefined.");
    }
    return employee.firstName + " " + employee.lastName;
}
```

By checking that both the `firstName` and `lastName` fields are defined, the TypeScript compiler knows that the final line with the `return` statement can compile correctly. The benefit of this approach is that type checking is more explicit, and in the case where `undefined` values are present, you can throw a more explicit error about what went wrong.

### Non-null assertion operator

You can use the TypeScript [non-null assertion operator ↗](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#non-null-assertion-operator) (`!`) to ignore the `undefined` case.

```typescript
@Function()
public getFullName(employee: Employee): string {
    return employee.firstName! + " " + employee.lastName!;
}
```

This approach simply overrides the TypeScript compiler and asserts that the fields you're accessing are defined. Although this makes for more concise code, this can lead to cryptic errors in the case when one of the fields turns out to be `undefined`. We recommend making explicit checks when possible.
