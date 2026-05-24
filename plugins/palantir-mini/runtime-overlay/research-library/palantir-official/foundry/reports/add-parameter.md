---
sourceUrl: "https://www.palantir.com/docs/foundry/reports/add-parameter/"
canonicalUrl: "https://palantir.com/docs/foundry/reports/add-parameter/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "b73ca972208c8b192113b28bf0d162d6b41edf64c734ee78c42dffe677d4d89a"
product: "foundry"
docsArea: "reports"
locale: "en"
upstreamTitle: "Documentation | Parameters > Add a parameter"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add a parameter

## Add a parameter within text

You may wish to display the current value of a parameter within a block of text. To do this:

1. Select some text.

2. Click the **Parameter** button in the formatting toolbar to create a new string parameter. <br><br>
   ![Create text parameter](/docs/resources/foundry/reports/howtos-work-with-parameters-add-a-parameter-within-text-1.gif) <br><br>

3. Merge the new parameter into the desired Contour parameter. [Learn more about merging parameters.](/docs/foundry/reports/merge-multiple-parameters/) <br><br>
   ![Merge parameters](/docs/resources/foundry/reports/howtos-work-with-parameters-add-a-parameter-within-text-2.gif) <br><br>

The current value of the merged parameter will now appear inline when in Viewing mode (in Editing mode, only the name of the parameter will appear inline). <br><br>
![Inline text parameter](/docs/resources/foundry/reports/howtos-work-with-parameters-add-a-parameter-within-text-3.png) <br><br>

## Add a parameter from another Foundry application

Some Foundry Applications allow editors to add parameters to control how data is filtered in a visualization. Adding a widget from another Foundry application to a report (e.g., [Add boards from Contour](/docs/foundry/reports/add-content-from-other-apps/)) will also automatically add any parameters that affect it.

### Add a parameter from Contour

[Learn more about parameters in Contour.](/docs/foundry/reports/parameters-overview/)

1. Open a Contour analysis, then create or open a path.

2. *(If needed)* Switch to Editing mode.

3. Create a parameter (e.g. a String parameter named `$value`). <br><br>
   ![Create a parameter](/docs/resources/foundry/reports/howtos-work-with-parameters-add-a-parameter-from-another-foundry-application-1.png) <br><br>

4. Add a [Filter board](/docs/foundry/contour/boards-filter/) to your path. Enter the name of a column to filter, then enter the name of your parameter (e.g. `$value`) in the value field. <br><br>
   ![Add a Filter board](/docs/resources/foundry/reports/howtos-work-with-parameters-add-a-parameter-from-another-foundry-application-2.gif) <br><br>

5. Create a visualization board *(e.g. Chart, Table)* below the Filter board.

6. Add the visualization board to a report (see: [Add boards from Contour](/docs/foundry/reports/add-content-from-other-apps/))).

The visualization board will appear in the report you selected, and the `$value` parameter will appear in the report's parameters bar. Changing the parameter value will now change the data that appears in the visualization board.

![Parameters bar](/docs/resources/foundry/reports/howtos-work-with-parameters-add-a-parameter-from-another-foundry-application-3.png)

### Add a parameter from Code Workbook

Like Contour, Code Workbook allows editors to filter data with parameters.

* See [Using Parameters with Templates](/docs/foundry/code-workbook/templates-overview/) to learn how to create parameters in Code Workbook
* See [Add boards from Code Workbook](/docs/foundry/reports/add-content-from-other-apps/) to learn how to add parameterized content from Code Workbook to a report.
