---
sourceUrl: "https://www.palantir.com/docs/foundry/recipes/create-a-recipe/"
canonicalUrl: "https://palantir.com/docs/foundry/recipes/create-a-recipe/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "2b3d53b6fce14da2ea49d29f0c970726046bf70d7922103e8fe77dc716c194b0"
product: "foundry"
docsArea: "recipes"
locale: "en"
upstreamTitle: "Documentation | Recipes [Sunset] > Create a recipe"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Create a recipe

There are many ways to create a recipe in Foundry. Use this guide to learn how to create a recipe from the Recipes application, Dataset Preview, and Quiver.

## From the Recipes application

Open the Recipes application from the navigation sidebar.

![Recipes in Foundry navigation sidebar](/docs/resources/foundry/recipes/see_all_recipes.png)

Click **New Recipe** in the top right of the interface.

![New recipe button in Recipes interface](/docs/resources/foundry/recipes/home-page-new-recipe.png)

You will then be directed to choose a resource to monitor through the recipe.

## From Dataset Preview

To create a new recipe from the Dataset Preview application, select **Create a recipe** in the **Actions** menu.

Recipes allow you to send a preview of the dataset by defining the following:

* Columns of interest
* A message to send with the preview
* The recipients
* The conditions under which the preview will be sent
* The type of message (email or notification)

:::callout{theme="neutral"}
A maximum of five columns can be sent in a preview.
:::

![Choose columns in Dataset Preview](/docs/resources/foundry/recipes/data_selectcols.png)

## From Reports

A report can be automated to send out on a schedule to specified recipients as either an attached PDF or an in-email image.

From the Reports **Actions** menu, select **Email on a schedule**.

![Email on a schedule in Actions menu](/docs/resources/foundry/recipes/email.png)

Then, compose a message to send with the preview.

![Compose preview message](/docs/resources/foundry/recipes/report_email.png)

Finally, schedule the email. Select the days on which the report will send. Note that the time zone will default to the recipe creator's local system time zone.

![Schedule report send time](/docs/resources/foundry/recipes/reports_schedule.png)
