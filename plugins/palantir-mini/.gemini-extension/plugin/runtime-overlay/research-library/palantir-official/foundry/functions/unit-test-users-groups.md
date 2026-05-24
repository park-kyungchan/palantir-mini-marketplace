---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/unit-test-users-groups/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/unit-test-users-groups/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ec253830ae81163e4bfe480e86817ebb02cd3c83fa291e64c47baf3743e7b05c"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Unit testing > Mock users and groups"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Mock users and groups

### User mocks

You are able to create partial mock of a user using `createUser`, where all properties besides `id` and `username` are optional. You need to import `{ createUser }` from `"@foundry/functions-testing-lib"`.

```typescript
import { MyFunctions } from ".."

import { verifyOntologyEditFunction, createGroup, createUser } from "@foundry/functions-testing-lib";

describe("example test suite", () => {
    const myFunctions = new MyFunctions();
    test("test users and groups", async () => {
        const group = createGroup({
            id: "groupId",
        });
        const user = createUser({
            id: "userId",
            username: "username",
        });
        await expect(myFunctions.searchUsers("userId", "groupId")).resolves.toEqual([user, group]);
    });
});
```

This can be used to test the following function:

```typescript
import { Function, OntologyEditFunction, Users, Group, Principal } from "@foundry/functions-api";

export class MyFunctions {
    @Function()
    public async searchUsers(userId: string, groupId: string): Promise<Principal[]> {
        const existingPrincipals = await Promise.all([
            Users.getUserByIdAsync(userId),
            Users.getGroupByIdAsync(groupId),
        ]);
        return existingPrincipals.filter(r => !!r).map(r => r!);
    }
}
```

### Group mocks

You are also able to create partial mock of a group using `createGroup`, where all properties besides `id` are optional. You need to import `{ createGroup }` from `"@foundry/functions-testing-lib"`.

```typescript
import { MyFunctions } from ".."

import { verifyOntologyEditFunction, createGroup } from "@foundry/functions-testing-lib";

describe("example test suite", () => {
    const myFunctions = new MyFunctions();
    test("test groups", async () => {
        const group = createGroup({
            id: "groupId",
        });
        await expect(myFunctions.searchGroups("groupId")).resolves.toEqual([group]);
    });
});
```

This can be used to test the following function:

```typescript
import { Function, OntologyEditFunction, Users, Group, Principal } from "@foundry/functions-api";

export class MyFunctions {
    @Function()
    public async searchGroups(groupId: string): Promise<Principal[]> {
        const existingPrincipals = await Promise.all([
            Users.getGroupByIdAsync(groupId),
        ]);
        return existingPrincipals.filter(r => !!r).map(r => r!);
    }
}
```
