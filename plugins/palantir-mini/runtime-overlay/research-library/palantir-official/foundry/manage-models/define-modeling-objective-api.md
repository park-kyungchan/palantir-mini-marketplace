---
sourceUrl: "https://www.palantir.com/docs/foundry/manage-models/define-modeling-objective-api/"
canonicalUrl: "https://palantir.com/docs/foundry/manage-models/define-modeling-objective-api/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7e2c677a60186298bb06e20c7ba84c4d0a0c672e372f2735e6ab548dc21872f3"
product: "foundry"
docsArea: "manage-models"
locale: "en"
upstreamTitle: "Documentation | Modeling objective configuration > Define modeling objective API"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Define modeling objective API

:::callout{theme="warning" title="Sunsetted functionality"}
The below documentation describes binding models to the ontology in Modeling Objectives, which is no longer recommended for most use cases. Consider [direct model deployment as a function](/docs/foundry/model-integration/model-functions-guide/) instead to use models in downstream applications, including [Workshop](/docs/foundry/workshop/functions-use/), [Slate](/docs/foundry/slate/concepts-foundry-functions/), [Actions](/docs/foundry/action-types/function-actions-overview/), and [more](/docs/foundry/functions/use-functions/).
:::

To specify how users or applications should use your modeling objective within Foundry, you can create an API for your objective.

To define input and output APIs for a new objective, select **Modeling objective details** and edit the **Objective API** section. This will take you to the **Define modeling objective API** page, as shown below:

![Define inputs and outputs initial state](/docs/resources/foundry/manage-models/howto_howto-api-init.png)

On the left-hand panel (shown above) labeled **Define initial objective API**, you can choose one of the following methods to help start populating the modeling objective API (or you can manually define the inputs and outputs on the right):

