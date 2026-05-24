---
sourceUrl: "https://www.palantir.com/docs/foundry/consumer-mode/foundry-consumer-setup/"
canonicalUrl: "https://palantir.com/docs/foundry/consumer-mode/foundry-consumer-setup/"
sourceLastmod: "2026-05-12T17:06:26.158Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "5b1bf9542dfb0bf03b6f1e5d6c42ff988b569eeef481bcefc11f11e6047ad755"
product: "foundry"
docsArea: "consumer-mode"
locale: "en"
upstreamTitle: "Documentation | Consumer mode > Configure Foundry for consumer mode"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure Foundry for consumer mode

Before building consumer-facing applications, you must first configure Foundry to support [consumer mode](/docs/foundry/consumer-mode/overview/). This page guides you through the requirements to properly configure consumer mode in Foundry.

:::callout{theme="neutral"}
This setup is only required when using Foundry user permissions and authentication. If you are using a client credentials flow in your consumer application, you can skip this section.
:::

## Prerequisites

Before configuring Foundry, ensure you have the following:

* **Enrollment Administrator** permission to create organizations, update authentication providers, and manage permissions configuration.
* Access to **Control Panel** for platform configuration.
* Understanding of your consumer authentication requirements.

## Step 1: Create a consumer organization

First, create a dedicated organization for consumer users that is isolated from internal platform users.

![The Organization management extension showing the first step within the create organization helper.](/docs/resources/foundry/consumer-mode/create-organization.png)

1. Navigate to **Control Panel > [Organization management](/docs/foundry/administration/enrollments-and-organizations-access/)**.
2. Select **Create organization**.
3. Configure the following organization settings:
   * **Name:** Add a descriptive name for your consumer organization (for example, "Customer Portal Users").
   * **Organization administrator:** Assign an appropriate admin user or group.
   * **Collaboration:** Add your **internal organization** to allow discovery of your organization's Roles. Ensure all boxes are unchecked to prevent cross-organization user and group discovery.
   * **Private space:** Choose  `No` for consumer organizations.

Note that enrollments are limited to five organizations by default.

## Step 2: Disable member discovery

Next, configure your consumer organization to prevent users from discovering other users and groups within the organization, providing additional privacy and security isolation.

![The Manage member discovery extension showing the discoverability toggles in the disabled position.](/docs/resources/foundry/consumer-mode/manage-member-discovery.png)

1. Navigate to **Control Panel > Organization management**.
2. Find your consumer organization and select **Actions > Manage member discovery**.
3. Configure the following member discovery settings:
   * **Discover users:** Disable this setting to prevent users in this organization from discovering other users in the same organization.
   * **Discover groups:** Disable this setting to prevent users in this organization from discovering groups in the organization.

Learn more about [cross-organization collaboration](/docs/foundry/security/cross-organization-collaboration/) and [member discovery](/docs/foundry/administration/configure-user-and-group-visibility/).

In some B2B cases, user or group discovery within a consumer organization is expected for collaborative Foundry capabilities, like the [Workshop comments widget](/docs/foundry/workshop/widgets-comments/). In such cases, you may ignore this step and elect to leave user and/or group discovery enabled.

## Step 3: Configure the authentication provider and triaging rules

The next step in configuring consumer mode is to set up an authentication provider that automatically assigns consumer users to your consumer organization.

![The providers tab within the Authentication extension.](/docs/resources/foundry/consumer-mode/authentication-providers.png)

### Create or update the authentication provider

1. Navigate to **Control Panel > [Authentication](/docs/foundry/authentication/overview/)**, then choose the **Providers** tab.
2. Select **Add provider** to configure a new authentication provider, or select an existing provider to edit.
3. Configure the following provider settings:
   * **Provider type:** Choose [SAML](/docs/foundry/authentication/saml-getting-started/) or [OIDC](/docs/foundry/authentication/oidc-getting-started/) based on your requirements.
   * **Provider configuration:** Complete authentication provider details according to your IDP.
   * **Egress policies:** Add required egress policies for authentication.
   * **Multi-factor authentication:** Enable if required by your security policies.

### Set up organization triaging rules

1. In the authentication provider settings, configure the **[Organization assignment](/docs/foundry/authentication/org-assignment/)**.
2. Select an automatic assignment rule to direct users to your consumer organization.
   * **Default organization:** All users given the default organization.
   * **Advanced rule creation:** Configure rules based on email domain, group membership, or other attributes. If none of the criteria match, the default organization will serve as fallback.

![The organization triaging rules for the selected provider within the Authentication extension.](/docs/resources/foundry/consumer-mode/organization-triaging.png)

## Step 4: Create rule-based consumer group

Create a group that aligns with your consumer organization for consistent permission management. After this step, you should have one or more automatically updating groups to permission all your consumer users. If all users belong to a single organization, you must create a single rule-based group for the organization; if users belong to multiple organizations, create a rule-based group for each organization.

