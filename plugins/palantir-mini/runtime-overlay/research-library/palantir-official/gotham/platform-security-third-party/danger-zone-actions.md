---
sourceUrl: "https://www.palantir.com/docs/gotham/platform-security-third-party/danger-zone-actions/"
canonicalUrl: "https://palantir.com/docs/gotham/platform-security-third-party/danger-zone-actions/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d939322d3395edc8543ab2a76347ca7d75db927fb9cd348d877f5561ac1b72ec"
product: "gotham"
docsArea: "platform-security-third-party"
locale: "en"
upstreamTitle: "Documentation | Third-party applications > Danger zone actions"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Danger zone actions

Platform administrators have access to several “danger zone” actions for third-party applications. These are called “danger zone” actions because they result in irreversible changes to an application’s registration and should be treated with caution due to their potentially widespread and destructive effects. A warning dialog will appear in advance of executing these actions. The available “danger zone” actions are [rotating a client secret](#rotate-a-client-secret) and [deleting an application registration](#delete-an-application-registration).

## Rotate a client secret

You can rotate an application's secret on the [Manage application](/docs/gotham/platform-security-third-party/manage-3pa/) page for [confidential clients ↗](https://tools.ietf.org/html/rfc6749#section-2.1) (external link) only. Rotating the secret will require every user to set up the application again, since every client configured with the secret will cease to work given that the rotated secret is invalidated. Rotating secrets should only be done if the secret has become compromised or lost; keep in mind that the application will need to be reinstated after secret rotation.

:::callout{theme="warning" title="Warning"}
When might you want to rotate a secret? Given the consequences of rotating a secret, this is something that should only happen if the secret has been compromised or has become inaccessible.
:::

1. From **Platform Settings**, navigate to [Third-party applications](/docs/gotham/platform-security-third-party/third-party-apps-overview/#accessing-the-third-party-applications-user-interface) page.
2. Select the **All applications** tab.
3. Click **Actions** on the application you want to modify, then select **Manage application**.
4. Scroll down to **Danger Zone** and click on **Rotate secret**.
5. Review the warning dialog prior to confirming the action.
6. Confirm the action and securely store your new client secret as it will not be viewable again at any other time.

## Delete an application registration

1. From **Platform Settings**, navigate to [Third-party applications](/docs/gotham/platform-security-third-party/third-party-apps-overview/#accessing-the-third-party-applications-user-interface) page.
2. Select the **All applications** tab.
3. Click **Actions** on the application you want to delete, then select **Manage application**.
4. Select **Delete application** from the menu.
5. Review the warning dialog prior to confirming the action.
6. Confirm the action and the application will be deleted. This cannot be undone.
