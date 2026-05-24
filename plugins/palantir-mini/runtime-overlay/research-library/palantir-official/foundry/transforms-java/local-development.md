---
sourceUrl: "https://www.palantir.com/docs/foundry/transforms-java/local-development/"
canonicalUrl: "https://palantir.com/docs/foundry/transforms-java/local-development/"
sourceLastmod: "2026-05-12T17:06:26.151Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "d76545a822bdbda0d41ea5a4cfe47c9f66807c55c4ae164eb18d47415713ec65"
product: "foundry"
docsArea: "transforms-java"
locale: "en"
upstreamTitle: "Documentation | Java > Set up local development"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Set up Java local development

It is possible to carry out local development of Transforms Java repos, allowing for high-speed iterative development.

## Setting up local development for Java transforms repositories

### Clone the repository

1. In your repository’s menu bar, select **Work locally** and copy the repository URI, also referred to as the "git remote URL".

:::callout{theme="warning"}
The repository URI (git remote URL) contains sensitive information linked to your account and should not be shared. To maintain platform security, do **not** share this link with anyone else or post it publicly.
:::

![The option to clone your in-platform repository.](/docs/resources/foundry/transforms-java/clone-repo.png)
![The "Work locally" dialog.](/docs/resources/foundry/transforms-java/work-locally-dialog.png)

2. Using the command line, run `git clone <URI>` on your local machine in a directory of your choice. Then use the `cd` command to navigate to the repository.

### Limitations

* The token granted for cloning is short-lived and read-only, with the exception of pushing back to your repository.
* You will still need to push your changes to Foundry to publish job specs or artifacts, or if you wish to run checks or build.

### Preview

Dataset Previews are supported in local development. See [Local preview](/docs/foundry/transforms-common/local-preview/) for more details.

## Set up the development environment

### Prerequisites

* Ensure Java 17 is installed and the environment variable `JAVA_HOME` points to the right Java installation. You can download Java 17 from the [Oracle website ↗](https://www.oracle.com/java/technologies/downloads/#java17).

:::callout{theme="neutral"}
Setting the `JAVA_HOME` environment variable based on your operating system:

* Windows: Run `SETX JAVA_HOME -m "<java-home-dir>"` in PowerShell. This modifies the system environment variable and you will need to restart the shell for changes to take effect. Alternatively you can run ` [System.Environment]::SetEnvironmentVariable("JAVA_HOME", "<java-home-dir>")` to set `JAVA_HOME` in the running process.
* Linux or macOS: Run `export JAVA_HOME=<java-home-dir>`.
:::

* Ensure you repository is upgraded to the latest template version by following the steps outline [here](/docs/foundry/code-repositories/repository-upgrades/#manual-branch-upgrade).

### Configure the IDE

* Install [IntelliJ Idea ↗](https://www.jetbrains.com/idea/download/) on your machine.
* Open up your command line terminal and navigate into the directory containing your repository using `cd` and run `./gradlew openIdea`. This Gradle task will generate an IntelliJ Idea project and open it.
  * On Windows, the `./gradlew openIdea` command must be run from Git BASH, which is included in [Git for Windows ↗](https://gitforwindows.org/).

### Limitations

* Gradle commands must be run from the terminal using `./gradlew`, rather than using IntelliJ's Gradle plugin.
* Local development works with Java versions up to Java 17, and does not currently support any higher Java versions.
