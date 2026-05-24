---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/concepts-permissions/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/concepts-permissions/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "e7a81e6d70ea88524c4f9d872c9e4abc2c8f6db516b6c9d61d6391b08ff9c644"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Core concepts > Permissions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Permissions in Workshop

The ability to open or edit a Workshop module is derived from a user's permissions on the Workshop module. This means that a user must satisfy the [Organization](/docs/foundry/security/orgs-and-spaces/) and [Marking](/docs/foundry/security/markings/) requirements and also have a role on the module (directly, via a group, or a default role). By default, users need the Viewer role to open a Workshop module, and the Editor role to edit it.

Note that the ability to open or edit a Workshop module is separate from the ability to access the data, actions, or functions which may be needed to fully use a Workshop module.

The data, actions, or functions used or contained in a Workshop module are permissioned separately from the Workshop module. For more information, see the documentation on [Object permissioning](/docs/foundry/object-permissioning/overview/), [Action type permissions](/docs/foundry/action-types/permissions/), and [Function permissions](/docs/foundry/functions/permissions/).

## Checking permissions

You can use the [Check access panel](/docs/foundry/security/checking-permissions/) in the sidebar to easily check a user's access on a Workshop module. This will show if they meet the access requirement on the Workshop module, as well as additional data requirements to see object types, link types, action types, and functions.

![Checking permissions in Workshop](/docs/resources/foundry/workshop/checking_permissions.png)
