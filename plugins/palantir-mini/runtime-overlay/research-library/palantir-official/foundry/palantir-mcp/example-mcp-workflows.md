---
sourceUrl: "https://www.palantir.com/docs/foundry/palantir-mcp/example-mcp-workflows/"
canonicalUrl: "https://palantir.com/docs/foundry/palantir-mcp/example-mcp-workflows/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "07f686b2585d762a63486fd2323d948b2d34bb4792477e0584370f747aee69a6"
product: "foundry"
docsArea: "palantir-mcp"
locale: "en"
upstreamTitle: "Documentation | Palantir MCP > Example MCP workflows"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Example MCP workflows

This page contains examples of MCP workflows, which are a linked series of actions used by an AI agent to achieve a goal. MCP workflows can involve tool use as well as connection to resources like repositories.

## Repository context discovery

The Palantir MCP is able to provide ontology and code-snippet context to your agent loop. After the context is provided, the agent will be able to perform the following:

* Navigate your code base and use internal Palantir libraries.
* Navigate the remote Foundry project and investigate resources within the project.

Example queries:

* "Fetch code/API context for my Foundry project"
* "Use the Palantir MCP to provide context on this project"
* "Tell me about my repository"

The Palantir MCP currently provides context for `React OSDK`, `Python transform`, and `Typescript function` repositories.

<!--
```mermaid
stateDiagram-v2
    [*] &#45;&#45;> get_repository_context
    get_repository_context &#45;&#45;> get_ontology_sdk_context : OSDK repo
    get_repository_context &#45;&#45;> get_typescript_functions_documentation : Functions repo
    get_repository_context &#45;&#45;> get_python_transforms_documentation : Python transforms repo
    get_ontology_sdk_context &#45;&#45;> search_foundry_documentation
    get_typescript_functions_documentation &#45;&#45;> search_foundry_documentation
    get_python_transforms_documentation &#45;&#45;> search_foundry_documentation
    search_foundry_documentation &#45;&#45;> get_repository_context : Need more context
    search_foundry_documentation &#45;&#45;> [*] : Context complete
```
-->

![Repository context discovery diagram.](/docs/resources/foundry/palantir-mcp/repository-context-discovery-loop.png)

## Dataset search and creation

The Palantir MCP is able to view list datasets, run SQL queries on them, and create datasets with notional data.

:::callout{theme="neutral"}
Note that the Palantir MCP is not allowed to overwrite existing datasets, but can only create new ones. This provides a safeguard for your existing data.
:::

Example queries:

* Explore: "What Foundry Datasets do I have access to?"
* Investigate: "Show me the top delayed Flights in /Path/to/dataset/Flight\_routes."
* Investigate: "Is this dataset clean? `ri.foundry.main.dataset.033384ec-73de-41c1-bebe-45178cfc468b`"
* Create: "Create me a Foundry dataset with notional data. It should have columns ..., and be at least 50 rows."
* Create: "Create me a Foundry dataset with notional data. Use a script to generate 10,000 rows of data."

<!--
```mermaid
stateDiagram-v2
    [*] &#45;&#45;> list_resources_in_foundry_folder/get_project_imports
    list_resources_in_foundry_folder/get_project_imports &#45;&#45;> get_foundry_dataset_schema : Found dataset
    get_foundry_dataset_schema &#45;&#45;> run_sql_query_on_foundry_dataset : Validate
    run_sql_query_on_foundry_dataset &#45;&#45;> [*] : Dataset ready
    run_sql_query_on_foundry_dataset &#45;&#45;> create_and_write_to_foundry_dataset : Data insufficient
    list_resources_in_foundry_folder/get_project_imports &#45;&#45;> create_and_write_to_foundry_dataset : No suitable dataset
    create_and_write_to_foundry_dataset &#45;&#45;> get_foundry_dataset_schema : Verify new dataset
```
-->

![Dataset search and creation diagram.](/docs/resources/foundry/palantir-mcp/dataset-search-and-creation-loop.png)

## Ontology exploration

The Palantir MCP has tools for searching the ontology. The tools allow agents to search through object types, action types, and functions in your ontology.

Example queries:

* "Find me an object type {description}."
* "Find or create me an object type {description}."
* "What functions interacts with this object?"
* "Find me functions {description}."

