---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-teams/view-edit-existing-teams/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-teams/view-edit-existing-teams/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "8afb545c802f079039f7133cbab494371291cdbacb679e595d7d3baf17ca339e"
product: "apollo"
docsArea: "managing-teams"
locale: "en"
upstreamTitle: "Documentation | Managing Teams > View or edit existing teams"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# View or edit existing teams

## View existing teams

You can browse existing teams by selecting the dropdown at the top of the Team Settings panel. You can view all existing teams or search for a specific team. Teams that you are a part of will appear at the top of the list in blue.

![Browse existing teams](/docs/resources/apollo/managing-teams/browse-teams.png)

Once you select a team from the dropdown, you can view more detailed information in the panel. You can view all members of the team, including users directly added to the team and users in groups that were added to the team. You can also view the team description and any labels that have been added to the team.

![View team](/docs/resources/apollo/managing-teams/view-team.png)

## Edit existing teams

When you have appropriate permissions, you will be able to take actions on the team. For example, to delete a team, select the **Actions** dropdown, and then select **Delete team**.

![Edit team dropdown](/docs/resources/apollo/managing-teams/team-actions.png)

You can edit team membership by selecting **Edit team membership** from the **Actions** dropdown. Once you update the form to the desired state, select **Save**. This will create a change request, that someone with the correct permissions can approve.

![Edit existing team](/docs/resources/apollo/managing-teams/edit-team-form.png)

You can update team roles by selecting **Edit team roles** from the **Actions** dropdown. This form allows you to update RBAC on a per team basis. You will not be able to override the global team permissions configured in the **Permissions** tab. Learn more about [authorization](/docs/apollo/core/authorization/) in Apollo.

![Edit team roles](/docs/resources/apollo/managing-teams/edit-team-roles.png)
