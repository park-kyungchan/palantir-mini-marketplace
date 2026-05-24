---
source: https://www.palantir.com/docs/foundry/action-types/notifications/
fetched: 2026-04-20
section: ontology-deep
doc_title: Notifications
---

# Notifications

Notifications are side effects added to an action type via the **Add new rule** dropdown. They notify specified Foundry users when an action runs.

## Recipients

Supported recipient specification methods:

* **Static** — a fixed set of users or groups always notified when the action runs.
* **From a parameter** — a Foundry user or group ID parameter (allows submitter to select recipients or auto-detect the running user).
* **From an attribute of an object parameter** — a property on an object parameter that stores a Foundry user or group ID (including lists).
* **From a function** — a custom function that computes the recipient list from action parameters. Used for combining options or conditional recipient selection by region/role.

Recipients control their own delivery preferences (in-platform toast, email). If a user has action notifications turned off, they will not be notified but can still view notifications in the Workspace.

### Limits

* **From a Function** content: max 50 recipients.
* **Template** content: max 500 recipients.

## Content

Content is configured via **Template** or **Function**.

### Template content components

1. **Subject** — subject line (max 250 characters).
2. **Body** — notification body; shown in toast or email body (max 1,000 characters; custom HTML email up to 51,200 characters).
3. **Link** — optional button below body; can link to an object, Workshop app, Carbon workspace, or newly created object.
4. **Advanced Email Configuration** — custom HTML body for email delivery only.

Use triple handlebars (`{{{ }}}`) to reference parameters and user attributes in subject, body, and link.

### Function content

Provide a function returning a `Notification` object. Use when:
* Content differs completely by recipient or parameter.
* Different subject lines for email vs in-platform.
* Full URL links including external systems.
* Aggregations or Search Arounds needed for rendering.

## Security notes

* Ontology data in notification content reflects the state **before** the current action's edits are applied.
* Groups are resolved to individual users before permission checks.
* Two failure modes configurable: **Require all users to have permissions** (default) vs **Require any user to have permissions**.
* If **Strict Redaction** is enabled on the Foundry instance, custom content is replaced with a generic message; users click "View" to see full content inside Foundry.
* To override redaction per action type (if org settings allow): navigate to Security & Submission tab → Notification settings → Disable notification redaction.
