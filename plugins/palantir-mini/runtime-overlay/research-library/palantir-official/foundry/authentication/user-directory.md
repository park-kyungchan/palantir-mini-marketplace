---
sourceUrl: "https://www.palantir.com/docs/foundry/authentication/user-directory/"
canonicalUrl: "https://palantir.com/docs/foundry/authentication/user-directory/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "acea490c0cc27746168fc609545190b87409938f0d619534df712f4a4f446554"
product: "foundry"
docsArea: "authentication"
locale: "en"
upstreamTitle: "Documentation | Self-service user directory > Manage users within your enrollment"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Manage users within your enrollment

:::callout{theme="warning"}
Palantir’s self-service passwordless identity provider is currently only available for new commercial and developer tier enrollments and AIP bootcamps. <br><br>
In most cases, your enrollment administrator will integrate your organization's existing identity provider with the Palantir platform so you can log in with the same credentials you use across other internal systems.
:::

This page provides detailed guidance on how to access and manage user accounts within your enrollment when using Palantir's self-service user directory. The following instructions describe how to add new users, enable or disable existing accounts, and reset user accounts.

## Access user management

To begin managing users within your enrollment, you must be an `enrollment administrator` or an `authentication administrator`. If you do not have one of these permissions, an existing enrollment administrator can grant you the relevant role. Review the documentation on [granting user permission to manage users of the enrollment](/docs/foundry/authentication/user-directory/#grant-user-permission-to-manage-users-of-the-enrollment) for more information.

To access the **Manage user directory** page, navigate to **Control Panel > Manage user directory**.

<img alt="View of Manage user directory option within Control Panel." src="./media/authentication-userdirectories-manageusers.png" width="600">

## Add a new user

1. Navigate to the **Manage user directory** page. Review the [access user management documentation](/docs/foundry/authentication/user-directory/#access-user-management).

<img alt="Manage user directory within Control Panel." src="./media/authentication-userdirectories-addnewuser.png" width="600">

2. Select **Add new user**. From here, you can fill out the prospective user’s name and email address and send them an invitation to join the enrollment.

<img alt="The add new user option." src="./media/authentication-userdirectories-addnewusercloseup.png" width="200">

<img alt="Add new user dialog." src="./media/authentication-userdirectories-addnewusermodal.png" width="200">

3. The new user will receive an email to complete their user account registration and configure a passkey. Review the [authentication documentation](/docs/foundry/getting-started/login/#set-up-and-configure-a-passkey) for more information.

## Reset user accounts

If a user is locked out of their account or needs their account reset for any other reason, an administrator will need to reset the user’s passkey. Upon reset, the user’s existing passkeys will become invalid and they will receive an account recovery email with a login link and a request register a new passkey. The one-time password in the email expires in four days if not used, but can be re-sent if required.

To reset a user account, follow the steps below:

1. Navigate to the **Manage user directory** page. Review the access user management documentation]\(./user-directory.md#access-user-management).
2. Select the user to be reset.
3. Use the **Reset passkey** option located in the **User details** pane.

<img alt="Manage user directories user details pane" src="./media/authentication-userdirectories-userdetails-activeuser.png" width="200">

4. Review the information in the pop-up window and select **Reset**.

## Disable user access

To revoke access from a user, an administrator can disable the account. The user will no longer be able to register, login, or have their account reset until the user is re-enabled.

To disable the user account, follow the steps below:

1. Navigate to the **Manage user directory** page. Review the [access user management documentation](/docs/foundry/authentication/user-directory/#access-user-management).
2. Select the user to be disabled.
3. Use the **Disable** option located in the **User details** pane.

<img alt="Manage user directories user details pane." src="./media/authentication-userdirectories-userdetails-activeuser.png" width="200">

4. Review the information in the pop-up window and confirm by selecting **Disable**.

<img alt="Manage user directories disable user dialog." src="./media/authentication-userdirectories-disableusermodal.png" width="400">

## Re-enable user access

For a disabled user to regain access to the platform, an administrator will need to enable their account. Once enabled, the user’s account is reset and they will be able to register and login.

To enable a user, follow the steps below:

1. Navigate to the **Manage user directory** page. Review the [access user management documentation](/docs/foundry/authentication/user-directory/#access-user-management).
2. Select the user to be enabled.
3. Select the **Enable** option in the **User details** pane.

<img alt="Manage user directories user details pane." src="./media/authentication-userdirectories-userdetails-disableduser.png" width="200">

4. Review the information in the pop-up window and confirm by selecting **Enable**.

<img alt="Manage user directories enable user dialog." src="./media/authentication-userdirectories-enableusermodal.png" width="400">

## Delete a user

To permanently revoke access from a user, you should delete the user.

:::callout{theme="danger"}
This action cannot be undone, and the user will no longer have any access to the platform. Any resources the user owns should be shared or ownership transferred before deleting the user.
:::

To delete the user account, follow the steps below:

1. Navigate to the **User directory** page. Review the [access user management documentation](/docs/foundry/authentication/user-directory/#access-user-management).
2. Select the user to be deleted.
3. Select the **Delete** option in the **User details** pane.

<img alt="Manage user directories user details pane." src="./media/authentication-userdirectories-userdetails-activeuser.png" width="200">

4. Review the information in the pop-up window and confirm by selecting **Delete**.

<img alt="Manage user directories delete user dialog." src="./media/authentication-userdirectories-deleteusermodal.png" width="400">

## Grant user permission to manage users of the enrollment

To give other users the ability to manage users within your enrollment, you must grant these users either the `enrollment administrator` and/or `authentication administrator` role. For more information on enrollment permissions [review Levels of permissions](/docs/foundry/administration/enrollments-and-organizations-permissions/).

<img alt="Manage user directories user details pane." src="./media/enrollmentperms-authenticationadministrator.png" width="600">
