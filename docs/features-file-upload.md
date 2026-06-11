---
layout: doc
---

# File upload

`shacl-vue` supports file upload to an HTTP server using [`git-annex`](https://git-annex.branchable.com/)'s [p2p protocol over http](https://git-annex.branchable.com/design/p2p_protocol_over_http/). And since [`forgejo-aneksajo`](https://codeberg.org/forgejo-aneksajo/forgejo-aneksajo/) is a [`forgejo`](https://forgejo.org/) fork with `git-annex` support, `shacl-vue` can upload files to `git-annex` repositories hosted on `forgejo-aneksajo` deployments. https://hub.datalad.org/ is an example of such a deployment.

## How it works

1. Firstly, `shacl-vue` needs some base configuration options to integrate it with a specific `git-annex` repository (or multiple repositories).
2. File uploads can be activated in two ways:
   - via a dedicated [Wizard Editor](./features-wizard-editors) that has an `input` with `type: upload`.
   - via the schema, by annotating a specific field to indicate that a file uploader should render for it in `shacl-vue`; this needs an accompanying configuration update to tell `shacl-vue` to render the `InstancesUploadEditor` when it sees that annotation.
3. The `InstancesUploadEditor4Wiz` component (for the dedicated wizard editor) or the `InstancesUploadEditor` component (for the annotated field) handles the upload to the `git-annex` repository and receives all resulting file information, but needs to know what to do with that.
4. This is where the required TTL template comes in, to tell `shacl-vue` which records to create and how to link them.

Below, the procedures for stting up both file uploader approaches are described in more detail.


## Requirements for the wizard editor uploader

This preferred approach makes use of `shacl-vue`'s [Wizard Editor](./features-wizard-editors) feature, by declaring one of the inputs to be of `type: upload`. This renders a file upload button/area inside a wizard editor dialog.

### `shacl-vue` configuration for `git-annex` integration

Before a configured wizard editor can be functional, the connection to a `gitannex_p2phttp` endpoint should be made first. This is done via the `gitannex_p2phttp_config_wizard` option:

```yaml
use_gitannex_p2phttp: true
gitannex_p2phttp_config_wizard:
  client_uuid: shacl-vue-frontend
  targets:
    - name: Psychoinformatics Hub
      base_url: https://hub.psychoinformatics.de/git-annex-p2phttp/git-annex
      repositories:
        - name: Public uploads
          annex_uuid: 22dde37c-478a-13fd-87c0-4as340df4bf7
        - name: Private uploads
          annex_uuid: 91aae02d-368a-00fd-89c0-1cc340df5bf7
```

Firstly, setting `use_gitannex_p2phttp` to true tells the app to allow file uploads.

Sub-options include:

- `client_uuid`: an arbitrary string that does not have to be a UUID. It's purpose is to identify the source of a request to the endpoint.
- `targets`: a list of targets, each with a unique `base_url`, that are presented to the user for selection (in order of specification). On any `forgejo-aneksajo` deployment, this location of the `base_url` is always at `<hub-URL>/git-annex-p2phttp/git-annex`
- any `target` may have multiple `repositories`, each with a unique `annex_uuid` which identifies the specific repository into which a file can be uploaded. Repositories (per selected target) are presented to the user for selection (in order of specification).


### Wizard editor configuration

The following example shows the wizard editor configuration for a "Depiction Upload Wizard" that has a single input to allow uploading a file.

```yaml
DepictionUploadWizard:
  name: Depiction Upload Wizard
  tooltip: Upload a depiction
  icon: mdi-account-box-outline
  description: Upload an image of the person and hit *Save*
  inputs:
    - prop: file
      name: File
      type: upload
      required: true
  template: content:person-depiction-upload
```

### Wizard editor template

Once a file is uploaded by the `GitAnnexUploader4Wiz` component (which is rendered in response to the `type: upload` input specification), it returns a set of values:

```javascript
{
    name // the file name (not full path) with extension
    size // the file size in bytes
    hash // the SHA-256 hash of the file content
    annexKey // the annex key of the file, see https://git-annex.branchable.com/internals/key_format/
    downloadUrl // the constructed download URL
}
```

The wizard editor will use this, together with a provided template, to create and link RDF triples that are added to the application's graph store. The configuration above specifies that the `template` points to `content:person-depiction-upload`. This uses `shacl-vue`'s approach to [text content loading](./app-configuration#content) to load the template, which should be a TTL file specified via the `content` option, for example:

```yaml
content:
  person-depiction-upload:
    url: templates/person-depiction-upload.nunjucks.ttl
```

The associated TTL may look like this:

```turtle
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix dldi: <https://pid.datalad.org/distributions/> .
@prefix dlthings: <https://concepts.datalad.org/s/things/v2/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix spdx: <http://spdx.org/rdf/terms#> .
@prefix xyzri: <https://concepts.datalad.org/s/demo-research-information/unreleased/> .
@prefix xyzrins: <https://concepts.datalad.org/s/demo-research-information/ns/>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

{% set depictionId = _randomUUID() -%}
{% set depictionURI = "https://concepts.datalad.org/s/demo-research-information/ns/depictions/" + depictionId -%}
dldi:{{ file.annexKey }} a xyzri:XYZFile;
    skos:prefLabel {{ file.name | ttl }}^^xsd:string;
    dlthings:distribution_of <{{ depictionURI }}>;
    dlthings:byte_size {{ file.size | ttl }}^^xsd:nonNegativeInteger;
    dlthings:characterized_by _:n0-1.
_:n0-1 a dlthings:Statement;
    rdf:object <{{ file.downloadUrl }}>;
    rdf:predicate dcat:downloadUrl.
dldi:{{ file.annexKey }} dlthings:checksums _:n0-2.
_:n0-2 a dlthings:Checksum;
    skos:notation {{ file.hash | ttl }}^^xsd:hexBinary;
    dcterms:creator spdx:checksumAlgorithm_sha256.
<{{ depictionURI }}> a xyzri:XYZDepiction;
    dcterms:subject <{{ pid }}>;
    dcterms:type <https://concepts.datalad.org/s/demo-research-information/ns/depiction-types/e9a34f7d-d05e-4591-bb45-f8a0c499e07b>;
    dlthings:distributions dldi:{{ file.annexKey }}.
<{{ pid }}> dlthings:depiction <{{ depictionURI }}>.
```

This uses `shacl-vue`'s template handling procedure (which includes [Nunjucks](https://mozilla.github.io/nunjucks/) support) to replace template placeholders with provided or calculated values, including record-specific details and the returned file upload values.

As a result, apart from the file being successfully uploaded to the selected destination, a set of descriptive metadata records are created as well, which can then be submitted via `shacl-vue`.


## Requirements for the annotated-field uploader

While fully functional and supported, the annotated-field uploader is less versatile than the wizard-based uploader. The following steps are necessary to enable this feature.

### `shacl-vue` configuration for `git-annex` integration

An example configuration could be:

```yaml
gitannex_p2phttp_config:
  base_url: https://hub.psychoinformatics.de/git-annex-p2phttp/git-annex
  annex_uuid: 4freeb00-bfg8-2le4-8c66-71ll03d86453
  client_uuid: shacl-vue-frontend
use_gitannex_p2phttp: true
```

- setting `use_gitannex_p2phttp` to `true` tells the app to allow file uploads.
- the `base_url`, `annex_uuid`, and `client_uuid` are specified in the same way as described above.

### Schema annotation

The field/slot in the schema for which `shacl-vue` is supposed to provide a file uploader component should receive the annotation `shaclvue:gitAnnexUpload: true` where the `shaclvue` namespace resolves to: `https://concepts.datalad.org/ns/shaclvue/`.

NOTE: The field can be arbitrary and will most likely be schema- and use-case dependent, but a current requirement is that the ***range of the field should be a class***.

An example in LinkML YAML would be:

```yaml
classes:
  Grant:
    description: >-
      A grant, typically financial or otherwise quantifiable, resources.
    slots:
      - application_document
    slot_usage:
      proposal_document:
        range: Document
        annotations:
          shaclvue:gitAnnexUpload: true
```

Similarly, the node- and property shapes in SHACL could look like:

```turtle
datalad:Grant a sh:NodeShape ;
    sh:closed true ;
    sh:description "A grant, typically financial or otherwise quantifiable, resources." ;
    sh:ignoredProperties ( rdf:type ) ;
    sh:name "Grant" ;
    sh:property [ sh:class datalad:Document ;
        shaclvue:gitAnnexUpload true ;
        sh:description "The proposal document that was submitted and accepted and led to the Person or Organization receiving the Grant" ;
        sh:name "Proposal document" ;
        sh:maxCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:order 0.0 ;
        sh:path datalad:proposal_document ],
```

Yet another way to achieve the same, this time without having to change the incoming schema, is to make use of `shacl-vue`'s [`update_shapes`](./app-configuration#update-shapes) configuration option. The following example shows how to add the `shaclvue:gitAnnexUpload: true` annotation to the `xyzri:distributions` property shape of a `xyzri:XYZDocument` node shape. This will then render a file uploader for the `xyzri:distributions` property:

```yaml
update_shapes
  xyzri:XYZDocument:
    sh:property:
      xyzri:distributions:
        shaclvue:gitAnnexUpload: true
```

### `shacl-vue` configuration for editor selection

The editor component in `shacl-vue` that allows file uploads is the [`InstancesUploadEditor`](https://hub.psychoinformatics.de/datalink/shacl-vue/src/branch/main/src/components/InstancesUploadEditor.vue). Internally, it instantiates the [`GitAnnexUploader`](https://hub.psychoinformatics.de/datalink/shacl-vue/src/branch/main/src/components/GitAnnexUploader.vue) component which does the actual work of uploading a user-provided file.

To ensure that the `InstancesUploadEditor` gets rendered for the slot/field that we annotated in the schema, we can use the [`editor_selection`](./app-configuration#editor_selection) config option, for example:

```yaml
editor_selection:
  shaclvue:gitAnnexUpload:
    true: InstancesUploadEditor
```

This will tell `shacl-vue` that if it sees a slot with that annotation key (`shaclvue:gitAnnexUpload`) and annotation value (`true`), then it should select and render the `InstancesUploadEditor`. This config-driven approach takes precedence over `shacl-vue`'s standard [dynamic editor matching approach](./editor-component#component-matching) approach.

### Templates for the `InstancesUploadEditor`

Here, once a file is uploaded by the `GitAnnexUploader` component, it returns the same set of values listed above, but here it is returned to the `InstancesUploadEditor`:

The `InstancesUploadEditor` will use this, together with provided templates, to create and link RDF triples that are added to the applications graph store. These templates are provided via `shacl-vue` component-specific config as follows:

```yaml
component_config:
  InstancesUploadEditor:
    datalad:Document:
      pid_template: 'dataladdoc:{_randomUUID}'
      ttl_template: 'content:DocumentUploadTemplate'
```

#### The `pid_template`

This is a string template that tells `InstancesUploadEditor` how to construct the PID of the root record that will be created once the upload completes successfully. In the case of the above example, this is a record of type `datalad:Document`.

Any text inside the curly braces will be replaced with actual parameters known in the limited templating scope, which includes all values returned by the `GitAnnexUploader` component, as well as the helper `_randomUUID`, which will use Javascript's `crypto.randomUUID()` to generate a random UUID.

Any prefix used in the `pid_template` should also be included in the TTL template below.

#### The `ttl_template`

This is where the strength of the `InstancesUploadEditor` lies, it will take arbitrary TTL as input and serialize that (after the template parameters have been filled) into RDF triples that can be added to the application's graph store. This means that any level of complexity with regards to class hierarchies and linkage can be accommodated.

The `ttl_template` option can be provided as a serialized TTL string, or using `shacl-vue` [configuration content syntax](./app-configuration#content) to point to a separate TTL file. In the example above, `DocumentUploadTemplate` could point to a `DocumentUploadTemplate.ttl` file in the root directory:

```yaml
content:
  DocumentUploadTemplate:
    url: DocumentUploadTemplate.ttl
```

An example TTL template file could look like:

```turtle
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix trr379ra: <https://concepts.trr379.de/s/research-assets/unreleased/> .
@prefix trr379: <https://trr379.de/ns/> .
@prefix trr379doc: <https://trr379.de/ns/document/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix dlthings: <https://concepts.datalad.org/s/things/v1/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dlflatfiles: <https://concepts.datalad.org/s/flat-files/unreleased/> .
@prefix dlidentifiers: <https://concepts.datalad.org/s/identifiers/unreleased/> .
@prefix dldi: <https://pid.datalad.org/distributions/> .
@prefix spdx: <http://spdx.org/rdf/terms#> .
@prefix dlfilesmx: <https://concepts.datalad.org/s/files-mixin/unreleased/> .
@prefix dlcommonmx: <https://concepts.datalad.org/s/common-mixin/unreleased/> .

{pid} a trr379ra:TRR379Document;
    dlcommonmx:title "{name}".
dldi:{annexKey} a trr379ra:TRR379Distribution;
    dlfilesmx:distribution_of {pid};
    dlfilesmx:byte_size "{size}"^^xsd:nonNegativeInteger;
    dlthings:characterized_by _:n0-1.
_:n0-1 a dlthings:Statement;
    rdf:object <{downloadUrl}>;
    rdf:predicate dcat:downloadUrl.
dldi:{annexKey} dlflatfiles:checksums _:n0-2.
_:n0-2 a dlidentifiers:Checksum;
    dlidentifiers:notation "{hash}";
    dlidentifiers:creator "http://spdx.org/rdf/terms#checksumAlgorithm_sha256"^^xsd:anyURI.
```

### And that's that!

Happy uploading :)