<!--
```mermaid
stateDiagram-v2
    search_foundry_functions &#45;&#45;> search_foundry_ontology: Find related ontology entities
    search_foundry_ontology &#45;&#45;> search_foundry_functions: Find related functions
    search_foundry_ontology &#45;&#45;> view_foundry_object_type : Found objects types
    search_foundry_ontology &#45;&#45;> view_foundry_link_type : Found link types
    view_foundry_object_type &#45;&#45;> view_foundry_link_type : Explore relationships
    view_foundry_link_type &#45;&#45;> view_foundry_object_type : Follow links
    view_foundry_object_type &#45;&#45;> search_foundry_ontology : Need more entities
    view_foundry_link_type &#45;&#45;> search_foundry_ontology : Need more entities
```
-->

![Ontology exploration diagram.](/docs/resources/foundry/palantir-mcp/ontology-exploration-loop.png)

## Ontology modification and SDK generation

The Palantir MCP can create proposals, modify the ontology, and regenerate your Developer Console OSDK for immediate use in code.

:::callout{theme="neutral"}
Note that all modifications to the ontology must go through the [proposal](/docs/foundry/ontologies/test-changes-in-ontology/) review process. This means that human review and approval is required before the MCP makes any lasting changes to the ontology.
:::

This flow is initiated by ontology-related queries, such as the following:

* "Create an object type {description}"
* "Create a link type {description}"
* "Create an object type {description} and link it to {description}"
* "Create a one-to-many link between {object 1} and {object 2}"
* "Create a many-to-many link between {object 1} and {object 2}"

### SDK generation

<!--
```mermaid
stateDiagram-v2
    [*] &#45;&#45;> create_foundry_branch
    ModifyOntologyEntities: Modify Ontology Entities
    create_foundry_branch &#45;&#45;> view_foundry_branch
    view_foundry_branch &#45;&#45;> ModifyOntologyEntities : Make changes
    ModifyOntologyEntities &#45;&#45;> view_foundry_branch : Review changes
    view_foundry_branch &#45;&#45;> get_or_create_foundry_proposal : Ready to propose
    get_or_create_foundry_proposal &#45;&#45;> generate_new_ontology_sdk_version : User Approval
    generate_new_ontology_sdk_version &#45;&#45;> [*] : SDK generated
    generate_new_ontology_sdk_version &#45;&#45;> view_foundry_branch : Need more changes
```
-->

![Ontology modification and SDK generation diagram.](/docs/resources/foundry/palantir-mcp/ontology-modification-and-sdk-generation-loop.png)

### Object type creation

<!--
```mermaid
stateDiagram-v2
    [*] &#45;&#45;> search_foundry_ontology
    search_foundry_ontology &#45;&#45;> view_foundry_object_type : Found existing
    search_foundry_ontology &#45;&#45;> list_resources_in_foundry_folder/get_project_imports : Relevant object not found
    list_resources_in_foundry_folder/get_project_imports &#45;&#45;> get_foundry_dataset_schema : Found dataset
    list_resources_in_foundry_folder/get_project_imports &#45;&#45;> create_and_write_to_foundry_dataset : No dataset
    create_and_write_to_foundry_dataset &#45;&#45;> create_or_update_foundry_object_type
    get_foundry_dataset_schema &#45;&#45;> create_or_update_foundry_object_type : Dataset ready
    view_foundry_object_type &#45;&#45;> create_or_update_foundry_object_type : Modify existing
    view_foundry_object_type &#45;&#45;> create_or_update_foundry_object_type : Create another object
```
-->

![Object type creation diagram.](/docs/resources/foundry/palantir-mcp/object-type-creation-loop.png)

### Link type creation

<!--
```mermaid
stateDiagram-v2
    view_foundry_object_type &#45;&#45;> search_foundry_ontology : Find related objects
    search_foundry_ontology &#45;&#45;> view_foundry_object_type
    view_foundry_object_type &#45;&#45;> create_or_update_foundry_link_type : Ready to link
    create_or_update_foundry_link_type &#45;&#45;> view_foundry_link_type : Verify link
    view_foundry_link_type &#45;&#45;> create_or_update_foundry_link_type : Create another link
    view_foundry_link_type &#45;&#45;> view_foundry_object_type : Need more objects
```
-->

![Link type creation diagram.](/docs/resources/foundry/palantir-mcp/link-type-creation-loop.png)
