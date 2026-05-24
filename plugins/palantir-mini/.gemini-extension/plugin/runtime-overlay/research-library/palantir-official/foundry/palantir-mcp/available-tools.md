---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-mcp/available-tools/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-mcp/available-tools/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "89ef62b271b1315033d928c4adf05af8136be2cff7e0a8e4c75c1c956f0800dc"
product: "foundry"
docsArea: "palantir-mcp"
locale: "en"
upstreamTitle: "Documentation | Palantir MCP > Available tools"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Available tools

Palantir is continually developing more tools, prompts, and resources to improve Palantir MCP. Currently, Palantir MCP provides the following tools:

## Compass tools

| Tool name                           | Description                                                                                                             |
|-------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| **list\_resources\_in\_foundry\_folder** | Returns resources available in a given folder or project RID, with pagination support.                                |
| **get\_project\_imports**             | Returns datasets that have been imported into the current Foundry project, with pagination support.                     |
| **list\_foundry\_namespaces**         | Lists all Foundry namespaces that the user has access to. Useful for discovering available namespaces before creating a project. |
| **list\_foundry\_project\_templates**  | Lists available project templates for a Foundry namespace. Templates define the initial structure and settings for new projects. |
| **create\_foundry\_project**          | Creates a new Foundry project in a specified namespace using a specified template.                                       |
| **search\_foundry\_projects**         | Searches for Foundry projects by name or description. Returns matching projects with their RID, name, description, and path. |

## Dataset tools

| Tool name                              | Description                                                                                       |
|----------------------------------------|---------------------------------------------------------------------------------------------------|
| **get\_foundry\_dataset\_schema**         | Returns the definition of a Palantir dataset for a given dataset RID or dataset path, including schema information. |
| **run\_sql\_query\_on\_foundry\_dataset**   | Returns the result of running a SQL query on a Palantir dataset on an optional branch.            |
| **create\_and\_write\_to\_foundry\_dataset** | Creates a dataset in Foundry with data provided from a CSV file, useful for uploading local data or creating mock data. |
| **list\_dataset\_files**                 | Lists the files in a Foundry dataset for a given dataset RID or dataset path. Useful for exploring datasets without a schema. |
| **build\_datasets**                     | Builds datasets in Python transforms repositories.                                                |
| **get\_build\_status**                   | Returns the build status of CI checks or dataset builds. Supports checking by build RID, tag, or branch. |
| **search\_dataset\_builds**              | Searches for historic builds based on criteria such as dataset RIDs, build statuses, branches, and time ranges. |
| **get\_job\_status**                     | Retrieves detailed status information for a specific job by job RID, including error messages and source code information. |
| **get\_dataset\_stats**                  | Returns size and file statistics for a Foundry dataset, including total size, number of files, hidden files, and number of transactions. |

## Data Lineage tools

| Tool name              | Description                                          |
|------------------------|------------------------------------------------------|
| **get\_resource\_graph** | Returns the resource graph for data lineage visualization. |

## Ontology tools

| Tool name                                | Description                                                                  |
|------------------------------------------|------------------------------------------------------------------------------|
| **get\_foundry\_ontology\_rid**             | Fetches the ontology RID for a given Foundry OSDK application or local repository. |
| **search\_foundry\_ontology**              | Searches the ontology for relevant ontology entities for a given query.      |
| **search\_foundry\_functions**             | Searches the function registry for relevant ontology entities for a given query. |
| **view\_foundry\_object\_type**             | Allows viewing an existing object type in the ontology, including its properties, link types, and action types. |
| **create\_or\_update\_foundry\_object\_type** | Creates or updates object types in the ontology on a provided branch.        |
| **delete\_foundry\_object\_type**           | Deletes an object type from the ontology on a provided branch.               |
| **view\_foundry\_link\_type**               | Allows viewing an existing link type in the ontology.                        |
| **create\_or\_update\_foundry\_link\_type**   | Creates or updates link types in the ontology on a provided branch.          |
| **delete\_foundry\_link\_type**             | Deletes a link type from the ontology on a provided branch.                  |
| **view\_foundry\_action\_type**             | Allows viewing an existing action type in the ontology, including its parameters, logic rules, and dependent object types. |
| **create\_or\_update\_foundry\_action\_type** | Creates or updates action types in the ontology on a provided branch. Supports object modifications, deletions, and link operations. |
| **delete\_foundry\_action\_type**           | Deletes an action type from the ontology on a provided branch.               |

## Object set tools

| Tool name                      | Description                                                |
|--------------------------------|------------------------------------------------------------|
| **query\_ontology\_objects**     | Queries ontology objects based on specified criteria with pagination support.      |
| **aggregate\_ontology\_objects** | Performs aggregation functions on object fields, supporting grouping, filtering, and multiple aggregation types.   |

## OSDK tools

| Tool name                     | Description                                                              |
|-------------------------------|--------------------------------------------------------------------------|
| **get\_ontology\_sdk\_context**  | Fetches curated documentation about the ontology SDK for the user's OSDK repository. |
| **get\_ontology\_sdk\_examples** | Retrieves code examples for using the ontology SDK, filtered by SDK version and topic. |

## Platform SDK tools

| Tool name                          | Description                                                  |
|------------------------------------|--------------------------------------------------------------|
| **list\_platform\_sdk\_apis**         | Lists available Platform SDK APIs for a given Foundry product. |
| **get\_platform\_sdk\_api\_reference** | Gets API reference documentation and code examples for Platform SDK API endpoints. |

## Code Repository tools

