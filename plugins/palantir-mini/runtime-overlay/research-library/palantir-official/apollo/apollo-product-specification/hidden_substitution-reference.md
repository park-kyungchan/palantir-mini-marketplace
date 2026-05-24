---
sourceUrl: "https://www.palantir.com/docs/apollo/apollo-product-specification/hidden_substitution-reference/"
canonicalUrl: "https://palantir.com/docs/apollo/apollo-product-specification/hidden_substitution-reference/"
sourceLastmod: "2026-05-12T17:06:26.159Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "09086d665c979e9dfa13abe1e5ccd006c436e1935de18b5498d1ee5e85fedfbe"
product: "apollo"
docsArea: "apollo-product-specification"
locale: "en"
upstreamTitle: "Documentation | Apollo Product Specification > Substitution Reference"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Apollo Product Definition: Substitution Reference Guide

:::callout{theme="neutral"}
Substitution are in a beta state and may not be available on your Apollo Hub. Contact your Palantir representative to learn more.
:::

## Referencing Secrets

Services can read in [generated and user-defined secrets](/docs/apollo/apollo-product-specification/hidden_apollo-product-spec-definition-full/#generating-secrets-at-runtime) from configuration using the substitution language’s `secret` method:

```yaml
conf:
  oauth-client:
    id: my-oauth-client-id
    secret: '{{secret("my-oauth-secret")}}'
generated_secrets:
  my-oauth-secret:
    type: random_string
    length: 32
```

The `secret` function used above additionally supports the following named arguments:

* `name`: The name of the secret. If no named arguments are provided, the provided string is considered the secret name; in the example above, this is `my-oauth-secret`.
* `part`: The part of the secret to render. Different types of secrets support different parts:
  * random\_string:
    * bcrypt\_hash: A [bcrypt ↗](https://en.wikipedia.org/wiki/Bcrypt) hash of the secret. The hash is computed with a cost of 10.
      * `secret_value`: The value of the secret. The default part rendered when no part is defined.
    * random\_bytes:
      * `secret_value`: The value of the secret. The default part rendered when no part is defined.
    * `rsa_pkcs8`:
      * `private_key`: The base64-encoded RSA private key in PKCS8 format.
      * `public_key`: The base64-encoded RSA public key in PKCS8 format.
    * `ec_pkcs8`:
      * `private_key`: The base64-encoded elliptic-curve private key in PKCS8 format.
      * `public_key`: The base64-encoded elliptic-curve public key in PKCS8 format.

Named argument usage appears as:

```yaml
generated_secrets:
  my-oauth-secret:
    type: random_string
    length: 24
conf:
  oauth-client:
    id: my-oauth-client-id
    secret: '{{secret(name: "my-oauth-secret")}}'
    bcrypted-secret: '{{secret(name: "my-oauth-secret", part: "bcrypt_hash")}}'
```

## Referencing Certificate Material \[Beta]

The Service Management Plane’s substitution language exposes information for accessing [Certificates and CAs](/docs/apollo/apollo-product-specification/hidden_apollo-product-spec-definition-full/#certificates-and-cas) through configuration. Referencing these security material file paths can be done using the `ssl` method:

```yaml
conf:
  cert-file: '{{ssl.cert_path}}'
  key-file: '{{ssl.pem_path}}'
  ca-file: '{{ssl.ca_path}}'
  truststore: '{{ssl.truststore_path}}'
  keystore: '{{ssl.keystore_path}}'
```

## Referencing Requested Volumes

Substitution language provides paths on disk to volume mounts requested in product configuration (see [Requesting Storage for Your Service](/docs/apollo/apollo-product-specification/hidden_apollo-product-spec-definition-full/#requesting-storage-for-your-service) for how to request volumes). Reading in the path to a volume can be done using the `volumes` substitution method:

```yaml
volumes:
  app-data:
    durable-storage-configuration:
      desired-size: 10G
conf:
  my-app-data-dir: '{{volumes.app-data.PathOnDisk}}'
```

## Referencing Endpoint Definitions

The substitution language includes a method for referencing a product's [declared endpoints](/docs/apollo/apollo-product-specification/hidden_apollo-product-spec-definition-full/#declaring-endpoints):

```yaml
endpoints:
  definitions:
    my-endpoint:
      desired-port: 8443
      path: /my-endpoint-path
conf:
  server:
    my-endpoint-port: '{{ endpoints.definitions.port }}'
    my-endpoint-path: '{{ endpoints.definitions.path }}'
```

## Self-referencing Conf fields

To help developers to avoid repeating themselves when writing configurations, substitution supports referencing other fields under a `configuration.yml` file’s `conf` block:

```yaml
conf:
  a: b
  also-a: '{{conf.a}}' # renders to 'b'
```

## Additional Builtin Functions

Substitution additionally offers a set of built-ins for convenience. These include:

* [Arithmetic and logical operators](#arithmetic-and-logical-operators)
* [Built-in utility functions](#built-in-utility-functions)

### Arithmetic and logical operators

```yaml
conf:
  a: 5
  b: 2
  add: '{{conf.a + conf.b}}'
  subtract: '{{conf.a - conf.b}}'
  multiply: '{{conf.a * conf.b}}'
  divide: '{{conf.a / conf.b}}'
  int_divide: '{{conf.a // conf.b}}'
  mod: '{{conf.a % conf.b}}'
  eq: '{{conf.a == conf.b}}'
  neq: '{{conf.a != conf.b}}'
  gt: '{{conf.a > conf.b}}'
  lt: '{{conf.a < conf.b}}'
  geq: '{{conf.a >= conf.b}}'
  leq: '{{conf.a <= conf.b}}'
  and: '{{conf.a != null && conf.a > 4}}'
  or: '{{conf.b == null || conf.b < 4}}'

  c: ['a']
  d: ['b']
  concat: '{{c + d}}'
```

### Built-in utility functions

```yaml
conf:
   list-of-list: [[1,2,3], [4,5,6], [7,8,9]]

   # `len` gives the length of an array
   num-name-nodes: "{{len(discovered.hadoop-name-node))}}"

   # `join` concatenates strings with a separator
   comma-separated-uris: "{{join(discovered.hadoop-name-node, ',')}}"

   # `distinct` removes duplicate entries from a list and returns only the unique elements,
   # it uses deep equality to compare elements and will work for both simple and complex types
   distinct-values: "{{distinct(discovered.hadoop-name-node)}}"

   # a Gatekeeper initial node is a json object: e.g. "{ "resource": { "id": "ri.gatekeeper.resource.root", "policy": ... } }"
   distinct-gk-nodes: "{{distinct(discovered.gatekeeper-nodes)}}"

   # `flatten` combines a list of lists by extracting the inner values into a single list
   # it only expands 1 level and will not recursively flatten inner lists
   flattened-list: "{{flatten(conf.list-of-list)}}"

   # `cross_join` takes the cross product of 2 string arrays by concatenting each element with its counter-part in the other array
   # when cross joining an array of size `n` with an array of size `m`, the result will be an array of size `n x m`
   # the example below will return [ "a1", "a2", "b1", "b2", "c1", "c2" ]
   cross-joined-list: "{{cross_join(['a', 'b', 'c'], ['1', '2'])}}"

   # `cross_join` automatically encapsulates string arguments as arrays of size 1. The example below returns:
   # [ "https://localhost", "wss://localhost" ]
   cross-joined-hosts: "{{cross_join(['https://', 'wss://'], "localhost")}}"

   # `cross_join` prioritizes the first arugment in its join operations, if you join a list against an empty list, you will
   # receive the first list back. However, if you an empty list with a non-empty list, you will receive an empty list
   # the first example returns [ "foo", "bar" ], the second example returns []
   cross-join-non-empty: "{{cross_join(["foo", "bar"], []}}
   cross-join-empty: "{{cross_join([], ["foo", "bar"]}}

   # `min` returns the minimum value in an array of numeric values
   min-value: "{{min([1.0, -1.9, 100, -22.2])}}"

   # `max` returns the maximum value in an array of numeric values
   max-value: "{{max([1.0, -1.9, 100, -22.2])}}"

   # `sum` returns the sum of an array of numeric values
   sum-value: "{{sum([1.0, -1.9, 100, -22.2])}}"

   # `contains` returns `true` if an array contains a value that matches the string argument, returns `false`
   # if the value is not contained in the array
   node.master: {{ contains(conf.tags, 'master') }}

   # `merge` returns the result of merging the key/value pairs of a second map argument into the first. If a key exists
   # in both map arguments then the value for the key in the first argument is used.
   merged-map: "{{merge(map1, map2)}}"

   # As of deployd 1.168.0, `merge` supports a variable number of maps. `merge` must be called with at least one
   # argument. If a key exists in more than one of the provided maps, then the value for the key in the first
   # argument that contains the key is used.
   merged-map-of-many-maps: "{{merge(map1, map2, map3, map4)}}"

   # `base64` accepts a string argument and returns the base 64 encoded representation, it will use padding by default
   # if you require the un-padded version of the base 64 encoding, use the `nopadding: true` option
   base64-padding: "{{base64('my-string-value'}}"
   base64-no-padding: "{{base64('my-string-value', nopadding: true)}}"

   # decodes a base64-encoded string
   from-base64: "{{decode_base64(conf.foo-base64)}}"

   # converts a string to its hexadecimal value; convert a hexadecimal text to its string value
   to-hex: "{{hex('my-string-value')}}"
   from-hex: "{{decode_hex(conf.foo-hex)}}"

   # hash functions `md5`, `sha1`, and `sha256` compute the hash for a string argument using the named algorithm
   md5-hash: "{{md5('my-string-value')}}"
   sha1-hash: "{{sha1('my-string-value')}}"
   sha256-hash: "{{sha256('my-string-value')}}"
```
