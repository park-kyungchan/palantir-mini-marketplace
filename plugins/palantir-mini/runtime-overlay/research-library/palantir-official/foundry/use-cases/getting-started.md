---
sourceUrl: "https://www.palantir.com/docs/foundry/use-cases/getting-started/"
canonicalUrl: "https://palantir.com/docs/foundry/use-cases/getting-started/"
sourceLastmod: "2026-05-12T17:06:26.155Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0093768a0bb9e91d19606c56490f496d600602be333ff367c86a925483d6ae67"
product: "foundry"
docsArea: "use-cases"
locale: "en"
upstreamTitle: "Documentation | Use Cases [Sunset] > Getting started"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Getting started

## Build a new use case

In this tutorial, we will use the Use Cases application to create a new use case with a variety of application and Ontology resources. We can then navigate to applications like Workshop and Ontology Manager directly from the use case overview page, as well as add additional applications.

## Part 1: Create a use case

First, we need to access the Use Cases application.

When logged into Foundry, access the Use Cases app from the left-side navigation bar under **Platform Apps**. If the application is not visible, select **View all** and find **Use Cases** under the **Operational applications** section of the **Platform apps** search window that appears.

You will now be on the home page of the Use Cases app. This page will be empty if you have not yet created a use case.

In the right side of the **All use cases** section, click **+ Create new**. This will open the **Create use case** modal. Add the use case name and description. In our example, the use case name is “Flight alert use case”, and the description is “Use case for managing flight alerts and updating schedules."

![Create use case modal](/docs/resources/foundry/use-cases/create-use-case.png)

In this tutorial, we will create a new backing Project in the filesystem. Click **+ Create new** in the bottom right corner to open the **Create new project** modal that will allow you to add a new Project to your Foundry filesystem. Add a name, optional description, and [space](/docs/foundry/platform-security-management/manage-orgs-and-spaces/#spaces) for your Project.

Your space will determine the default Organization and role for users in your Organization. In our example, our Project is named “Flight Alert Project” with the description “Backing Project for Flight Alert use case”. Our space is `Palantir`, our Organization is `Palantir`, and the default role is `Viewer`.

![Create new Project modal](/docs/resources/foundry/use-cases/create-new-project.png)

Select **Create** to create the new Project and return to the **Create use case** modal. Select **Create** again to create your use case and enter the [use case overview](/docs/foundry/use-cases/use-case-overview/) page.

Learn more about [Organizations](/docs/foundry/security/orgs-and-spaces/), [roles](/docs/foundry/security/projects-and-roles/), and other [platform security](/docs/foundry/security/overview/#platform-security) concepts.

## Part 2: Edit metadata

After creating your use case and backing Project, you can modify the metadata that helps define your use case. This metadata includes the use case name, description, owners, and status.

At this point, your use case overview should look like this:

![An example use case overview page in an empty state](/docs/resources/foundry/use-cases/use-case-overview-empty.png)

Note that you will be the technical owner of the use case by default. In our example, we are using a `test` user.

### Name

If you want to change the name of your use case, you can do so from the use case overview page. Click on the use case name at the top of the page and edit within the text field.

![Rename the name of your use case](/docs/resources/foundry/use-cases/rename-use-case.png)

### Description

You can easily change the description of your use case by clicking on the description and editing within the text field.

![Modify use case description text](/docs/resources/foundry/use-cases/modify-use-case-description.png)

### Owners

There are two types of owners that you can assign to your use case: **Technical** and **Business**.

* **Technical owner:** The technical owner is generally the application builder who is responsible for using Foundry resources to create application outputs for the use case.
  * You are the default technical owner of your use case.
* **Business owner:** The business owner is typically a user who tracks workflow progress and financial details of a use case.
  * There is no default user assigned as a business owner to your use case.

To change the owners of your use case, hover over the name or empty field and click on the pencil icon. This will open a search dropdown where you can scroll through or search for available users. As we do not yet have a business owner for our use case, we will assign one now.

![Use case with only a technical owner assigned](/docs/resources/foundry/use-cases/use-case-tech-owner.png)

We added user `test2` to be the business owner of our use case.

![Use case with both a technical and business owner assigned](/docs/resources/foundry/use-cases/use-case-business-owner.png)

### Status

You can assign your use case a status relevant to its operation status:

* **Active:** Published and operating within your Foundry instance.
* **Experimental:** In-progress and not actively published.
* **Deprecated:** No longer in operation.

Let’s change the status of our use case from `Experimental` to `Active`. Click on the status dropdown, choose `Active`, then click **Change status**.

![Choice of status labels for use case metadata](/docs/resources/foundry/use-cases/use-case-statuses.png)

## Part 3: Add resources

Now that we have created a new use case with a backing Project, we can begin adding application resources. Let’s start by creating a new Workshop module.

From your use case overview page, find the **Applications** section in the middle and click **+ Add new application**. Choose the Workshop option, then click **Create**.

![Create new application modal](/docs/resources/foundry/use-cases/create-new-application.png)

The new workshop module will be created and opened. From here, you can name the module and choose from various widgets to configure and use. Learn more about [creating interactive modules](/docs/foundry/workshop/overview/) in Workshop.

You can [navigate back](/docs/foundry/use-cases/navigation/#navigation-between-foundry-applications) to the use case by clicking the top left header of the Workshop module name.
