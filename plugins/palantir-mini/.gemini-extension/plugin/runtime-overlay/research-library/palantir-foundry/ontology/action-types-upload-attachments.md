---
source: https://www.palantir.com/docs/foundry/action-types/upload-attachments/
fetched: 2026-04-20
section: ontology-deep
doc_title: Upload attachments
---

# Upload attachments

Actions support uploading attachments from Workshop, Object Explorer, Object Views, Quiver, and Slate. Attachment permissions are inherited from the permissions on the object to which they are uploaded.

## Action type configuration

Set parameter type to **Attachment**. The backing dataset column must be **String** and the object property type must be **Attachment**.

To allow multiple attachments in one parameter, enable **Allow multiple values** (also requires enabling **Allow multiple** on the object type property).

## Object type configuration

Set the property type to **Attachment**. To support multiple attachments on one property, enable **Allow multiple** (the backing dataset column must be an **Array**).

## Architecture and limits

- Attachments are uploaded immediately when added to the form, before submission.
- If form submission fails or is cancelled, the pending attachment is automatically permanently deleted after some time.
- Supported for both logic-backed and function-backed actions.
- **Global file size limit: 200 MB** per attachment.
- Each attachment can be linked to a maximum of **10 objects** in its lifetime. After reaching 10, re-upload the file to create a new attachment.
