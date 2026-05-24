---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/editing-environment-management-settings/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/editing-environment-management-settings/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "be453c93a071ac10075bcb738d3dec52e9e3b21c9ab0081afd6f06d87b64f389"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Editing Environment management settings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Editing Environment management settings

This section outlines various details that you can configure for an Environment. Before editing your Environment management settings, be sure that you understand the [authorization model](/docs/apollo/core/authorization/) for Environments and have a [Team](/docs/apollo/managing-teams/overview/) created that will manage this Environment.

To edit the configuration of an existing Environment, from the **Actions** dropdown select **Manage environment…**.

<img alt="Existing environments can be configured by selecting **Manage environment…** from the **Actions** dropdown" src="./media/editing-environment-details.png" width=450>

This will open the Environment management form.

<img alt="The Environment management form." src="./media/environment-details.png" width=600>

The **Environment ID** uniquely identifies each Environment. It *cannot be changed* after you create the Environment. Only lowercase letters and hyphens are allowed. The ID is used throughout Apollo to reference the Environment.

The **Accreditation** impacts several different compliance and approval workflows in Apollo. If your Environment must follow strict compliance standards such as FedRAMP, IL5, or IL6, it is important to mark it appropriately. Accreditation will be displayed in a header at the top of the Environment's home page and can influence the Environment's [change request](/docs/apollo/managing-changes/change-requests/) approval process, including adding required reviews from a dedicated compliance team.

Selecting the `DEV` accreditation will result in all of the Environment's change requests being approved automatically, which can be helpful during initial Environment bootstrapping. A different accreditation should be used once the Environment has production usage. `STANDARD` accreditation should be used for production Environments that do not have specific compliance requirements. Change requests in `STANDARD`-accredited Environments require approval from Product or Environment editors, depending on what the change is affecting.

For other out-of-the-box accreditation options, select **Additional accreditation options** and then choose the appropriate accreditation from the dropdown menu. If you require an accreditation option that is not yet available, contact your Palantir representative to discuss adding it.

**Contact team** designates the Team that is responsible and acts as the primary point-of-contact for the Environment, although management responsibilities can be shared with other Teams set as additional teams to contact under **Advanced Settings**.

<img alt="The Advanced settings section of the Environment management settings form is expanded." src="./media/environment-details-advanced-settings.png" width=600>

The **Enable operational responsibility** selection determines how alerts and support inquiries are routed. When operational responsibility is enabled, the contact team assigned to each installed Product receives alert notifications. When operational responsibility is disabled, notifications are instead delegated to the contact team for the Environment.

You can edit roles for the Environment in the **Roles** tab.

<img alt="The Roles tab of the Environment management settings form." src="./media/environment-details-roles.png" width=600>

Learn more about the [possible roles for Environments](/docs/apollo/core/authorization/#roles-for-environments-and-entities).

Select **Update** when you are finished editing. This will create a change request to update the Environment management settings.
