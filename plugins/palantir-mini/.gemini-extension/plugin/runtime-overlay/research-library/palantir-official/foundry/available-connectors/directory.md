---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/directory/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/directory/"
sourceLastmod: "2026-05-12T17:06:26.147Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "ab7c71f8cd826e42930934152ade7a54daa67244c828a8b71e6ae8f1101cea65"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > Directory"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Directory

:::callout{theme="warning"}
The Directory connector is a sunset connector documented here for historical reference. It only works with an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker) and cannot be used with a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker). <br><br>
We recommend always using alternative file-sharing connectors when available, like [SFTP](/docs/foundry/available-connectors/sftp/), [SMB](/docs/foundry/available-connectors/smb/), or [FTP](/docs/foundry/available-connectors/ftps/). If the files can only be accessed via the host itself, we recommend using [external transforms](#ingest-files-from-agent-hosts-using-external-transforms) with a REST API source instead of a Directory source.
:::

The Directory connector allows you to ingest files located directly on the host where a Data Connection agent is running. This connector is useful for scenarios where files are generated or stored locally on the agent machine and need to be synced into Foundry.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Exploration | 🟡 Sunset |
| Batch syncs | 🟡 Sunset |
| Incremental | 🟡 Sunset |

## Data model

The connector can transfer files of any type into Foundry datasets. File formats are preserved, and no schemas are applied during or after the transfer. Apply any necessary schema to the output dataset, or [write a downstream transformation](/docs/foundry/pipeline-builder/transforms-overview/) to access the data.

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **Directory** from the available connector types.
3. The source will be configured to run on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

### Configuration options

| Option  | Required?  | Description |
|--- |--- |---  |
| `Root directory` | Yes | The directory on the agent host that will be used as the starting directory for all requests via this connection. |

## Sync data from Directory

The Directory connector uses the [file-based sync interface](/docs/foundry/data-connection/file-based-syncs/).

## Ingest files from agent hosts using external transforms

For more flexibility and control, you can ingest files from an agent host using [external transforms](/docs/foundry/data-connection/external-transforms/). This approach allows you to run the sync logic on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) while still accessing files on a remote agent host.

### Prerequisites

