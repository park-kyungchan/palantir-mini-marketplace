---
sourceUrl: "https://www.palantir.com/docs/foundry/global-branching/protecting-resources/"
canonicalUrl: "https://palantir.com/docs/foundry/global-branching/protecting-resources/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9fa8f436755d6650cb0ed1e91bbc4883198faad1ed6ea1f65460b2417a1b1ddc"
product: "foundry"
docsArea: "global-branching"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Resource protection and project approval policies"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Resource protection and project approval policies

:::callout{theme="neutral" title="Resources that support project policies"}
Project policies, as described in this documentation, currently only apply to Workshop modules, ontology resources, and AIP Logic functions migrated to project permissions. Project policies will eventually be available for more resources, including Pipeline Builder.
:::

Protecting resources through branching and approval policies ensures that all contributions are made safely and in a controlled manner. When resources are protected, changes must be submitted via branches and can only be merged after receiving approval according to the project's defined policies.

## Resource protection

To safeguard critical workflows or maintain development best practices, you can choose to *protect* the main branch of your resources. Protected resources cannot be changed directly; instead, changes must be made on a branch and then approved before taking effect on the main branch.

A branch may include both protected and unprotected resources; however, only protected resources require changes to be made on a branch in accordance with the project’s approval policy. Changes to unprotected resources will still require approval from a user with edit-level permissions unless specified otherwise.

Protected resources can be identified by the <img alt="Protected resource lock." src="./media/protected-resource-icon.png" width="30px"> icon (branch lock) in the Compass file system.

Any user with owner permissions on a resource can choose to protect or unprotect that resource. Resources can be protected from your file system, individually or in bulk (by multi-selection). To protect a resource, right-click on a resource and choose **Protect** or **Unprotect** (depending on the current status). Workshop resources can also be protected from within the Workshop application by navigating to **Settings** and choosing the **Branch protection** tab.

![Protecting a single Workshop module.](/docs/resources/foundry/global-branching/protecting-single-module.png)

## Branch protection tab

The branch protection tab in a project serves two purposes:

