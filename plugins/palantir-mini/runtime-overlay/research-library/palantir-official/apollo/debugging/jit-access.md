---
sourceUrl: "https://www.palantir.com/docs/apollo/debugging/jit-access/"
canonicalUrl: "https://palantir.com/docs/apollo/debugging/jit-access/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0610e1633315f8133a2afa65216b7a88d128494f8afe2992947a8f9d85958195"
product: "apollo"
docsArea: "debugging"
locale: "en"
upstreamTitle: "Documentation | Debugging > Just-in-time access"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Just-in-time access

When a debugging task requires elevated permissions (for example to delete a Pod), you can get time-bound elevated level of access in Apollo by requesting a just-in-time (JIT) access policy.
Once approved, you get access within seconds, which applies to both active and new Terminal sessions.

You need to have Terminal User role to request a JIT access policy.
Any user with Environment Administrator role can approve a JIT access request, self-approval is not allowed.

## Request JIT access

To request JIT access:

1. Navigate to the Apollo Environment you want to debug and select the **Terminals** tab. <br><br>
   ![Open terminal tab.](/docs/resources/apollo/debugging/terminal-tab.png) <br><br>
2. Select **Request** in the **Your policies** table and select the access policy from the list.
   When selecting a policy check the duration of the access grant and what Kubernetes RBAC you will get. <br><br>
   ![Create an access policy request.](/docs/resources/apollo/debugging/jit-request.png) <br><br>
3. Select **Submit request**. This will create a change request for a JIT access grant.
   You should get approval from an Environment Administrator. <br><br>
   ![Get approval on the access policy request.](/docs/resources/apollo/debugging/jit-approval.png) <br><br>
4. Navigate back to the **Terminals** tab to view your active access grants.
   You can quickly extend your existing access grant from the same table. <br><br>
   ![Check status.](/docs/resources/apollo/debugging/jit-status.png)

You can find all available access policies for your Environment under the **Terminal Access** section in the **Settings** tab.

![Check access policies.](/docs/resources/apollo/debugging/jit-policies.png)

## Revoke JIT access

To revoke JIT access, navigate to the **Terminal Access** section on the **Settings** tab and select **Grants**. You can view all recent active and revoked access grants.
Select **Revoke Grant** to revoke access. Access revocation propagates within seconds and applies to all active Terminal sessions.
To view more details on who approved access, you can open the corresponding change request by selecting **Open Change Request**.

![Revoke access.](/docs/resources/apollo/debugging/jit-revoke.png)
