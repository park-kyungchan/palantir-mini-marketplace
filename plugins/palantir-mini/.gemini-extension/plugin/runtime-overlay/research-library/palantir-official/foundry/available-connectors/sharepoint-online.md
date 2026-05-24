---
sourceUrl: "https://www.palantir.com/docs/foundry/available-connectors/sharepoint-online/"
canonicalUrl: "https://palantir.com/docs/foundry/available-connectors/sharepoint-online/"
sourceLastmod: "2026-05-12T17:06:26.148Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f6c3b688131aeb6c9774719bb74c6b9d0c2bb2f07d0bbd6d5b806df72ec6de1a"
product: "foundry"
docsArea: "available-connectors"
locale: "en"
upstreamTitle: "Documentation | Available connectors > SharePoint Online"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# SharePoint Online

Connect to SharePoint Online to import files from specified SharePoint libraries into Foundry.

## Supported capabilities

| Capability  | Status |
|--- |--- |
| Exploration | 🟢 Generally available |
| Bulk import | 🟢 Generally available |
| Incremental | 🟢 Generally available |
| Export tasks | 🟡 Sunset |
| [File exports](/docs/foundry/data-connection/export-overview/#file-exports) | 🟢 Generally available |

## Data model

The connector can transfer files of any type into Foundry datasets. File formats are preserved, and no schemas are applied during or after the transfer. Apply any necessary schema to the output dataset, or [write a downstream transformation](/docs/foundry/pipeline-builder/transforms-overview/) to access the data.

## Performance and limitations

There is no limit to the size of transferable files. However, network issues can result in failures of large-scale transfers. In particular, Foundry syncs that take more than two days to run will be interrupted. To avoid network issues, we recommend using smaller file sizes and limiting the number of files that are ingested in every execution of the sync. Syncs can be [scheduled](/docs/foundry/data-connection/set-up-sync/#build-or-schedule-your-batch-sync) to run frequently.

:::callout{theme="warning"}
Connections to on-premise SharePoint servers are not supported. Use a [REST API](/docs/foundry/available-connectors/rest-apis/) source type to connect to on-premise SharePoint.
:::

## Setup

1. Open the [Data Connection](/docs/foundry/data-connection/overview/) application and select **+ New Source** in the upper right corner of the screen.
2. Select **SharePoint Online** from the available connector types.
3. Choose to run the source capabilities on a [Foundry worker](/docs/foundry/data-connection/core-concepts/#foundry-worker) or on an [agent worker](/docs/foundry/data-connection/core-concepts/#agent-worker).
4. Follow the additional configuration prompts to continue the setup of your connector using the information in the sections below.

Learn more about [setting up a connector](/docs/foundry/data-connection/set-up-source/) in Foundry.

## Authentication

:::callout{theme="warning"}
Authentication for the SharePoint Online source requires an application in Microsoft Entra ID (formerly known as Azure Active Directory). If you are not an Entra ID administrator, contact your IT department to request access.
:::

Follow the initial steps below to access Azure application credentials:

1. Create an application registration in Azure by following the instructions in the [Microsoft documentation ↗](https://docs.microsoft.com/graph/auth-register-app-v2).
   * At Step 5, select **Accounts in this organizational directory only** and skip **Redirect URL (optional)**.
2. Note the client ID and tenant ID once registration is complete.

Then, choose between two available authentication method:

* [Client credentials:](#client-credentials) Recommended when a wide range of access is required for every SharePoint site.
* [Username/password:](#usernamepassword) Recommended for limiting access to one or a few SharePoint sites.

### Client credentials

In your Microsoft Entra admin center, complete the following steps:

1. Go to **API Permissions** in the left sidebar.
2. Select **Add a Permission**.
3. Select **Microsoft Graph**.
4. Select **Application Permissions**.
   * If you would like your application to read *all* SharePoint sites add `Sites.Read.All`.
     * If you plan to configure export tasks, use `Sites.ReadWrite.All` instead.
   * If you would like your application to read **selected SharePoint sites** add `Sites.Selected`.
5. If you are an Entra Administrator, select **Grant admin consent for \[tenant]**.
6. If you added `Sites.Selected` above, [add your application to specific sites ↗](https://devblogs.microsoft.com/microsoft365dev/controlling-app-access-on-specific-sharepoint-site-collections/).

   * The available options for the `"roles"` array parameter are `"write"` and/or `"read"`. The `"read"` option is sufficient to ingest files from the SharePoint site.
   * To easily send a POST with proper authentication, use the [Graph Explorer ↗](https://developer.microsoft.com/graph/graph-explorer).
   * You can receive metadata about a site by sending a GET to `https://graph.microsoft.com/v1.0/sites/[tenantName]:/sites/[siteName]` (for example: `https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/mySite`). This request will return an ID that is a composite of several values: Site collection hostname, Site collection unique ID, and Site unique ID where the middle value is the siteId needed to run the permissions POST.
7. [Generate a client secret. ↗](https://docs.microsoft.com/azure/active-directory/develop/howto-create-service-principal-portal#option-2-create-a-new-application-secret).

Set the following source configurations in Data Connection:

| Option  | Required?  | Description |
|--- |--- |---  |
| `Azure Client ID` | Yes | The ID of the app registration; also called Application ID. |
| `Azure Tenant ID` | Yes | the unique identifier of the Microsoft Entra ID instance.|
| `Client secret` | Yes | The secret generated in the app registration. |

### Username/password

The username/password flow involves creating a user account that can sign in to Microsoft 365. The Graph API does not support two-factor authentication for the username/password authentication method. Because of this, **we strongly recommend creating a randomly generated password of at least 32 characters in length**.

In your Entra admin center, complete the following steps:

1. Go to **API Permissions** in the left sidebar.
2. Select **Add a Permission**.
3. Select **Microsoft Graph**.
4. Select **Delegated Permissions**.
5. Add the `Sites.Read.All` permission;.
   * If you plan to configure export tasks, use `Sites.ReadWrite.All` instead.
6. If you are an Azure Administrator, select **Grant admin consent for \[tenant]**.
7. Go to **Authentication** in the left sidebar.
8. Change **Allow public client flows** to `Yes`.
9. Create a user in Microsoft Entra ID *with a randomly generated password of at least 32 characters*.
10. Add that user to any SharePoint sites that you would like it to read or write.

Set the following source configurations in Data Connection:

| Option  | Required?  | Description |
|--- |--- |---  |
| `Azure Client ID` | Yes | The ID of the app registration; also called Application ID. |
| `Username` | Yes | The user's email address.|
| `Password` | Yes | The generated password.|

### XML-based permissioning for SharePoint Add-ins

If you are using [SharePoint Add-ins for authorization and authentication ↗](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/authorization-and-authentication-of-sharepoint-add-ins), and your SharePoint Add-in uses XML for permission management, you must ensure that the correct scope is set in the scope URI to avoid access issues when connecting to SharePoint.

Follow the steps below to verify and configure the correct scope:

1. Locate the `AppManifest.xml` file containing the permission settings for your SharePoint Add-in.
2. In the `AppManifest.xml` file, identify the scope URI within the XML file, which should look similar to this:

`<AppPermissionRequests AllowAppOnlyPolicy="true"> <AppPermissionRequest Scope="http://sharepoint/content/sitecollection/web" Right="FullControl" /> </AppPermissionRequests>`.

3. Verify that the scope value (in this example, `http://sharepoint/content/sitecollection/web`) matches the SharePoint site to which you are connecting; if the scope value does not match, adjust the scope value accordingly.

### Networking

The SharePoint Online connector requires network access to the following domains on port 443:

* `login.microsoftonline.com`
* `graph.microsoft.com`
* Your SharePoint URL; for example, `contoso.sharepoint.com`

If you are using a GovCloud SharePoint instance, use the following domains on port 443 instead:

* `login.microsoftonline.us`
* `graph.microsoft.us`
* Your SharePoint URL; for example, `contoso.sharepoint.us`

## Configuration options

The following configuration options are available for the SharePoint Online connector:

| Option  | Required?  | Description |
|--- |--- |---  |
| `SharePoint Library URL` | Yes |  A single SharePoint site may have several document libraries; your URL must point to a specific library. Must be in the format `https://[tenant].sharepoint.com/sites/[site]/[library]`. |
| `Credentials settings` | Yes |  Configure using the [Authentication](#authentication) guidance shown above. |
| `Proxy settings` | No | Enable to use a proxy while connecting to SharePoint Online.|

## Sync data from SharePoint Online

The SharePoint Online connector uses the [file-based sync interface](/docs/foundry/data-connection/file-based-syncs/).

## Export data to SharePoint Online

To export to a SharePoint site, first [enable exports](/docs/foundry/data-connection/export-overview/#enable-exports-for-source) for your SharePoint Online connector. Then, [create a new export](/docs/foundry/data-connection/export-overview/#create-a-new-export).

### Export configuration options

| Option  | Required? | Default | Description |
|--- |--- |--- |--- |
| `Directory path` | Yes | / | The path to the folder in the SharePoint library where files should be exported. The full path for an exported file is calculated as `<SharePoint Library URL>/Directory Path>/<Exported File Path>` |

## Use SharePoint sources in code

The example below demonstrates how to upload a file to a SharePoint source using the [Python client for SharePoint ↗](https://pypi.org/project/Office365-REST-Python-Client/) `Office365-REST-Python-Client` in an [external transform](/docs/foundry/data-connection/external-transforms/). Note that this example uses **client certificate** authentication.

Review more [examples from SharePoint ↗](https://github.com/vgrem/office365-rest-python-client/tree/master/examples/sharepoint).

```python
from pyspark.sql import DataFrame
from transforms.api import Input, Output, transform, lightweight
from transforms.external.systems import external_systems, Source
import pandas as pd
import polars as pl
from office365.sharepoint.client_context import ClientContext

@lightweight
@external_systems(
    sharepoint_source=Source("<source_rid>")
)
@transform(
    output=Output("<dataset_rid>"),
    input_df=Input("<dataset_rid>"), # Dataset containing a list of files to export to SharePoint
)
def compute(ctx, input_df: DataFrame, output, sharepoint_source) -> DataFrame:

    # 1. Connect to SharePoint using client certificate authentication.
    client = ClientContext("<sharepoint_url>").with_client_certificate(
        tenant="<tenant_id>",
        client_id="<client_id>",
        thumbprint="<thumbprint>",
        private_key=sharepoint_source.get_secret("clientSecret"),
    )

    current_web = client.web
    client.load(current_web)
    client.execute_query()

    target_folder = client.web.lists.get_by_title("<document_library_name>").root_folder

    # 2 Upload files from input_df, store URL in dataset
    upload_urls = []
    fs = input_df.filesystem()
    input_files = fs.ls()
    for f in input_files:
        with fs.open(f.path) as fileobj:
            uploaded_file = target_folder.upload_file(f.path, fileobj).execute_query()
            upload_urls.append({'file_name': f.path, 'upload_url': uploaded_file.serverRelativeUrl})


    # 3. Return dataset of uploaded URLs
    output.write_table(pl.from_pandas(pd.DataFrame.from_records(upload_urls)))
```

### Ingest SharePoint Lists

The SharePoint Online connector only supports file-based ingestion. To ingest data from SharePoint Lists, use an [external transform](/docs/foundry/data-connection/external-transforms/) with the Microsoft Graph API. The following helper class handles OAuth2 authentication and provides methods to retrieve lists and list items with automatic pagination:

```python
import requests
import logging
from typing import Optional, Dict, List
from urllib.parse import urlparse


class SharePointListReader:
    """
    Client for reading SharePoint lists via Microsoft Graph API.

    This class handles OAuth2 authentication and provides methods to:
    - Retrieve all lists from a SharePoint site
    - Fetch items from specific lists with automatic pagination

    Args:
        tenant_id: Azure AD tenant ID
        client_id: Azure AD application (client) ID
        client_secret: Azure AD application client secret
        site_url: Full SharePoint site URL (e.g., https://contoso.sharepoint.com/sites/mysite)
        logger: Optional custom logger instance
    """

    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        site_url: str,
        logger: Optional[logging.Logger] = None
    ):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.site_url = site_url.rstrip("/")
        self.base_url = "https://graph.microsoft.com/v1.0"

        self.access_token: Optional[str] = None
        self.site_id: Optional[str] = None
        self.logger = logger or self._setup_default_logger()

    def _setup_default_logger(self) -> logging.Logger:
        """Configure default logger with console output."""
        logger = logging.getLogger(__name__)
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(levelname)s: %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            logger.setLevel(logging.INFO)
        return logger

    def get_access_token(self) -> bool:
        """
        Acquire OAuth2 access token from Azure AD.

        Returns:
            True if token was successfully acquired, False otherwise
        """
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
        }

        try:
            response = requests.post(token_url, data=payload)
            response.raise_for_status()
            token_data = response.json()
            self.access_token = token_data["access_token"]

            expires_in = token_data.get("expires_in", 3600)
            self.logger.info(f"Authentication successful (expires in {expires_in}s)")
            return True

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Authentication failed: {e}")
            return False

    def _make_graph_request(self, url: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """
        Execute authenticated GET request to Microsoft Graph API.

        Args:
            url: Full Graph API endpoint URL
            params: Optional query parameters

        Returns:
            JSON response as dictionary, or None on failure
        """
        if not self.access_token and not self.get_access_token():
            return None

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                self.logger.debug(f"Response details: {e.response.text}")
            return None

    def get_site_id(self) -> Optional[str]:
        """
        Retrieve SharePoint site ID from site URL.

        Returns:
            Site ID string, or None if retrieval fails
        """
        if self.site_id:
            return self.site_id

        parsed = urlparse(self.site_url)
        hostname = parsed.hostname
        site_path = parsed.path.strip("/")

        url = f"{self.base_url}/sites/{hostname}:/{site_path}"
        data = self._make_graph_request(url)

        if data and "id" in data:
            self.site_id = data["id"]
            self.logger.debug(f"Site ID retrieved: {self.site_id}")
            return self.site_id

        self.logger.error("Failed to retrieve site ID")
        return None

    def get_all_lists(self) -> Optional[Dict]:
        """
        Retrieve all lists from the SharePoint site.

        Returns:
            Dictionary containing list metadata, or None on failure
        """
        site_id = self.get_site_id()
        if not site_id:
            return None

        url = f"{self.base_url}/sites/{site_id}/lists"
        data = self._make_graph_request(url)

        if data and "value" in data:
            self.logger.info(f"Found {len(data['value'])} lists in site")
            for lst in data["value"]:
                self.logger.info(f"  - {lst['name']} (ID: {lst['id']})")

        return data

    def get_all_list_items(self, list_id: str) -> Optional[List[Dict]]:
        """
        Retrieve all items from a SharePoint list with automatic pagination.

        Args:
            list_id: GUID of the SharePoint list

        Returns:
            List of item dictionaries, or None on failure
        """
        site_id = self.get_site_id()
        if not site_id:
            return None

        all_items = []
        url = f"{self.base_url}/sites/{site_id}/lists/{list_id}/items"
        params = {"$expand": "fields", "$top": 5000}

        page_count = 0
        while url:
            current_params = None if "@odata.nextLink" in url else params
            data = self._make_graph_request(url, current_params)

            if not data or "value" not in data:
                break

            page_count += 1
            items_in_page = len(data["value"])
            all_items.extend(data["value"])

            self.logger.debug(f"Page {page_count}: retrieved {items_in_page} items")

            url = data.get("@odata.nextLink")
            params = None

        self.logger.info(f"Retrieved {len(all_items)} total items from list")
        return all_items
```

The following example demonstrates how to use this class in an external transform to ingest SharePoint List data into a Foundry dataset:

```python
from transforms.api import Output, transform, lightweight
from transforms.external.systems import external_systems, Source
import polars as pl


@lightweight
@external_systems(
    sharepoint_source=Source("<source_rid>")
)
@transform(
    output=Output("<dataset_rid>"),
)
def compute(ctx, output, sharepoint_source):

    # 1. Initialize the SharePoint List reader with credentials from the source
    reader = SharePointListReader(
        tenant_id="<tenant_id>",
        client_id="<client_id>",
        client_secret=sharepoint_source.get_secret("clientSecret"),
        site_url="https://contoso.sharepoint.com/sites/mysite"
    )

    # 2. Retrieve all items from a specific list
    items = reader.get_all_list_items(list_id="<list_guid>")

    # 3. Extract the fields from each item and write to the output dataset
    records = [item["fields"] for item in items if "fields" in item]
    output.write_table(pl.from_dicts(records))
```
