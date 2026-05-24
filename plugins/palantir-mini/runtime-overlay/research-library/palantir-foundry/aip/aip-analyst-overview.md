---
source: https://www.palantir.com/docs/foundry/aip-analyst/
fetched: 2026-04-20
section: aip-stack
doc_title: AIP Analyst
---

AIP Analyst
===========

AIP Analyst is an interface for agentic workflows that lets you use natural language to perform ad-hoc analyses across your ontology. You can ask AIP Analyst a question, and the agent will answer by autonomously searching your ontology, creating object sets, and transforming data before generating summaries and visualizations.

Getting started
---------------

You can access AIP Analyst at `/workspace/aip-analyst` to begin asking questions about your ontology.

Example workflow
----------------

As an example, imagine a user that runs a coffee chain and wants to perform a competitive analysis. They want to examine whether it is viable to open a new location in Northampton, England. To start an analysis, this user can ask "Which coffee shops are within 10km of Northampton? Are any chains particularly prominent?"

AIP Analyst will then traverse the ontology, find the coffee shop data, and identify the shops that meet the criteria. It will then derive insights on their relative ratings and best selling products. AIP Analyst searches across your ontology for relevant data using multiple search terms to increase the likelihood of finding a relevant object type.

Capabilities
------------

AIP Analyst leverages several categories of tools during analysis to iteratively find, analyze, and present the answer to a natural language query. You can customize the tools that are available for AIP Analyst to use by selecting checkboxes from the **Tools** menu.

### Ontology resource discovery

These tools enable AIP Analyst to discover the relevant object types and datasets for the request.

* **Object type search:** Identifies relevant object types based on object type metadata, such as display name, ID, description, or status.
* **Object type lookup:** Retrieves comprehensive metadata for a *specific object type*, including properties and links to related object types.
* **Object search:** Searches across the entire ontology or specified object types, returning matched objects grouped by object type.

### Data selection, transformation, and filtering

With the correct context defined, AIP Analyst can use the following tools to explore and analyze retrieved data.

* **Object set:** Creates an object set, optionally filtered or transformed by applying operations such as filters, search-arounds, or semantic search.
* **Object lookup:** Retrieves a specific object from a given object type, returning all property values for that object.
* **Ontology aggregation:** Performs aggregation operations on object sets with optional grouping properties. Supported operations include count, sum, average, min, max, percentile, cardinality, standard deviation, and variance.
* **Ontology SQL:** Executes SQL queries against object sets, returning tabular data that can be used for complex analysis or chained into further queries.
* **Dataset SQL:** Executes SQL queries against datasets to retrieve and analyze data, returning tabular data that can be used for further analysis or chained into subsequent queries.

### Visualization

AIP Analyst can present its outputs using data visualization tools. The **Create Visualization** tool allows you to use Vega charts to build interactive visualizations from tabular data including ontology aggregations, SQL results, or dataset queries. The **Map Visualization** tool lets you visualize geospatial data.

Session persistence
-------------------

AIP Analyst does not currently retain conversation history after a session is closed. Users are encouraged to save their queries and Vega-Lite visualization code to pick up where they left off.

Note: AIP feature availability is subject to change and may differ between customers.
