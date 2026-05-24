---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-references/apollo-api-documentation/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-references/apollo-api-documentation/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "01c60627857e8d274fc44ba5fdba76ba0d93fce0b335e259856a8320c8a0879b"
product: "apollo"
docsArea: "apollo-references"
locale: "en"
upstreamTitle: "Documentation | Reference > Apollo API specification"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Apollo API Explorer

Certain Apollo APIs are available directly through GraphQL. [GraphQL ↗](https://graphql.org/) is a query language that allows you to precisely fetch the data you want. This is exposed directly in your Apollo Hub through the **API Explorer** application. The documentation explorer lists all information accessible in your Hub through GraphQL.

![The API explorer interface in Apollo showing the GraphQL query panel.](/docs/resources/apollo/apollo-references/api-explorer.png)

## Documentation

Use the documentation explorer to view all queries and mutations available in the Apollo GraphQL schema. This presents a searchable interface to navigate through the nested schema that branches off the root-level query and mutation type.

![The Show Documentation button in the API explorer sidebar.](/docs/resources/apollo/apollo-references/show-documentation-explorer.png)

![The documentation explorer panel displaying available queries and types.](/docs/resources/apollo/apollo-references/documentation-explorer.png)

## Examples

The following are introductory examples to get familiar with interacting with Apollo APIs.

1. Getting the current user

```graphql
query GetCurrentUser {
  me {
    id
    fullName
  }
}
```

2. Getting a page of Environments

```graphql
query GetEnvironments {
  apollo {
    environments(pageSize: 100) {
      environments {
        id
      }
    }
  }
}
```
