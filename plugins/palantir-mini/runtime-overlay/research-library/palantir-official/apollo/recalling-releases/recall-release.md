---
sourceUrl: "https://www.palantir.com/docs/apollo/recalling-releases/recall-release/"
canonicalUrl: "https://palantir.com/docs/apollo/recalling-releases/recall-release/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0c1fb3dcc40bd444d09d0292632c3f3105f9a92291d492a8e85b8296f3476349"
product: "apollo"
docsArea: "recalling-releases"
locale: "en"
upstreamTitle: "Documentation | Recalling Releases > Issue, edit, and revert a recall"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Issue, edit, and revert a recall

## Issue a recall

To issue a recall, navigate to the Product, Module, or individual Release that you would like to recall. From the **Actions** dropdown menu in the top right corner, select **Recall releases**.

![The recall releases option from the Actions dropdown is highlighted.](/docs/resources/apollo/recalling-releases/recall_in_actions.png)

This action will open the recall creation form.

![The recall creation form.](/docs/resources/apollo/recalling-releases/recall_creation_page.png)

### Select Releases to recall

First, you can enter a starting Release in the **Select releases to recall** section. If you are recalling a single Release, you should enter the Release you want to recall. If you are recalling a range of Releases, you should enter the lowest Release you want to recall.

You  can use the filters on the bottom of the dropdown to view Release Candidates or Snapshots. These filters are useful for searching for a specific version and will not impact the recall range.

<img src="./media/starting-version.png" alt="The dropdown to select a starting version is expanded." width=500>

Then, specify the [recall range](/docs/apollo/recalling-releases/recall-ranges/).

<img src="./media/recall-range.png" alt="The possible recall ranges are shown." width=500>

You can select **View affected releases** in the bottom right corner to view a list of Releases that will be recalled.

![The View affected releases panel is expanded.](/docs/resources/apollo/recalling-releases/view-affected-releases.png)

Select **Hide affected releases** to hide the list.

### Add a description

In the **Description** text box, you can enter details that will help others understand why you are issuing the recall.

### Specify the roll-off strategy

Next, you will configure a [roll-off strategy](/docs/apollo/recalling-releases/roll-off-strategies/), which tells Apollo how you want to move Entities off the recalled Release(s) and onto a safe Release.

### (Optional) Add recall links

You can add links that provide more details about the recall by selecting **Add link** in the **Recall links** section.

### Issue recall

Select **Issue recall** when you are finished configuring the recall details.

The roll off strategy will take effect immediately once the recall is issued. Keep in mind that Apollo will ignore an [Entity's no-downtime maintenance window](/docs/apollo/managing-environments/environment-settings/#maintenance-windows-no-downtime-vs-downtime) when rolling off a recalled Release.

## Edit a recall

To edit a recall, select the recall you want to edit from the **Recalls** tab for the Product or Module. Then select **Edit recall**.

![The Edit recall button is highlighted.](/docs/resources/apollo/recalling-releases/edit-recall.png)

You can also select a recall to edit by navigating to the **Releases** tab for the Product or Module and selecting **View recall** from the **Status** column.

![A recall from the Releases list is selected.](/docs/resources/apollo/recalling-releases/edit-recall-release-list.png)

Lastly, you can select a recall to edit from the top banner of the Release page.

![The recall banner for a Release is expanded and a recall is highlighted.](/docs/resources/apollo/recalling-releases/edit-recall-release-banner.png)

When you are finished editing, select **Save changes**.

## Revert a recall

:::callout{theme="neutral"}
We recommend only reverting a recall if it was created by mistake. Instead, you should edit the recall to reflect the most accurate recall range.

For example, if you discover an issue in a Release `5.3.0` and greater Releases of a Product, then you should create an [open ended recall](/docs/apollo/recalling-releases/recall-ranges/#open-ended-recall). After you investigate the issue, you publish Release `5.6.0` which resolves the issue. Reverting the recall would make Release `5.3.0` available for Entities, even though it still has the issue. Instead, you should edit the recall and change the range to be a [closed recall](/docs/apollo/recalling-releases/recall-ranges/#closed-recall) and specify that the upper bound is Release `5.6.0`.
:::

After you issue a recall and investigate the issue, you can **revert** the recall if you discover it was issued by mistake or if all affected Releases have been fixed.

To revert a recall, navigate to the **Recalls** tab for the Product or Module and select the recall you want to revert. Then select **Revert recall**.

![The Revert recall button is highlighted.](/docs/resources/apollo/recalling-releases/revert-recall.png)

When you revert a recall, the affected Releases will be eligible for promotion again if they are not affected by an active recall. Apollo will resume proposing Plans to ugrade Entities to the affected Releases if it is the best Release on the Release Channel. Note that Apollo will not put all affected Entities back on their previous Release if it is not the best possible Plan.
