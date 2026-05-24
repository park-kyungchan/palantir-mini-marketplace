---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-maintenance/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-getting-started/introduction-maintenance/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "fe111d2a8c0beea76137de5831ce58b21df9eaa1fd496f0e78faf69e74cf03ff"
product: "apollo"
docsArea: "apollo-getting-started"
locale: "en"
upstreamTitle: "Documentation | Getting started > Set maintenance windows"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Set Product and Environment maintenance windows

Environment and Product editors can each set maintenance windows as a constraint that Apollo must satisfy before it can perform an action. A Product contact team may not want their team woken up in the middle of the night for failing software and consequently declare a business hours only window in which their Product can be upgraded. Likewise, Environment contact teams may not want services to update during operational hours.

In this task you will set up Product and Environment maintenance windows to produce a [resolved Entity maintenance window](/docs/apollo/managing-environments/environment-settings/#entity-resolved-maintenance-window).

## Environment maintenance windows

We will configure the following maintenance window for one of your Environments:

* No changes requiring downtime to happening between 6AM and 10PM M-F.
* No changes at all happening, even those that do not require downtime, from 6AM - 10AM M-F.

To set Environment maintenance windows:

1. Choose one of your Environments where you have your Helm chart or Nginx installed and open the Environment’s **Overview** tab.

2. Note that the **Maintenance window** block is set to `All time`. We will set a maintenance window for non-business hours only for changes that require downtime.

3. Select **Edit settings manually** from the **Actions** dropdown.

4. Select **Edit** in the upper right of the Environment settings.

5. Create a new maintenance window definition on line 5:

   ```yaml
    maintenance-windows:
     my-env-downtime:
       time-intervals:
         - MONDAY/22:00-TUESDAY/06:00
         - TUESDAY/22:00-WEDNESDAY/06:00
         - WEDNESDAY/22:00-THURSDAY/06:00
         - THURSDAY/22:00-FRIDAY/06:00
         - FRIDAY/22:00-MONDAY/06:00
       time-zone-name: America/New_York
   ```

6. Create a new definition inside the `maintenance-window` section that prevents changes between 6AM and 10AM M-F:

   ```yaml
      my-env-no-downtime:
       time-intervals:
         - MONDAY/10:00-TUESDAY/06:00
         - TUESDAY/10:00-WEDNESDAY/06:00
         - WEDNESDAY/10:00-THURSDAY/06:00
         - THURSDAY/10:00-FRIDAY/06:00
         - FRIDAY/10:00-MONDAY/06:00
       time-zone-name: America/New_York
   ```

7. Replace the global `downtime` and `no-downtime `definitions on lines 3 and 4 (currently set to  `all-time`) with `my-env-downtime` and `my-env-no-downtime` respectively.

<img alt="Environment maintenance window configuration" src="./media/intro_maintenance_1.png" width=400>

Next you will define your Product (or Nginx) as an Entity that requires downtime in your Environment and must therefore adhere to the `my-env-downtime` window:

8. Find your Product (or Nginx) `- entity-locator` block under the `managed-helm-charts` section of the Environment config.

9. Add the following line under the `release-channel` entry:

```yaml
        maintenance-windows:
         downtime: my-env-downtime
```

10. You are done editing your file, so select **Review**  in the upper right to view a side-by-side comparison of your changes.

11. Once you are satisfied with the file changes, select **Submit**.

<img alt="Environment maintenance window for specific products" src="./media/intro_maintenance_2.png" width=500>

:::callout{theme="neutral"}
Recall that you originally set your Environment accreditation to `DEV`, which means all changes of this nature are automatically approved. In practice, you can subject configuration changes like this to a standard change management process using the workflows and features [outlined in the documentation](/docs/apollo/managing-changes/overview/).
:::

12. Enter a change request title, such as “Update downtime maintenance window to non-business hours”, and a rationale like “Completing Apollo introduction guide”. Select **Submit**.

13. Return to your Environment's **Overview** tab and note the **Maintenance window** block has updated to match your configuration change.

14. Select your Product (or Nginx) in your Environment’s **Entities** tab. The maintenance window in the right-hand panel (which may need to be opened if it is collapsed) now shows an updated window for this Entity.

## Product maintenance windows

I want to prevent Apollo from taking any actions involving my Product between 8PM and 8AM US Eastern Time.

1. Use a hotkey search to bring up your Product (or Nginx) by hitting `Ctrl+K` (Windows) or `Cmd+K` (macOS), entering the Product name, and choosing the correct Product from the list.
2. From the **Actions** dropdown, choose **Edit product settings...**.
3. Select the **Upgrades** tab in the Product settings window.
4. In the **Product maintenance windows** section, choose `New York` as the timezone.
5. Set an entry for each day of the week as shown in the image below.
6. Select **Update**. Your change request will be automatically approved.
7. View your changes in the **Maintenance window** section of the **Product details** panel on the right side of the screen.

<img alt="Product maintenance window modal" src="./media/intro_maintenance_4.png" width=500>

When evaluating whether to execute any actions on the Nginx Entity in your Environment, Apollo will calculate the [resolved maintenance window](/docs/apollo/core/plans-and-constraints/#how-apollo-calculates-an-entitys-resolved-maintenance-window) for each Entity in an Environment based on the declared maintenance windows for the Product and the Environment. The graphic illustrates the resolved maintenance window for Nginx in your Environment.

![Resolved maintenance window for these changes](/docs/resources/apollo/apollo-getting-started/intro_maintenance_3.png)

**Next → [Next steps](/docs/apollo/apollo-getting-started/introduction-next-steps/)**
