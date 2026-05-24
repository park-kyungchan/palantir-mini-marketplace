---
sourceUrl: "https://www.palantir.com/docs/apollo/managing-environments/environment-connection-settings/"
canonicalUrl: "https://palantir.com/docs/apollo/managing-environments/environment-connection-settings/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "c09ae8a0c2dbbe2467b1da00cf524d0db94d8598411626912343ed4249a4a8b8"
product: "apollo"
docsArea: "managing-environments"
locale: "en"
upstreamTitle: "Documentation | Managing Environments > Configure Environment connection settings"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Configure Environment connection settings

Connection settings determine how Apollo handles [agent connectivity](/docs/apollo/core/agents/) for an Environment.
Agents in an Environment can connect directly to the current Hub or to another Hub.
Agent connectivity controls how health and activity information is displayed in Apollo and whether Plans are issued.

## Connection setting options

### Unknown

You must manually configure the connection settings before the Environment can be used operationally.
Apollo can also automatically transition the connection setting to another state automatically when an agent first connects or connection state is imported.

You cannot transition back to this state.

### Agents connected

Agents are connected directly to the current Hub and report their state to this Hub.

**Characteristics:**

* Agents can connect directly to the current Hub.
* Plans are issued.
* Activity and health information are displayed in real time.
* Importing reported state via bundles is disallowed.
* Supports Release Channel promotion.

### No connection expected

This Environment is explicitly configured to expect no agent connections or health in this Hub.
This setting is suitable for Environments that are exported and connected to another Hub, and for which reported state cannot be imported.

**Characteristics:**

* Agents cannot connect to this Hub.
* Plans are not issued.
* Importing reported state via bundles is disallowed.
* Cannot participate in Release Channel promotion.

### Relayed from another hub

Agent state is reported to another Hub and imported to this Hub via bundles for viewing purposes.
This setting is suitable for creating read-only views of Environments connected to other Hubs.

**Characteristics:**

* Agents cannot connect to this Hub.
* Plans cannot be issued from this Hub.
* Health and reported state information is imported via bundles.
* Versions and health information are displayed as per the last imported bundle.
* Supports Release Channel promotion.

## Manage connection settings

### View current connection settings

The current connection setting for an Environment is shown in the Environment header.

![Tag in Environment header showing connection setting](/docs/resources/apollo/managing-environments/connection-tag.png)

### Edit connection settings

1. Navigate to your Environment.
2. Select **Edit Environment connection** from the **Actions** dropdown.
3. Choose the new connection setting:
   * **Agents connected**: Enable direct agent connections to this Hub.
   * **No connection expected**: Disable agent connectivity and hide operational tabs.
   * **Relayed from another Hub**: Import agent state from bundles.
4. Confirm and apply the changes.

![Edit Environment connection modal with options](/docs/resources/apollo/managing-environments/change-connection-settings.png)

:::callout{theme="warning"}
There are three important considerations when changing connection settings:

* Changing from **Agents connected** will disconnect existing agents and cancel active Plans.
* Switching to **No connection expected** will hide operational information.
* Enabling **Relayed from another hub** requires importing a bundle from another Hub.
:::
