---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-secrets/add-edit-delete-secrets/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-secrets/add-edit-delete-secrets/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "62bb697253060b43c27d3e9caafd83aec5fe92a888df15983d50c548ff8a8baa"
product: "apollo"
docsArea: "managing-secrets"
locale: "en"
upstreamTitle: "Documentation | Managing Secrets > Add, edit, and delete secrets"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Add, edit, and delete secrets

:::callout{theme="neutral"}
Only [Environment editors](/docs/apollo/core/authorization/) can add, edit, and delete secrets for Entities in the Environment. Everyone who can view an Entity can view names, descriptions, and keys for its secrets.

Secret values are encrypted immediately upon submission and can only be decrypted from inside the Environment. You cannot read secret values from your Apollo Hub regardless of permissions.
:::

You can add, edit, and delete secrets for an Entity by navigating to the Entity page and selecting **Manage secrets** from the **Actions** dropdown.

<img src="./media/open-manage-secrets-menu-entity.png" alt="The Actions dropdown is expanded and the Manage secrets option is highlighted." width=300>

## Add user-defined secrets

Select **+ Add Secret** on the top right of the **Manage secrets** menu to create a new user-defined secret.

![Select the + Add Secret button to create a new user-defined secret.](/docs/resources/apollo/managing-secrets/new-secrets.png)

Complete the form to create a new secret for an Entity.

![Complete the form to create a new secret.](/docs/resources/apollo/managing-secrets/new-secret-form.png)

Configuration items:

* **Secret name:** An identifier for the secret in Apollo.
* **Description:** A brief description of the secret.
* **Key value:** The secret key-value pair(s). Note that only values are considered sensitive.

You can select **Add pair** to add another key-value pair to the secret.

Select **Submit** after completing the form. Apollo will issue a [Plan](#secret-plans) to create the secret.

Apollo will use the information you provided to create a Kubernetes secret in the Environment of the Entity. The secret will be created in the same Kubernetes namespace as the Helm chart for the Entity. The Kubernetes secret name will be the Entity name followed by the `Secret name` you provided, separated by `-`. In the example above, the Kubernetes secret name will be `example-entity-example-secret` for example-entity Entity.

:::callout{theme="neutral"}
To allow the immediate encryption of the secret value, the Hub needs to know Agents' public keys. If at the time of encryption, the Hub does not know the public key for the Agent that will eventually execute the Plan, the user's request to add or edit the secret value will fail.
:::

## Edit user-defined secrets

To edit a user-defined secret, select the pencil icon to the right of the secret name.

![Select the pencil icon to edit a user-defined secret.](/docs/resources/apollo/managing-secrets/edit-secrets.png)

This will open the edit secret form. Enter the required updates and select **Update secret**.

![Complete the form to create edit a secret.](/docs/resources/apollo/managing-secrets/edit-secret-form.png)

This form will only display the existing keys for the secret. Apollo cannot retrieve secret values, but as long as the key-value pair is not deleted then the value will be preserved. If a key-value pair is deleted by accident, you can only undo it by selecting **Cancel** before you select **Update secret**. Afterwards, you can still effectively undo the deletion by re-adding the key-value pair, but you must provide the value to be set again; note the key-value pair will be unavailable in the Environment until the Plan to re-add it succeeds.

:::callout{theme="neutral"}
You can only edit secrets associated with [managed Entities](/docs/apollo/core/entities/#managed-and-unmanaged-entities).
:::

## Delete user-defined secrets

To delete user-defined secrets, select the trash can icon to the right of the secret name in the **Manage Secrets** menu.

<img alt="Select the trash can icon to delete a new user-defined secret." src="./media/delete-secrets.png" width=500>

:::callout{theme="neutral"}
Deleting a user-defined secret that is actively used by current configuration will break the service. It is not possible to discover which user-defined secrets are in use with the current configuration schema.
:::

## Secret Plans

All secrets operations are executed by Apollo using a Plan so that changes only occur during appropriate maintenance windows. You can view the progress of a secret operation in the **Plans** tab of the Entity home page.

![A Plan to modify a secret.](/docs/resources/apollo/managing-secrets/secret-plan.png)

Secret operations are also executed as part of [Apollo commands](/docs/apollo/managing-entities/user-issued-commands/#secrets).

Learn more about [using secrets in Apollo](/docs/apollo/managing-secrets/reference-and-use-secrets/).