![The configuration for Rule-based group assignment within the Authentication extension.](/docs/resources/foundry/consumer-mode/rule-based-groups.png)

1. From your authentication provider page in Control Panel, select **[Group assignment](/docs/foundry/authentication/group-assignment/)**.
2. Select **+ Add rule**.
3. From the **Select group...** dropdown menu, choose **+ Create new rule-based group** and configure the following:
   * **Name:** Match your consumer organization (for example, "Consumer Portal Users").
   * **Description:** Add a description, such as "Contains all members from {your consumer} organization".
   * **Organization:** Select the related consumer organization.
4. Configure the rule parameters to match your organization assignment rules.
5. Repeat steps 2 through 4 for each consumer organization.

### Consumer Builder and Administrator groups

For ease of permissions management when building and managing consumer applications, we recommend designating both a "Builder" and "Administrator" group. Create these groups in your identify provider if managing groups outside Foundry, or refer to our [managing groups documentation](/docs/foundry/platform-security-management/manage-groups/) for creating the groups within Foundry.

## Step 5: Configure a consumer role set

Configure a role set that provide appropriate permissions for consumer users.

![The create role set dialog in Platform settings with proposed consumer defaults.](/docs/resources/foundry/consumer-mode/create-role-set.png)

1. Select your user image in the bottom left of your screen and select **Settings > [Roles](/docs/foundry/platform-security-management/manage-roles/)**.
2. Select **Create role set**.
   * **Name:** Add a descriptive name for a consumer role set (for example, `Consumer roles`).
   * **Description:** "Roles with reduced operations for consumer applications".
   * **Copy roles from:** Project defaults
   * **Organization:** Your **internal organization**
3. In your new role set, select **New role** and add the following details to create your `Consumer` role:

![The new role dialog with proposed consumer role defaults.](/docs/resources/foundry/consumer-mode/create-consumer-role.png)

* **Name:** "Consumer"
* **Description:** "Basic permissions for consumer application users."
* **Includes:** Leave this optional section empty.

After creating the new `Consumer` role, add the following operations to the role:

* `carbon:view-workspace`
* `eddie:view-aip-logic`
* `foundry:read-data`
* `function-executor:execute-function`
* `function-registry:read-contract`
* `function-registry:read-function`
* `hubble:object-view:view`
* `lime:search`
* `object-set-service:read-versioned-object-set`
* `objects:read-data`
* `ontology:view-action-type`
* `ontology:view-datasource`
* `ontology:view-object-type`
* `ontology:view-relation`
* `salt:blobster:read`
* `slate:run-query-v2`
* `slate:view-document`
* `slate:view-stylesheet`
* `third-party-application:view-application`
* `workshop-server:view-module`