* If you select **Object Type**, proceed to the [documentation on mapping object properties](#mapping-your-objective-api-to-the-ontology).
* If you already have a model in mind that you would like to submit to this objective, you can start from the Model's API by following the [steps below](#adding-properties-from-a-model) by selecting **Model**. At this time, this workflow is only supported for ontology-backed models.
* If you want your objective API to have inputs or outputs based on columns of any existing Foundry dataset, selecting **Dataset** will let you easily create properties based on those columns, as described in the [documentation here](#adding-properties-from-dataset-columns).

## Manually defining API input and outputs

To manually define an API, you can directly specify input and output properties and then select an object type to map properties to the ontology.

Click the “Add input” or “Add output” button, and specify the property name, the type, and, optionally, the description. The type should be one of:

* `boolean`
* `datetime`
* `double`
* `long`
* `integer`
* `string`

If the type of the property is expected to be unknown, the `any` type should be used.

![Define input and outputs directly](/docs/resources/foundry/manage-models/howto_howto-api-direct.png)

After defining input and output properties, you can optionally [map them to object properties](#mapping-your-objective-api-to-the-ontology), as described in the next section.

:::callout{theme="neutral"}
The API defines the format of the input and output for any models submitted to the modeling objective. The input will be given as single dataframe, and the column names of this dataframe should match the names given in the Inputs section shown above. Similarly, the modeling objective will expect model's output dataframe to have columns matching those specified in Outputs.
:::

## Mapping your objective API to the Ontology

You can provide additional metadata to each field in your objective API by *mapping* (also known as *binding*) each field to an object property in the Ontology. Mapping properties is highly recommended if the modeling objective should use data from the Ontology or if the modeling objective will be used to power operational applications that are backed by the Ontology.

For example, using [Scenarios](/docs/foundry/workshop/scenarios-overview/) in a Workshop application requires that your objective API to be mapped to the Ontology. This is because Scenarios will use these input mappings to fetch the appropriate input data when executing your model and use the output mappings to determine ontological properties to overwrite.

See below for what mapping means for input and output properties:

* For an input property, this indicates that the data for that property should be pulled from the mapped object type and property.
* For an output property, this indicates that the model output for that property must be compatible with, and may be written to, the mapped object type property.

:::callout{theme="neutral"}
Ontology mappings can be used by operational applications to fetch inputs to your model and subsequently overwrite ontology properties with the output of your model. For this reason, it is very important you understand how applications may be using your objective if you add ontology mappings.
:::

To map to object properties, you can either select "object type" on the left, or toggle the "Map to Ontology" switch in the top-right. From there, select the "root" object type you want to map to. The object properties available for mapping will be those on this object, as well as any objects linked to the selected object by a many-to-one relation.

![Select object type](/docs/resources/foundry/manage-models/howto_howto-api-select-object-type.png)

After selecting an object type, all the properties of that object type will be available for mapping. To map a property, click the **In** or **Out** button next to the property:

![Add property to inputs](/docs/resources/foundry/manage-models/howto_howto-api-click-add-property-to-inputs.png)

The property type can also be dragged to the **Inputs** or **Outputs** section, via the drag handle on the left side of the property.

![Drag property to inputs](/docs/resources/foundry/manage-models/howto_howto-api-drag-property-to-inputs.png)

All the properties of the object type can also be added at once, by dragging the entire object card via the drag handle to the left of the object icon:

![Drag all object properties to inputs](/docs/resources/foundry/manage-models/howto_howto-api-drag-all-object-properties.png)

To map properties from a linked object type, scroll down to the bottom of the left side bar. If a linked object is available, the **Add linked object type** button should be visible. Select that button and choose a linked object type.

![Add linked object](/docs/resources/foundry/manage-models/howto_howto-api-add-linked-object-type.png)

That linked object’s properties will now be available for mapping:

![Add linked object property to API](/docs/resources/foundry/manage-models/howto_howto-api-add-linked-object-property.png)

By default, mapped properties will have the same name, type, and description as the object property types they are mapped to. If desired, the name and description can be changed to better suit the objective.

Once mapping has been finished, select the **Save** button in order to save the input and output API mapping to the objective. This API will now document the expected input and output specifications of models that are submitted to this objective.

![Final mapped properties](/docs/resources/foundry/manage-models/howto_howto-api-objects-final-properties.png)

Selecting **Save** at any point will save objective API properties and take you back to the main modeling objective page.

## Adding properties from dataset columns

Choose **Dataset** from the dropdown on the left side to start adding properties to your objective API from existing Foundry datasets.

Use the **Select Dataset** button to browse the file directory and locate your dataset.

![Select dataset](/docs/resources/foundry/manage-models/howto_howto-api-select-dataset.png)

![Browsing for dataset](/docs/resources/foundry/manage-models/howto_howto-api-dataset-selector.png)

If you want to use the dataset on a branch other than the default branch, use the branch selector menu.

![Selecting a branch](/docs/resources/foundry/manage-models/howto_howto-api-dataset-branch.png)

Once you have selected your dataset, you will see all of the dataset's columns listed in the sidebar.

![Dataset has been selected](/docs/resources/foundry/manage-models/howto_howto-api-dataset-selected.png)

Use the **In** or **Out** buttons to add a column to the objective API's input or output. Properties can also be dragged in using the drag handle to the left of the column name. All properties from a dataset can be added at once by dragging the entire dataset card via the drag handle to the left of the dataset name.

![Click to add property from column](/docs/resources/foundry/manage-models/howto_howto-api-dataset-add-property-by-clicking.png)

The column's base property type will be listed if it is a supported type of a modeling objective API. Otherwise, it will be listed as "any."

![Selected properties](/docs/resources/foundry/manage-models/howto_howto-api-properties-chosen.png)

To save the dataset you are working from as a relevant file for the objective, select **Add as relevant file to objective**. At any point, you may select another dataset to work from by selecting **Change** in the sidebar. You may also map properties to the ontology by selecting **Map to ontology** and following the instructions to [map object properties](#mapping-your-objective-api-to-the-ontology).

Choosing to **Save** at any point will save the objective API properties and take you back to the main objective page.

## Adding properties from a model

Choose **Model** from the dropdown on the left side to start adding properties to your objective API from an existing Model.

Use the **Select Model** button to browse the file directory and select a model.

![Select model in dropdown](/docs/resources/foundry/manage-models/howto_howto-api-select-model.png)

![Select model](/docs/resources/foundry/manage-models/howto_howto-api-model-selector.png)

After selecting a model, you will see all of the model's input and output properties listed in the sidebar.

![Selected model](/docs/resources/foundry/manage-models/howto_howto-api-model-selected.png)

Use the **In** or **Out** buttons to add a column to the objective API's input or output. Properties can also be dragged in using the drag handle to the left of the column name. All properties from a model can also be added at once by dragging the entire model card via the drag handle to the left of the model name.

![Selected properties](/docs/resources/foundry/manage-models/howto_howto-api-model-properties-chosen.png)

To save the model you are working from as a relevant file for the objective, select **Add as relevant file to objective**. At any point, you may select another model to work from by selecting **Change** in the sidebar. You may also map properties to the ontology by selecting **Map to ontology** and following the instructions to [map object properties](#mapping-your-objective-api-to-the-ontology).

Clicking **Save** at any point will save the objective API properties and take you back to the main objective page.