* **Defining branch approval policy:** Owners of projects can define a [project approval policies](#project-approval-policies) in the branch protection tab.
* **Automatically protecting new files:** When toggled on, this setting will automatically protect all new files created in the project.

## Project approval policies

Once a resource is protected, any change to that resource will have to be made on a branch and go through an approval process. The approval policy is set at the project level, and defines the approval required to merge changes to protected resources.

### Default approval policy

Choosing the default approval policy for a project means that each resource in the project will be protected by its respective default policy. The default policy differs by resource type but generally requires at least one user with edit permissions to approve changes and allows contributors to a resource to approve their own changes. The default policy for a resource can be automatically approved without additional action from the user. A rejection from any reviewer will block the proposal from being merged.

*Example project with default approval policy:*

![Project with default approval policy](/docs/resources/foundry/global-branching/project-with-default-approval-policy.png)

### Custom approval policy

Approval policies have three customizable parameters:

* **Eligible reviewers:** Users or groups allowed to review and approve changes to the main branch of a protected resource.
* **Number of approvals required:** The minimum number of approvals needed.
* **Contributor approval:** Specify whether contributors to the resource are allowed to approve changes to that resource. A contributor is any user who has made a change to that resource on the branch.

Once a policy has been created on a project, it will apply immediately to *all protected resources* in that project when you create a branch and then a proposal. Additionally, if you update the policy to be more or less restrictive, proposals linked to that policy will be refreshed and have their status reevaluated against the new policy requirements. Only users that are owners on the project can update its custom policy.

*Example project with custom approval policy:*

![Project with custom approval policy](/docs/resources/foundry/global-branching/project-with-custom-approval-policy.png)

## Moving a resource to a new project

A resource's protection status is preserved when moving resources between projects. For example:

* **Moving a protected resource to a new project:** The resource will remain protected in the new project.
* **Moving an unprotected resource to a new project:** The resource will remain unprotected in the new project.

When a protected resource moves to a new project, any change to that protected resource must be made on a branch and will be governed by the approval policy of the new project.

:::callout{theme="neutral" title="Moving a resource with an open proposal"}
If a resource with an open proposal is moved to a new project, the existing proposal may take up to 1 day before the resource's policy displays the new project policy. Updating the module on the branch or attempting to merge the proposal will also trigger a refresh of the resource's policy to match the new project policy.
:::

## Project policies and local branch protection mechanisms

[Code repositories](/docs/foundry/code-repositories/branch-settings/#protected-branches) and [Pipeline Builder](/docs/foundry/pipeline-builder/branches-protected-branches/) both have local branch protection mechanisms and approval policies. These will remain in place.

In the future, users will have the option to opt into the project approval policy for their code repositories and builder pipelines.

## Viewing a resource's approval policies

You can view the approval policies that apply to a resource by selecting the 👤 button in the reviewers column on the proposal page or in the branch taskbar. This will open a popover with two tabs, **Manage reviewers** and **Approval policies**.

The **Approval policies** tab will show both custom policies (set at the project or the resource level) and default policies that apply to a given resource. For each policy, you will also be able to see additional information including the eligible reviewers, the number of approvals required, and whether contributor approval is allowed.

![Approval Policies on Proposal Page](/docs/resources/foundry/global-branching/proposal-page-approval-policies.png)

The **Manage reviewers** tab shows who you have requested review from and the status of the review. You can also use the edit button to add or remove reviewers.

![Manage Reviewers on Proposal Page](/docs/resources/foundry/global-branching/proposal-page-manage-reviewers.png)

## Branch protection in Workshop modules

When on the main branch, the **Save and publish** button on protected Workshop modules is replaced with a **Save to new branch button**, requiring all changes to be made on a branch rather than directly to main.

![Save to new branch button](/docs/resources/foundry/global-branching/save-to-new-branch.png)

Selecting **Save to new branch** will prompt you to create a new branch. You can give the branch a name and select the ontology for the branch.

Once you are ready to merge your changes to main, [create a proposal](/docs/foundry/global-branching/branching-lifecycle-usage/#create-a-proposal).

## Approval process for Workshop modules

Once a proposal is created, reviewers will be notified to review the changes. Navigating to the branched version of the Workshop module will direct reviewers to the Changelog tab in Workshop.

Within the Changelog tab, reviewers can see the changes made to the module. Reviwers can then approve or reject the change by selecting the appropriate **Approve** or **Reject** button on the left panel in the **Review proposed changes** section.

![Approve workshop change](/docs/resources/foundry/global-branching/approve-workshop-change.png)

## Branch protection for ontology resources

The ontology resource types supported by branch protection include:

* Object types
* Action types
* Link types
* Interface types
* Shared property types

Notably, resource protection settings are not supported on:

* Type groups
* Rule sets (When modifying a rule set, the protection status of the containing object type will be enforced.)

Additionally, ontology resources must be migrated to use project permissions before they can be protected. For more information, review [ontology permissions](/docs/foundry/object-permissioning/ontology-permissions/).

After migrating an ontology resource to use project permissions, you can view and manage its protection status via the parent project's **Files** tab.

![Protecting an ontology resource.](/docs/resources/foundry/global-branching/protect-from-compass.png)

Once protection is enabled, you must make changes on a separate branch and create a proposal to merge them into the main branch.

The protection status is also visible in Ontology Manager on the **Overview** tab:

![Protected ontology resource in Ontology Manager overview page.](/docs/resources/foundry/global-branching/ontology-overview-tab.png)

Additionally, you can review the applicable policy under the **Security** tab:

![Protected ontology resource in Ontology Manager's Security tab.](/docs/resources/foundry/global-branching/ontology-security-tab.png)

When modifying protected resources, the **Save** dialog is replaced with **Create and save to branch**, requiring you to save changes to a new branch.

![Save to new branch option in Ontology Manager.](/docs/resources/foundry/global-branching/modify-protected-object.png)

## Approval process for ontology resources

Once a proposal is created, reviewers added via the Global Branching application will be notified to review the changes.

In the ontology proposal, reviewers can view the proposal details and approve or reject changes to all modified resources or to specific ontology resources.

![Approve ontology change.](/docs/resources/foundry/global-branching/review-protected-object.png)

Once the policy requirements are met, approved resources change from `In Progress` to `Approved`. You can then merge the proposal if all other checks have passed.

### Known limitations

* Indexing an object type counts as a modification. If the resource is protected by a project policy, you will need policy approval to merge your branch. To bypass this requirement, remove indexing changes before merging.
* Currently, adding reviewers to one resource adds them to the entire proposal, as ontology changes are grouped together. Only users in a resource's project policy are required to approve that specific resource.