1. **Create a REST API source:** Navigate to the [Data Connection](/docs/foundry/data-connection/overview/) application and create a new [REST API source](/docs/foundry/available-connectors/rest-apis/#rest-api-source).
2. **Configure the connection details:**
   * Set the **domain** to your agent host address (or placeholder domain name if this is a private IP address, see below).
   * Set the **port** to `22` (SSH).
   * Add the SSH **username** and **password** as secrets for a user that can SSH to the host.
3. **Add an agent proxy egress policy:** Create an [agent proxy egress policy](/docs/foundry/administration/configure-egress/#agent-proxy-egress-policies) for your agent host address (or placeholder domain name if this is a private IP address, see below), backed by the agent itself. This allows the Foundry worker to route traffic through the agent to reach the agent host.

:::callout{theme="note"}
If your agent host address is a private IP address (for example, `10.x.x.x`, `172.16.x.x`, or `192.168.x.x`), you must [configure a host override](/docs/foundry/data-connection/agent-configuration-reference/#how-to-configure-host-overrides-for-an-agent) on your agent to map a placeholder domain name to that private IP. Use this placeholder domain instead of the private IP address when configuring the domain on your REST source and egress policy.
:::

4. **Import the source into your code repository:** Follow the [external transforms setup guide](/docs/foundry/data-connection/external-transforms/#setup-guide) to import the source into your Python transforms repository.

### Example: Read files from an agent host via SSH

The following example demonstrates how to connect to an agent host via SSH and read files into a Foundry dataset using the [Paramiko ↗](https://www.paramiko.org/) Python library.

```python
from transforms.api import transform, Output, Input, LightweightOutput, LightweightInput, lightweight
from transforms.external.systems import external_systems, Source, ResolvedSource
import paramiko


@lightweight
@external_systems(
    agent_source=Source("<source_rid>")  # Replace with your REST API source RID
)
@transform(
    output_dataset=Output("<output_dataset_rid>"),  # Replace with your output dataset RID
    files_to_read=Input("<input_dataset_rid>"),  # Dataset containing file paths to read
)
def compute(
    agent_source: ResolvedSource,
    output_dataset: LightweightOutput,
    files_to_read: LightweightInput,
):
    """
    Read files from a remote agent host via SSH and write them to a Foundry dataset.
    """
    # 1. SSH connection setup
    hostname = "<agent_hostname>"  # Replace with your agent hostname
    username = "<ssh_username>"  # Replace with your SSH username
    password = agent_source.get_secret("<password_secret_name>")  # Replace with your secret name

    # 2. Establish SSH connection
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)

    # 3. Read file paths from input dataset
    remote_file_paths = files_to_read.pandas()["remote_file_path"].tolist()

    # 4. Open SFTP connection
    sftp = client.open_sftp()

    # 5. Read each file and write to output dataset
    for remote_path in remote_file_paths:
        with sftp.open(remote_path, "rb") as remote_file:
            file_binary_data = remote_file.read()

        # Extract filename from path and write to output
        filename = remote_path.split("/")[-1]
        with output_dataset.filesystem().open(filename, "wb") as f:
            f.write(file_binary_data)

    # 6. Close connections
    sftp.close()
    client.close()
```

:::callout{theme="neutral"}
Ensure that the `paramiko` library is installed in your Python transforms repository. You can add it via the **Libraries** tab in the left side panel of your code repository.
:::

### Example: Delete files from an agent host via SSH

If you need guaranteed deletion of files from a directory source after ingestion, you can use an external transform instead of relying on [completion strategies](/docs/foundry/data-connection/file-based-syncs/#completion-strategies). Completion strategies only provide best-effort deletion.

The example below demonstrates how to delete files from an agent host after they have been processed. To use this approach:

1. Create an upstream sync that ingests files from the directory source and outputs the list of successfully ingested file paths to a dataset.
2. Schedule this delete transform to run after the sync completes, using the ingested file paths dataset as input.
3. The output dataset will contain the deletion status for each file, allowing you to audit which files were successfully deleted.

:::callout{theme="warning" title="Irreversible file deletion"}
This operation permanently deletes files from the agent host filesystem. Once executed, the deleted files cannot be recovered. Ensure you have confirmed the files are successfully ingested into Foundry before running this transform.
:::

```python
from transforms.api import transform, Output, Input, LightweightOutput, LightweightInput, lightweight
from transforms.external.systems import external_systems, Source, ResolvedSource
import paramiko


@lightweight
@external_systems(
    agent_source=Source("<source_rid>")  # Replace with your REST API source RID
)
@transform(
    output_dataset=Output("<output_dataset_rid>"),  # Replace with your output dataset RID
    files_to_delete=Input("<input_dataset_rid>"),  # Dataset containing file paths to delete
)
def compute(
    agent_source: ResolvedSource,
    output_dataset: LightweightOutput,
    files_to_delete: LightweightInput,
):
    """
    Delete files from a remote agent host via SSH.
    Input dataset should contain a column 'remote_file_path' with absolute paths to delete.
    """
    hostname = "<agent_hostname>"  # Replace with your agent hostname
    username = "<ssh_username>"  # Replace with your SSH username
    password = agent_source.get_secret("<password_secret_name>")  # Replace with your secret name

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)

    remote_file_paths = files_to_delete.pandas()["remote_file_path"].tolist()

    sftp = client.open_sftp()

    deletion_results = []
    for remote_path in remote_file_paths:
        try:
            sftp.remove(remote_path)
            deletion_results.append({"file": remote_path, "status": "deleted"})
        except FileNotFoundError:
            deletion_results.append({"file": remote_path, "status": "not_found"})
        except PermissionError:
            deletion_results.append({"file": remote_path, "status": "permission_denied"})

    sftp.close()
    client.close()

    # Write deletion results to output dataset
    import pandas as pd
    results_df = pd.DataFrame(deletion_results)
    output_dataset.write_pandas(results_df)
```
