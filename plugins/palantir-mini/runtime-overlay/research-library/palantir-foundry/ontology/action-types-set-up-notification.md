---
source: https://www.palantir.com/docs/foundry/action-types/set-up-notification/
fetched: 2026-04-20
section: ontology-deep
doc_title: Set up a notification rule
---

# Set up a notification rule

This tutorial uses an `Alert` object type as an example.

## Steps

### 1. Add a notification rule

In the action type editor, go to **Rules** and add a new **Notification** rule.

### 2. Configure recipients

Select the recipient source. In this example, choose **From object property** and select the `Case managers` property on the `Alert` object parameter. This sends the notification to all users listed on that property.

### 3. Configure content

Set the notification **subject** and **body** using a template. Reference action parameters with `{{parameter_name}}` syntax. Optionally add a **link** pointing to an Object View for the alert.

### 4. Test the notification

Use the **Test** button in the notification rule configuration. Set yourself as the assignee to receive a test notification, then verify it appears in your Foundry notification center.

## Notes

- Notification content is evaluated using the **pre-edit** state of objects (values before the action runs).
- Notifications require all recipients to have permission to view all referenced objects/properties. Unauthorized recipients will not receive the notification.
- Up to 500 recipients via template; up to 50 via function-derived recipient list.
