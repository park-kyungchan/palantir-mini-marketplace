---
sourceUrl: "https://www.palantir.com/docs/foundry/functions/python-functions-local-development/"
canonicalUrl: "https://palantir.com/docs/foundry/functions/python-functions-local-development/"
sourceLastmod: "2026-05-12T17:06:26.152Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "0c15ba0a9a1ca1a996a1e66ec21d52df12c20bee3865606581cb3a34b5948ec7"
product: "foundry"
docsArea: "functions"
locale: "en"
upstreamTitle: "Documentation | Python > Local development"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Local development

You can carry out local development of Python functions repositories, allowing for high-speed iteration in your customized environment.

## Setting up local development for Python functions repositories

### Clone the repository

1. In the menu bar of your repository, select **Work locally** to open the dialog and copy the given repository URL. <br><br>
   ![The top menu bar of a repository with the "Work locally" option to the right.](/docs/resources/foundry/functions/clone-repo.png) <br><br>
   ![The "Work locally" dialog.](/docs/resources/foundry/functions/work-locally-dialog.png) <br><br>

2. Using the command line, run `git clone <URI>` on your local machine in a directory of your choice. Then use the `cd` command to navigate to the repository.

### Limitations

* The token granted for cloning is short-lived and read-only, with the exception of pushing back to your repository.
* You will still need to push your changes to Foundry to publish artifacts, or if you wish to run checks or build.

## Set up the development environment

### Prerequisites

* Ensure Java 17 is installed and that the environment variable `JAVA_HOME` points to the right Java installation. Java 17 can be downloaded from the [Oracle website ↗](https://www.oracle.com/java/technologies/downloads/#java17).

:::callout{theme="neutral"}
Setting the `JAVA_HOME` environment variable based on your operating system:

* Windows: Run `SETX JAVA_HOME -m "<java-home-dir>"` in PowerShell. This modifies the system environment variable and you will need to restart the shell for changes to take effect. Alternatively you can run ` [System.Environment]::SetEnvironmentVariable("JAVA_HOME", "<java-home-dir>")` to set `JAVA_HOME` in the running process.
* Linux or macOS: Run `export JAVA_HOME=<java-home-dir>`.
:::

* Ensure your repository is upgraded to the latest template version by following the steps outline [here](/docs/foundry/code-repositories/repository-upgrades/#manual-branch-upgrade).
* Ensure that the environment variables `CI`, `JEMMA`, and `CA` are not set.
* If running on an Apple silicon Mac, ensure that [Rosetta 2 ↗](https://developer.apple.com/documentation/apple-silicon/about-the-rosetta-translation-environment) is installed. You can install Rosetta 2 by running `/usr/sbin/softwareupdate --install-rosetta --agree-to-license` in the terminal.

## Visual Studio Code

* Ensure you have [Visual Studio Code ↗](https://code.visualstudio.com/) installed.
* Install the [Python extension ↗](https://marketplace.visualstudio.com/items?itemName=ms-python.python) from the Visual Studio Code site or from the **Extensions** tab in the application.
* To auto-generate settings files that configure the Python interpreter for Visual Studio Code, run the command `./gradlew vsCode`.

## PyCharm

* To set up a Python development environment, run the command `./gradlew condaDevelop`.

* Ensure you have [JetBrains PyCharm ↗](https://www.jetbrains.com/pycharm/) installed locally.

* Import the project following the steps outlined [here ↗](https://www.jetbrains.com/help/pycharm/open-projects.html).

* Choose **Add New Interpreter** from the [Python Interpreter selector ↗](https://www.jetbrains.com/help/pycharm/configuring-python-interpreter.html#widget) on the status bar. <br><br>
  ![add python interpreter screenshot](/docs/resources/foundry/functions/pycharm-add-python-interpreter.png) <br><br>

* In the left-hand pane of the **Add Python Interpreter** dialog, select **Virtualenv Environment**. <br><br>
  ![configure python interpreter screenshot](/docs/resources/foundry/functions/pycharm-configure-python-interpreter.png) <br><br>

* Choose **Existing environment** and set the **Interpreter** field to the Python interpreter from your Conda environment.
  * For Unix, the Python interpreter path is <code>\<your-conda-environment-dir>/bin/python</code>.<br/>
  * For Windows, the Python interpreter path is <code>\<your-conda-environment-dir>\python.exe</code>.

:::callout{theme="neutral"}
Depending on whether the test plugin is enabled, the installed environments would include `./python-functions/build/conda/run-env`, `./python-functions/build/conda/test-env`, or both. You should pick the test environment if you plan on running tests.
:::

* Select **Ok**.
