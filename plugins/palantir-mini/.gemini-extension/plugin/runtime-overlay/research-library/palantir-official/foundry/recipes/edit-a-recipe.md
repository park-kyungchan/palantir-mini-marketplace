---
sourceUrl: "https://www.palantir.com/docs/foundry/recipes/edit-a-recipe/"
canonicalUrl: "https://palantir.com/docs/foundry/recipes/edit-a-recipe/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "15f4cbc2d4843aef3ee58aacbd8f20979f088cf4df7d90189df586b7bb18aa25"
product: "foundry"
docsArea: "recipes"
locale: "en"
upstreamTitle: "Documentation | Recipes [Sunset] > Edit a recipe"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Edit a recipe

Based on your permission level, you can perform different actions on a recipe. Recipes can be edited via the Recipe Management page.  Learn more about the [recipe permissions model](/docs/foundry/recipes/core-concepts/#privacy-permissions-and-sharing).

First, click on the recipe you would like to modify, then select the settings cog to open a menu.

![Recipe settings menu](/docs/resources/foundry/recipes/edit_recipe_part1.png)

Select **Edit**, then **Configuration** to modify the recipe.

![Edit recipe configuration](/docs/resources/foundry/recipes/edit_recipe_part2.png)

## Add recipients to a recipe

To add recipients to an existing recipe, select **Recipients** from the **Edit** menu.

Note that by default, the maximum number of recipients is set to 25 to preserve overall performance.

![Edit recipe recipients](/docs/resources/foundry/recipes/add_recipients_to_existing.png)

## Mute or pause a recipe

If you wish to stop receiving notifications from a particular recipe, you can mute the recipe. A muted recipe is not deleted, but it stops sending notifications. Muting a recipe will silence your notifications, but other recipients of the recipe will still receive them.

Owners of recipes can **Pause for all** which will stop notifications to all recipients. This may be useful if, for example, recipients are away from their computers for an extended period of time and may not wish to receive notifications, or if there is a planned maintenance event on a monitored sensor.

To mute or pause a recipe, select the setting cog on the recipe panel to open a menu. Select **Status**, then choose **Mute** or **Pause** based on your preference.

![Mute or pause recipe](/docs/resources/foundry/recipes/mute_pause_recipe.png)

## Change the expiration date of a recipe

Recipe expiration dates can be extended at any time from the Recipe Management page.

![Recipe expiring soon](/docs/resources/foundry/recipes/change_expiration_part1.png)

Click on the recipe you wish to modify, then click the settings cog. Select **Status** from the menu.

To extend an active recipe, click **Extend**.

![Extend an active recipe](/docs/resources/foundry/recipes/change_expiration_part2.png)

To resume an expired recipe, click **Resume**.

![Resume an expired recipe](/docs/resources/foundry/recipes/resume_expired_recipe.png)

Additionally, recipes can be extended by first selecting the recipe card on the Recipe Management page, then selecting **Resume** from the information panel on the right side of the screen. Authors should receive an email reminding them to extend their recipe that includes a link to this view.

![Resume recipe from management page](/docs/resources/foundry/recipes/extend_recipe_part1.png)

![Expiration notification](/docs/resources/foundry/recipes/extend_recipe_part2.png)

Learn more about [recipe expiration](/docs/foundry/recipes/core-concepts/#expiration).

## Delete a recipe

From the Recipes Management page, first click on the recipe you would like to modify. Then, select the settings cog to open a menu. Select **Delete**.

:::callout{theme="warning"}
You can only delete recipes you own. A deleted recipe will no longer operate for other recipients of that recipe. To stop a recipe from notifying you without deleting it, [mute the recipe](#mute-or-pause-a-recipe).
:::

![Delete recipe](/docs/resources/foundry/recipes/delete_recipe.png)
