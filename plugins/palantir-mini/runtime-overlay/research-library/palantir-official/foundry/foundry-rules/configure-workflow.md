---
sourceUrl: "https://www.palantir.com/docs/foundry/foundry-rules/configure-workflow/"
canonicalUrl: "https://palantir.com/docs/foundry/foundry-rules/configure-workflow/"
sourceLastmod: "2026-05-12T17:06:26.153Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d8535f8b54419dfec2e6d1f82be29634d5638d135ecb2aa5ce0c5dcc012f0256"
product: "foundry"
docsArea: "foundry-rules"
locale: "en"
upstreamTitle: "Documentation | Deploy > Configure workflow"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure workflow

Once you finish [deploying the workflow template](/docs/foundry/foundry-rules/deploy-workflow/), the following steps will guide you through the process of [configuring your workflow](/docs/foundry/foundry-rules/foundry-rules-workflow-configuration/).

1. **Access existing rule:** From the Foundry Rules home page, choose from a list of existing rules by selecting the item. Alternatively, you may also navigate and select it from its respective project found in **Files**. <br><br>
   ![List of existing rules in Foundry Rules](/docs/resources/foundry/foundry-rules/overview@2x.png) <br><br>

2. **Add workflow inputs:** With the rule in view, select the **Add Input** button to add an object or dataset input to the workflow. This will become usable as an input to the rule authored in the next section.
   * You can add as many inputs here as you wish, but all workflows must contain at least one input.
   * When adding object type inputs, the link types section will appear below each object type. Any links selected will become usable in the [Rules Management application](/docs/foundry/foundry-rules/workshop-application/) for joining together different objects. <br><br>
     ![Button to add a new Workflow Input](/docs/resources/foundry/foundry-rules/add_workflow_input.png) <br><br>

:::callout{theme="neutral"}
Objects backed by a restricted view cannot be used as inputs directly. Instead, configure the dataset which backs the restricted view as an [alternate backing dataset](/docs/foundry/foundry-rules/configure-workflow/#alternate-backing-datasets).
:::

3. **Add workflow outputs:** In the third section of the editor, click **Add Dataset Output** and provide a name and location for the dataset where the rule results will be output. <br><br>
   ![Button to add a new Workflow Output](/docs/resources/foundry/foundry-rules/add_workflow_output.png) <br><br>

   * Provide a name for the output that will be displayed to rule authors in the **Rules Management application** (a).
   * Click **Add column** to add at least one column to the output (b). Give this column a name to be used in the dataset and a display name to show to rule authors in the rules application. You can configure the type of column and determine whether it is required to provide this column when authoring a rule. Learn more about [permitted and default output values](/docs/foundry/foundry-rules/permitted-and-default-output-values/).
   * Add a column for each piece of information you wish to capture from the results of your rule. For example, an alerting workflow may have columns for `Alert ID`, `Severity`, and `Assignee` as well as a column to capture an identifier for the object that triggered the alert (e.g. `Machine ID`). <br><br>
     ![Configuring the Workflow Output](/docs/resources/foundry/foundry-rules/workflow_output_configuration.png) <br><br>

4. **Save the workflow:** In the top right of the configuration editor, click the save button.
   * After saving the workflow, you should see a green banner appear at the top of the editor, signifying that the [transforms pipeline](/docs/foundry/foundry-rules/foundry-rules-workflow-configuration/#rule-execution) has been created successfully. <br><br>
     ![Banner showing that the transforms pipeline has been created successfully](/docs/resources/foundry/foundry-rules/transforms-pipeline-success-banner.png) <br><br>

After completing the above steps, learn how to [author and run a rule](/docs/foundry/foundry-rules/author-and-run-a-rule/).

## Advanced configurations

### Alternate backing datasets

You can configure an object input with an alternate backing dataset. This means your rules are evaluated against the supplied alternate backing dataset instead of the writeback (or backing) dataset configured in the Ontology.

This is useful when:

* Writing rules on restricted view-backed objects
* Running rules on a subset of the Object's backing data <br><br>
  <img src="./media/configuring_alternate_backing_datasets.png" alt="Configuring an alternate backing dataset" width="800" />

<br><br>
