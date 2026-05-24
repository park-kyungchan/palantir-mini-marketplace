---
source: https://www.palantir.com/docs/foundry/agent-studio/citations/
fetched: 2026-04-20
section: aip-stack
doc_title: Citations
---

Citations
=========

AIP Agents with document context or Ontology context will output citations that link out to the source material when selected. These citations will also appear in a **Sources** dropdown menu at the bottom of each message, giving users a clear understanding of the specific context used and referenced in each response.

For other types of context, such as function-backed context or tools, citations are not provided by default. However, users can prompt the agent to include them. If the LLM responds with the correct citation format, the conversation user interface will render the citation.

Citation formats
----------------

The AIP Agent interface currently supports the following citation formats:

* **Ontology object citations** can be returned in either of the two formats below. Selecting the citation bubble will link to the Object Explorer view for that object.

  ```
  <citation><key>ri.phonograph2-objects.main.object....</key></citation>
  ```

  Where the `<key></key>` tags encapsulate the object RID.

  ```
  <citation><objectTypeId>...</objectTypeId><primaryKey>...</primaryKey></citation>
  ```

  Where the `<objectTypeId></objectTypeId>` tags encapsulate the object type ID, which can be found in Ontology Manager, and the `<primaryKey></primaryKey>` tags encapsulate the value of the primary key for that object.

* **Document (PDF) citations** should be returned in the following format:

  ```
  <citation><mediaSetKey>ri.mio.main.media-set...</mediaSetKey><mediaItemKey>ri.mio.main.media-item...</mediaItemKey></citation>
  ```

  Selecting the citation bubble will open a dialog that displays the first page of the document. If you would like to specify a page of the document in your citation, you can provide a `page` tag like so:

  ```
  <citation><mediaSetKey>ri.mio.main.media-set...</mediaSetKey><mediaItemKey>ri.mio.main.media-item...</mediaItemKey><page>12</page></citation>
  ```

  The document dialog will then display that page of the document.

* **External URL citations** should be returned in the following format:

  ```
  <citation><name>My Website</name><href>www.mywebsite.com</href></citation>
  ```

  The citation bubble will display the provided name, for example `My website`, and selecting it will link to the provided URL, for example `www.mywebsite.com`.

You can set up an agent with Ontology context to cite objects in any one of the three formats above by navigating to the **Citations** tab under the Ontology context configuration panel.

Citation settings
-----------------

Citation settings allow you to enable or disable citations globally and override the default click behavior.

The default on-click behavior for ontology and document citations is to open the corresponding document or ontology object. You can override the default ontology context at a granular level for each object type. This can be done in the following ways:

* Open an external URL
* Open a PDF document
* [Update a variable](#citation-variable-updates)

### Citation variable updates

Agents with Ontology object citations can also be configured to update application variables when an object citation is selected. This allows consumers of AIP Agents to display additional information about cited objects outside of the conversation panel.

A common example of this is the AIP Agent Widget in Workshop, where you can use the application state to configure pop-up overlays on selection.

For agents that use function-backed context, you can prompt the agent to return object citations using one of the [custom prompts](#custom-prompts-for-citations).

If your function deals with multiple object types, it may return citations where some correspond to object type A, others to object type B, and so on. To handle such cases, you can create multiple citation variables for your function in the [citation settings](#citation-settings). When a citation is selected, the citation variable that matches the object type will be set to an object set containing the referenced object, while all other citation variables will be set to an empty object set.

### Integrate with Workshop overlays

After configuring your variable updates in AIP Agent Studio, you can connect them to the AIP Agent widget in Workshop.

1. In Workshop, create an empty object set variable for each citation variable you configured in your agent. These variables will be populated whenever a citation from the AIP Agent widget is selected.
2. Create an overlay in the Workshop module.
3. Set the overlay to **Variable-based visibility** and create a Boolean variable that checks whether the Workshop variable you configured in step one is empty. If you have multiple citation variables, you can create multiple overlays or a single overlay with visibility determined by the union of multiple Boolean variables.

Custom prompts for citations
----------------------------

To ensure citations are rendered in the AIP Agent user interface, the citations must be included in the response from the underlying LLM. To accomplish this, the LLM needs to be prompted using one of the formats listed above. This prompt is provided automatically for agents with document and Ontology context. However, for other agents, a custom prompt tailored to the specific use case is necessary.

You can provide a custom prompt to the agent in a few different ways. The first is to provide [instructions](/docs/foundry/agent-studio/core-concepts/#instructions-and-descriptions) using the **LLM Settings** for your agent.

Another option is to use [function-backed context](/docs/foundry/agent-studio/retrieval-context/#function-backed-context), since the output of the context retrieval function is directly pasted into the LLM system prompt.
