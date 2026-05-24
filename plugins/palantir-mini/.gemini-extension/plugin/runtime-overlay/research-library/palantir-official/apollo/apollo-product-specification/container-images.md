---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/container-images/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/container-images/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "92a668d20fd794820d30e86e6aaef45c5306c91945f1ec60dd4ac06eb9822b90"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Products and Packaging > Container Images"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Container Image Specification

This document outlines how to specify container images in the Apollo [Product Release Manifest](/docs/apollo/apollo-product-specification/manifest/).

## Publishing Images

Container images that form a Product Release can be published under any name that matches the OCI image specification. A fully qualified image name must conform to the OCI image name specification. See the [Kubernetes ↗](https://kubernetes.io/docs/concepts/containers/images/#image-names) and [OCI ↗](https://github.com/opencontainers/distribution-spec/blob/main/spec.md#workflow-categories) documentation for reference. Image names must have the following format:

```text
{registry}/{repository}/{imageName}:{version}
```

Where:

* `{registry}`: The full URL where the artifact exists.
* `{repository}` (Optional): Repository where the artifact exists within the overall registry.
* `{imageName}`: Name of the image.
* `{version}`: The digest or tag that indicates which version of the image to pull.

Example of valid image names:

* `docker.io/bitnami/wordpress:5.9.2-debian-10-r9`
* `docker.io/bitnami/wordpress:5.9.2-debian-10-r9@sha256:1234`
* `bitnami/wordpress:5.9.2-debian-10-r9`
* `docker.io/library/nginx:stable-perl`

Example of invalid image names:

* `bitnami/wordpress`
* `bitnami/wordpress@sha256:1234`

## Specifying container images in the manifest extension

All container images that a Product Release uses, must be declared via the `artifacts` manifest extension. This extension is a list of fully qualified image locators and can be used by all Apollo Product Spec product types.

### Example Usage

```yaml
extensions:
  artifacts:
    - type: oci
      uri: docker.io/bitnami/wordpress:5.9.2-debian-10-r9
```

Each listed artifact must provide the following fields:

* `type`: the artifact's type. The only currently supported value is `oci`, used for artifacts that comply with the [Open Container Initiative ↗](https://opencontainers.org/) image specification.
* `uri`: a fully qualified locator for the artifact.

## Best practice: Base image reuse

Images should be as lean as reasonably possible. Image bloat is a concern both for storing images and running containers; to prevent image bloat, reuse base images and do not add unnecessary layers to your image. An example of a lightweight base image in use by many products is [Alpine ↗](https://hub.docker.com/_/alpine).
