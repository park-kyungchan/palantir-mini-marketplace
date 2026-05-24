---
sourceUrl: "https://www.palantir.com/docs/apollo/core/set-up-local-kubernetes-cluster/"
canonicalUrl: "https://palantir.com/docs/apollo/core/set-up-local-kubernetes-cluster/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "7742c454ee98897a8576066726eeca42c03620fb55da68a241f5bc4f10ad110f"
product: "apollo"
docsArea: "core"
locale: "en"
upstreamTitle: "Documentation | Apollo > Set up a local Kubernetes cluster"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Set up a local Kubernetes cluster

This guide will walk through setting up a local Kubernetes cluster on your local machine.

:::callout{theme="warning"}
These steps are only intended for development environments. For production environments, you should use a [CNCF-certified distribution of Kubernetes ↗](https://www.cncf.io/certification/software-conformance/#logos).
:::

1. Install [Docker ↗](https://docs.docker.com/) on your local machine.

   * For macOS, you can run the following command:

   ```bash
   brew install docker
   ```

   * Learn more about the different ways [to install Docker ↗](https://docs.docker.com/get-docker/).

2. Install [kind ↗](https://kind.sigs.k8s.io/) on your local machine. You should install kind in a safe folder on your machine, such as `My Documents`.

   * For macOS, you can run the following command:

   ```bash
   brew install kind
   ```

   * Learn more about [installing kind ↗](https://kind.sigs.k8s.io/docs/user/quick-start#installation).

3. If you are using Docker desktop, run the following command to get started:

   ```bash
   docker run -d -p 80:80 docker/getting-started
   ```

4. Create an empty directory on your desktop to store the files necessary for registering your cluster in Apollo. Note the location of this directory.

5. In the directory you created in the previous step, create a file titled `cluster.yml` and add the following configuration:

   ```yaml
   kind: Cluster
   apiVersion: kind.x-k8s.io/v1alpha4
   # Apollo requires a multi-node cluster
   nodes:
   - role: control-plane
   - role: control-plane
   - role: control-plane
   - role: worker
   - role: worker
   - role: worker
   ```

6. In the directory you created above, run the following command to create a new Kubernetes cluster with the configuration from the previous step.

   ```bash
   kind create cluster --config cluster.yml
   ```

7. Wait for the cluster to install and get started.

8. When it is finished, you can run `kubectl get nodes` to view all of the nodes that were created. This command should return the following output. Note that your `AGE` and `VERSION` information may differ from the example below.

   ```bash
   $ kubectl get nodes
   NAME                    STATUS      ROLES               AGE     VERSION
   kind-control-plane      Ready       control-plane       1h      v1.24.0
   kind-control-plane2     Ready       control-plane       1h      v1.24.0
   kind-control-plane3     Ready       control-plane       1h      v1.24.0
   kind-worker             Ready       <none>              1h      v1.24.0
   kind-worker2            Ready       <none>              1h      v1.24.0
   kind-worker3            Ready       <none>              1h      v1.24.0
   ```

9. You can now use this cluster to [set up a Spoke Environment in Apollo](/docs/apollo/core/connect-spoke/). Navigate to the **Create Environment** workflow in Apollo to continue setting up your Spoke Environment.

   ![The Register Environment workflow in Apollo.](/docs/resources/apollo/core/create-environment-step-1.png)
