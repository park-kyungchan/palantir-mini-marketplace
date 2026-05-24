---
sourceUrl: "https://www.palantir.com/docs/foundry/solution-designer/tutorial-create-your-first-diagram/"
canonicalUrl: "https://palantir.com/docs/foundry/solution-designer/tutorial-create-your-first-diagram/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "23f73f321d010062bf405f93064c63bc90ae2dc8f01338d3fa0b4d4bf1b61424"
product: "foundry"
docsArea: "solution-designer"
locale: "en"
upstreamTitle: "Documentation | Solution Designer > Tutorial: Create your first diagram"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Tutorial: Create your first diagram

In this section, we will create a simple diagram representing a common connection to an external system, a data transformation, and an ontology layer that users can interact with in the Palantir platform. This is a common pattern in the platform and serves as a strong foundational point for working with Solution Designer tools.

1. Create a new diagram by selecting **New diagram**.

![New Diagram](/docs/resources/foundry/solution-designer/first-diagram-1.png)

2. Select **External System** and navigate to **External System** within the menu.

![Select External System](/docs/resources/foundry/solution-designer/first-diagram-2.png)

3. Hover over the right edge of the  **External System** node until you see a **+** symbol. Click and select the **Data Connector** option at the top of the list.

![Edge Connector](/docs/resources/foundry/solution-designer/first-diagram-3.png)

4. Now, hover over the new **Data Connector** node to click and select **Dataset** to generate a **Dataset Name** node.

5. Hover over **Dataset Name**, then click and select **Data Processing → Pipeline Builder** to add a **Pipeline** node.

6. Continue with this pattern to achieve the following flow: External System → Data Connector → Dataset → Pipeline Builder → Dataset → Object → Workshop → User Group.

![New Diagram](/docs/resources/foundry/solution-designer/first-diagram-4.png)

7. Press and hold `Shift` and select the **Pipeline Builder** node together with the **Dataset** node, grouping these two components together. You may also group them by right-clicking on selected items and then selecting **Group**.

![Create group](/docs/resources/foundry/solution-designer/first-diagram-5.png)

8. Name the group **Data Transformation**.

9. Choose **Save** in the top right corner to complete your first diagram.

Solution Design provides additional diagram functionality that can be useful for building out your use cases. Learn more in our [diagrams documentation](/docs/foundry/solution-designer/diagrams/).

![Complete first diagram](/docs/resources/foundry/solution-designer/first-diagram-6.png)

## Tips

* Align with enterprise architects in your organization on how your Workshop application will pull from the Ontology. Initially, you can create a single generic **Ontology** node to abstractly represent all your objects.
* Align the five data domain owners on what types of data you will be using; create five different Ontology nodes, one per domain, to show from where your Workshop application will be pulling.

Your diagram does not need to be a one-to-one, detailed representation of what you will actually build. You may choose to first represent your use case conceptually, then iterate over time once additional details begin to appear.