| Tool name                                    | Description                                                                       |
|----------------------------------------------|-----------------------------------------------------------------------------------|
| **get\_repository\_context**                   | Fetches curated context about the current Foundry code repository, including project and ontology information. |
| **create\_python\_transforms\_code\_repository** | Creates a new Python transforms code repository from scratch.                     |
| **clone\_code\_repository\_locally**            | Clones an existing Foundry code repository to a local directory.                  |
| **create\_code\_repository\_pull\_request**      | Creates a pull request in a Foundry code repository.                              |
| **list\_code\_repository\_pull\_requests**       | Lists pull requests for a Foundry code repository with filtering by status, branch, author, and title. |
| **get\_code\_repository\_pull\_request**         | Gets comprehensive information about a pull request, including review status, CI build status, and all comments. |
| **create\_code\_repository\_pull\_request\_comment** | Creates a comment on a Foundry code repository pull request. Supports general comments and inline comments anchored to a specific file and line. |

## Global Branching tools

| Tool name                   | Description                                                                                  |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **create\_global\_branch**   | Creates a new Global Branch with a specified display name and description.                  |
| **view\_global\_branch**     | Allows viewing an existing Global Branch, including branched resources and ontology modifications. |
| **close\_global\_branch**    | Closes an existing Global Branch.                                                           |
| **create\_global\_proposal** | Creates a new Global proposal, which is the final step of a Global branch.                 |
| **view\_global\_proposal**   | Allows viewing an existing Global proposal and gets contextual information based on its status. |
| **close\_global\_proposal**  | Closes an existing Global proposal without merging it.                                      |

## Developer Console tools

| Tool name                                    | Description                                                                                               |
|----------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **connect\_to\_dev\_console\_app**               | Connects a non-Foundry Git repository to a Developer Console application.                                 |
| **convert\_to\_osdk\_react**                    | Converts an existing OSDK application to use `@osdk/react` with OsdkProvider2 and optionally `@osdk/react-components`. |
| **generate\_new\_ontology\_sdk\_version**        | Adds ontology entities modified by a given Foundry proposal to the ontology SDK and generates a new version of that SDK. |
| **install\_sdk\_package**                      | Checks the status of an SDK package generation and provides installation instructions when ready.         |
| **view\_osdk\_definition**                     | Fetches a high-level overview of the OSDK definition, including object types, link types, action types, and functions. |

## Compute module tools

| Tool name                             | Description                                                                                    |
|---------------------------------------|------------------------------------------------------------------------------------------------|
| **get\_compute\_modules\_documentation** | Fetches curated documentation about Compute Modules and the `compute_modules` Python SDK.        |
| **get\_compute\_modules\_info**          | Gets status and configuration for a compute module, including runtime status, scaling config, and runtime parameters. |
| **get\_compute\_modules\_logs**          | Retrieves the latest logs for a compute module by build job RID, with pagination support.      |
| **manage\_compute\_modules**            | Manages a compute module lifecycle: start, stop, or configure dev mode for automatic upgrades. |
| **execute\_compute\_modules\_function**  | Executes a compute module function synchronously. Only works with compute modules running in `FUNCTION` mode. |

## Data Connection tools

| Tool name                                      | Description                                              |
|------------------------------------------------|----------------------------------------------------------|
| **create\_foundry\_rest\_api\_data\_source**        | Creates a REST API data source connection in Foundry for integrating with external systems. |
| **create\_foundry\_rest\_api\_data\_source\_webhook** | Creates a webhook for a REST API data source in Foundry. |
| **update\_foundry\_rest\_api\_data\_source\_webhook** | Updates an existing webhook in Foundry by publishing a new version with an updated spec.   |
| **view\_foundry\_rest\_api\_data\_source\_webhook**   | Fetches the latest version of an existing webhook in Foundry, including its metadata, spec, inputs, calls, and outputs. |
| **get\_or\_create\_network\_egress\_policy**        | Gets or creates a network egress policy in Foundry. Useful when creating REST API data sources and webhooks. |

## Documentation search tools

| Tool name                                      | Description                                                                                                   |
|------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| **get\_python\_transforms\_documentation**        | Fetches curated documentation about Python transforms and the` transforms.api` SDK.                             |
| **get\_typescript\_v1\_functions\_documentation**  | Retrieves documentation and code snippets for TypeScript v1 function repositories.                            |
| **get\_typescript\_v2\_functions\_documentation**  | Retrieves documentation and code snippets for TypeScript v2 function repositories.                            |
| **get\_custom\_widget\_documentation**            | Gets comprehensive documentation for custom widgets, including React widgets for Workshop and Slate.          |
| **get\_ml\_documentation**                       | Fetches comprehensive ML documentation for Python transforms, covering model training, MLOps, and framework-specific patterns. |
| **get\_spark\_profile\_documentation**            | Fetches documentation on Spark profile configuration for Python transforms, including guidance for selecting executor memory, number of executors, and driver settings. |
| **get\_osdk\_react\_components\_documentation**    | Gets documentation for the `@osdk/react-components` library, including `ObjectTable` and other pre-built components. |
| **load\_foundry\_documentation\_page**             | Loads a full Palantir Foundry documentation page by its path and returns the complete page content in Markdown format. |
| **get\_documentation\_summaries**                 | Retrieves a curated documentation summary bundle for a specific Foundry topic area, covering key concepts, patterns, and reference material. |
| **search\_foundry\_documentation**               | Searches Palantir Foundry platform documentation indices for relevant context snippets for a given query. **This tool is only available with AIP.** |