Depending on the specific workflow, additional operations may be required. Review our documentation on [understanding roles and operations](/docs/foundry/platform-security-management/manage-roles/#understanding-roles-and-operations) for more details.

## Step 6: Create a consumer space

Consumer spaces provide isolation and access control. After this step, you should have a dedicated space where consumer users can access projects.

![The create space dialog within the Space management extension.](/docs/resources/foundry/consumer-mode/create-space.png)

1. Navigate to **Control Panel → [Spaces](/docs/foundry/administration/configure-workspaces/)**.
2. Select **Create space**.
3. Configure the following space settings:

* **Name:** Add a descriptive name for the consumer space.
* **Access requirements:**
  * Set the **internal organization** as an access requirement.
  * Set the **consumer organization** as an access requirement.
* **Default permissions:** Configure appropriate default permissions for consumer users.

## Step 7: Create a consumer project template

Create a project template that automatically configures appropriate roles for consumer projects, ensuring consistent project creation.

![The create project template dialog within the Project template extension.](/docs/resources/foundry/consumer-mode/create-project-template.png)

1. Navigate to **Control Panel > [Project templates](/docs/foundry/platform-security-management/manage-project-templates/)**.
2. Select **Create template**.
3. Configure the following template settings:

* **Template name:** "Consumer Application Template"
* **Template description:** "Project template for consumer-facing applications"
* **Template Variables:** Keep the default `Name` variable.
* **Project information:**
  * **Organizations:** Choose **Selected on project creation**.
  * **Project roles:**
    * **Default role:** Select your `Consumer` role.
    * **Existing user and groups:** Add your **Builder** and **Administrator** groups, and grant the following roles to the relevant group:
      * The "Builder" group has the `Editor` role.
      * The "Admin" group has the `Owner` role.

## Step 8: (Optional) Configure a consumer domain

Set up a custom domain configured for consumer access with automatic authentication redirect enabled.

### Create a custom domain

Navigate to **Control Panel > Domains & certificates**, then follow our [documentation guidance](/docs/foundry/administration/configure-domains-and-certificates/) to create a custom domain for consumer use.

### Configure a default authentication provider

1. Navigate to **Control Panel > Authentication > [Hosts](/docs/foundry/authentication/host-settings/)**.
2. Find your custom domain, then select **Actions > Manage**.
3. Configure **Default provider** for the host to immediately redirect from the login page.

![The Default provider setting for a host within the hosts tab in the Authentication extension.](/docs/resources/foundry/consumer-mode/default-authentication-provider.png)

:::callout{theme="warning" title="Multiple IDPs configuration"}
When multiple IDPs are configured for a single domain, use the realm parameter to specify the provider:
`https://consumer.yourdomain.com/workspace/application/[rid]?_realm=auth0-realm-id` <br><br>
You can find the realm ID **Control Panel > Authentication > \[Provider Name] > Advanced Settings > Realm**.
:::

## Step 9: Configure platform access restrictions

Prevent consumer users from accessing the broader Foundry platform and ensure they only have access to applications needed for their consumer experience.

![The Foundry platform access dialog within the Application access extension showing configuration where only builder and administrator users have platform access.](/docs/resources/foundry/consumer-mode/platform-access-restrictions.png)

1. Navigate to **Control Panel > [Application access](/docs/foundry/administration/configure-application-access/)**.
2. Select **Foundry Platform**, then **Manage**.
3. Configure the following restrictions for your consumer organization:
   * **Disable platform access** for consumer organization members using the rule-based group.
   * **Disable applications** if they are not needed for consumer use:
     * Workshop
     * Slate
     * AIP Threads
     * Carbon

## Step 10: Configure a default consumer application

Build a consumer application, and set up automatic redirection to the application on login.

![The home page URL tab within the Platform experience extension that shows a relative url as the organization default.](/docs/resources/foundry/consumer-mode/platform-experience-home-page.png)

1. Navigate to **Control Panel > [Platform experience](/docs/foundry/administration/configure-platform-experience/)**.
2. Select your consumer organization.
3. Configure the following default application settings:
   * **Home page URL:** Add the URL of the consumer application that users should be redirected to after login. Examples:
     * For Workshop modules: `/module/view/latest/{module-rid}`
     * For Slate dashboards: `/slate/app/{dashboard-rid-or-permalink}`
     * For Carbon workspaces: `/carbon/{workspace-rid}`
   * **Languages:** Configure available languages for your consumer users with browser language preferences support.
   * **Platform title:** Replace default "Palantir" branding with your organization's name.
   * **Platform version:** Set the default platform version (`stable`, `beta`, or `prior`), and configure version switcher access.
   * **Static banner:** Add organization-specific messaging or announcements.

Your Foundry platform is now configured for consumer mode.

## Verify consumer mode configuration

After configuring consumer mode for Foundry, verify your set up using the following validation process:

1. **Create a project in the consumer space** using the consumer project template:
   * Navigate to your consumer space.
   * Create a new project using the "Consumer Template".
   * Verify that role assignments are applied automatically.

2. **Create a temporary resource**, such as a Workshop application, for permissions validation:
   * In the consumer project, create a simple Workshop application.
   * Configure basic functionality to test access permissions.
   * Note the application URL for testing.

3. **Create a consumer user** in the consumer IDP and log in to Foundry:
   * Create a test user account in your consumer identity provider.
   * Verify the user is automatically assigned to the consumer organization.
   * Test login flow and confirm automatic redirect to the consumer application.

4. **Switch back to your user** and use the **Check Access** panel:
   * Navigate to the consumer project's file view.
   * Use the **Check access** tab in the project **Access** settings to validate permissions:
     * Confirm the consumer user has access to the consumer project.
     * Verify the consumer user does NOT have access to internal projects.
     * Check that role assignments are working correctly.

## Troubleshooting

### The organization assignment is not working

* **Check triaging rules** in the authentication provider configuration.
* **Verify group membership** criteria are correctly configured.
* **Review user attributes** being passed from your IDP.

### Authentication redirects are not working

* **Verify domain configuration** and DNS setup.
* **Check default provider** settings for your domain.
* **Review CORS and CSP** configuration if using custom domains.

### Role permissions are too restrictive/permissive

* **Review role definitions** and adjust permissions as needed.
* **Test with consumer users** to ensure applications function correctly.

## Next steps

Once your Foundry consumer mode setup is complete, proceed with setting up your specific consumer application type:

1. **[In-platform application](/docs/foundry/consumer-mode/workspace-application-setup/):** Quickly build low-code Workshop, Slate, or Carbon applications.
2. **[OAuth application](/docs/foundry/consumer-mode/oauth-application-setup/):** Build OSDK applications hosted in Foundry.
3. **[Client credentials application](/docs/foundry/consumer-mode/client-credentials-setup/)** Create externally hosted applications with service-to-service authentication.
