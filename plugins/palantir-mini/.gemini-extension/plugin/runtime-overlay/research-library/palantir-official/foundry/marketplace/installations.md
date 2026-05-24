---
sourceUrl: "https://www.palantir.com/docs/foundry/marketplace/installations/"
canonicalUrl: "https://palantir.com/docs/foundry/marketplace/installations/"
sourceLastmod: "2026-05-12T17:06:26.157Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "654d74a9b597f3091ad419881311edf2df59aed70e9402d59e7902ae9d3f962e"
product: "foundry"
docsArea: "marketplace"
locale: "en"
upstreamTitle: "Documentation | Marketplace > Installations"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Installations in Foundry Marketplace

Once you’ve begun a product installation, you can monitor your installation job. The screenshot below shows the installation job view of Marketplace.

![Marketplace installation job view](/docs/resources/foundry/marketplace/installation-job.png)

Select **View installation** in the top right to see your completed installation. From here, you can navigate to your installed resources to begin using them. The project or folder location where your resources are saved is linked in the right panel.

The screenshot below shows a completed product installation in Marketplace.

![Marketplace installation job view showing a completed installation](/docs/resources/foundry/marketplace/finished-installation.png)

## Installation settings

After installation, you can configure a number of options for an installation from the **Settings** panel.

* **Release channel:** You can set the release channel you would like your installation to track. New versions that are tagged with that release channel will be surfaced as new versions available for upgrade. See [upgrades](#upgrades) for more information.
* **Automatic upgrades:** You can enable automatic upgrades for new product versions; see [automatic upgrades](#automatic-upgrades-beta) for more information.
* **Maintenance windows:** This setting allows you to control the timing of upgrades; for instance, you can set upgrades to occur as soon as they are available, or to take place during a specified period of time (the maintenance window).
* **Lock or unlock your installation:** Locking an installation prevents edits to downstream content. Keep your installation locked if you want to guarantee safe upgrades; you can unlock your installation to fork the content you’ve installed. The default lock/unlock behavior for your installation will depend on the installation mode (**Production mode** or **Bootstrap mode**) specified by the product builder.

The screenshot below shows the **Settings** panel of Marketplace's installation view. From here, the automatic upgrades configuration can be set and the installation can be locked or unlocked to allow edits to the installed content.

![installation settings](/docs/resources/foundry/marketplace/installation-settings.png)

### Known limitations

For some resource types, unlocking an installation may not allow edits to the installed resources. Note that **Code Repositories** must be packaged with the source code for it to be editable in an installation.

## Upgrades

### Automatic upgrades \[Beta]

:::callout{theme="neutral" title="Beta"}
Automatic upgrades in Marketplace is in the [beta](/docs/foundry/platform-overview/development-life-cycle/) phase of development and may not be available on your enrollment. Functionality may change during active development.
:::

Automatic upgrades are disabled by default for both **Production mode** and **Bootstrap mode** products. When installing **Production mode** products, you will be prompted to choose a release channel and maintenance window in the [new versions](/docs/foundry/marketplace/install-product/#new-versions) installation step. You can always change these settings in the [installation settings](#installation-settings). Automatic upgrade settings include:

* The **maintenance windows** during which you would like to receive automatic upgrades. You can select "Always open" if you want to take upgrades as soon as they are available. Note that upgrades will cause downtime for installed resources, so we recommend adding a maintenance window to avoid downtime.
* The **release channel** your installation should track. During any maintenance windows you have configured, your installation will automatically upgrade to versions tagged to that release channel as long as the upgrade does not require manual action.

Release channels are hierarchical rather than mutually exclusive. Depending on the track:

* **Release:** The installation receives the versions tagged as **Release**, **Test**, or **Stable**.
* **Test:** The installation receives the versions tagged as **Test** and **Stable**.
* **Stable:** The installation receives the versions tagged as **Stable**.

Upgrades will still require manual action if the new product version includes new inputs that must be mapped. If this is the case, you will be guided through the same manual configuration workflow as [manual upgrades](#manual-upgrades).

### Manual upgrades

If you do not have automatic upgrades enabled, you will see a banner at the top of your installation with information about new versions when they become available. You will have the option to review changes that may require manual configuration, as shown below.

![upgrade banner](/docs/resources/foundry/marketplace/upgrade-banner.png)

Select **Review changes** to learn more about the new version. If you have made any edits to your installed content, these edits will be overwritten by the content in the new product version. The screenshot below shows the list of changes for an example upgrade.

![review changes](/docs/resources/foundry/marketplace/review-changes.png)

If the new product version requires manual configuration (for example, new inputs to map), you will need to action these steps before you can take the upgrade. You will be guided through the manual steps you need to take in the upgrade form as shown in the screenshot below.

![Screenshot showing required configuration for an upgrade, such as new inputs to map](/docs/resources/foundry/marketplace/upgrade-inputs.png)

### Downgrades

To downgrade to a previous version or upgrade to a specific version of a product, start by selecting the ellipsis in the top right corner of the installation page. Next, choose **Upgrade or downgrade to version**, as demonstrated in the screenshot below.

![Screenshot showing upgrade or downgrade button](/docs/resources/foundry/marketplace/upgrade-or-downgrade-button.png)

Selecting this option will open a dialog where you can choose the exact version you need. After making your selection, initiate the upgrading or downgrading process by selecting **Create a draft**.

![Screenshot showing upgrade or downgrade dialog](/docs/resources/foundry/marketplace/upgrade-or-downgrade-dialog.png)

## Deleting installations

To delete an installation along with all its resources, start by selecting the ellipsis (**...**) in the upper-right corner of the installation page. Next, choose **Delete installation permanently**, as shown in the screenshot below.

![Screenshot showing delete installation button](/docs/resources/foundry/marketplace/delete-installation-button.png)

Selecting **Delete installation permanently** will show a preview of the resources that will be permanently deleted if you proceed.

![Screenshot showing uninstallation preview](/docs/resources/foundry/marketplace/delete-installation-preview.png)

Next, type `delete installation` in the confirmation text box and select **Delete** to initiate the uninstallation process.

:::callout{theme="danger"}
**Warning:** Deleting an installation is *irreversible*. Uninstallation will *permanently* delete resources across all installation versions as well as the installation itself. If the installation project or folder only contains resources that belong to the installation selected for deletion, uninstallation will also permanently delete the installation project or folder. Otherwise, the deletion of the project or folder will be skipped.
:::

If uninstallation is successful, you will be redirected to the installations page. If uninstallation fails, you will receive an error message, as shown below:

![Screenshot showing uninstallation errors](/docs/resources/foundry/marketplace/delete-installation-errors.png)

The error message will list the resources that failed to be deleted and the reasons for the failure, as well as the resources that were successfully deleted. You can choose to resolve issues with failed resources before retrying uninstallation, or you can tick the box acknowledging that failed content will persist and select the **Force delete** button. This will ignore failed resources and delete the installation. The installation project or folder will also be deleted, provided that the project or folder does not contain any other resources that do not belong to the given installation.
