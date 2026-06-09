---
layout: doc
---

# Application configuration

Any unique instance of `shacl-vue` can be tailored to its specific use case and users through a custom configuration. This includes required instance inputs, such as the URLs to the input sources covered in the [Application Inputs section](./app-inputs), as well as various settings for theming, identifiers, UI behavior, and service API integration.

Configuration is done via a `config` file, which can be provided in JSON (`.json`) or YAML (`.yaml`/`.yml`) format, either in a default location or via a dedicated URL.

- **default config URL**: If `shacl-vue` is deployed and run without any code modifications, it will assume a default config file location in the root of the served application, e.g. `https://my-shacl-vue-deployment/config.json`. This config file name should be `config` and should have any of the supported extensions. If duplicate config files are provided in multiple formats, priority is given in the order: `.yaml`, then `.yml`, then `.json`.
- **explicit config URL**: The configuration file URL can also be provided explicitly to the `shacl-vue` deployment by updating `App.vue` to instantiate the main `ShaclVue` component with the `configUrl` prop.

Current configuration options are explained below.

## General app settings

```yaml
app_name: 'shacl-vue'
app_name_starter: 'shacl-vue-starter'
documentation_url: ''
external_config_url: 'https://hub.psychoinformatics.de/orinoco/assets/raw/branch/main/shacl-vue/config_default_xyzri.yaml'
footer_links:
  - url: 'https://en.wikipedia.org/wiki/Forschungszentrum_J%C3%BClich'
    text: 'Wikipedia'
page_title: 'shacl-vue'
source_code_url: 'https://hub.psychoinformatics.de/www/pool.psychoinformatics.de-ui'
```

### `app_name`
The name of the application displayed in the browser tab and UI

### `app_name_starter`
The name of the *starter* application displayed in the browser tab and UI, if the [`starter` variant](./features-starter) is deployed

### `documentation_url`
The URL of the user documentation for the specific `shacl-vue` instance

### `external_config_url`
A source URL of an external configuration file that will be loaded by default, and into which the application's main configuration file content will be merged, with the latter taking precedence in case of any option clashes. This option is handy for defining default configuration options that are shared across multiple different `shacl-vue` deployments. The options in the external configuration are subject to the same constraints as described on this page.

### `footer_links`
An array of objects, where each object contains the `url` and display `text` for a link that should be included in the application footer

### `page_title`
The title for the HTML page

### `source_code_url`
The URL of the source code repository for the specific `shacl-vue` instance

The HTML page title of the main application is set in [`shacl-vue/src/components/ShaclVue.vue`](https://hub.psychoinformatics.de/orinoco/shacl-vue/src/branch/main/src/components/ShaclVue.vue) based on values in the configuration file (`config.yaml`). The app uses the following priority when setting the title:

1. IF `page_title` is defined, use it;
2. ELSE IF `app_name` is defined, use it;
3. ELSE, fallback to "shacl-vue".

URLs should be unique and resolvable online URIs.

## Content

```yaml
content:
  <contentKey>:
    url: '<contentURL>'
  FrontPageHTML:
    url: frontpage.html
  orcid-logo:
    url: https://hub.psychoinformatics.de/datalink/assets/raw/branch/main/shacl-vue/orcid_logo_24.svg
```

The `content` option allows the specification of an arbitrary number of text content sources, all of which will be prefetched on application load and will be made available via a specific pointer syntax to any components in the application. This option is useful for loading component-specific templates, wizard editor templates, or front page HTML files (see below).

The loaded text of a specific content key can be pointed to from any other option, by prepending the string `content:` to the exact key in the `content` option, e.g. `content:FrontPageHTML`.

## Theming settings

```yaml
app_theme:
  link_color: '#ffa200'
  hover_color: '#ffa200'
  active_color: '#ffa201'
  visited_color: '#ffa201'
  panel_color: '#333333'
  settings_color: ''
  logo: logo.png
front_page_content: 'content:FrontPageHTML'
```

### `app_theme`

Colors schemes and application logo can be set via the `app_theme` option:

- `link_color` is the default link color
- `hover_color` is the link hover color
- `active_color` is the link active state color
- `visited_color` (Optional) is the visited link color
- `panel_color` is the background color of the main left-hand-side UI panel displaying all data types
- `settings_color` is the background color of the settings panel activated by the gear icon in the application header
- `logo` is the path to the logo used in the HTML page header.  The logo path should either be a unique and absolute online URI, or a path relative to `shacl-vue/public` in the case of a file local to the repository.

All colors should be defined using hexadecimal color codes (#RRGGBB).

### `front_page_content`

The `front_page_content` option allows the inclusion of arbitrary HTML content as the front page of a `shacl-vue` deployment, which will display when no data type is selected from the left-hand-side panel. The `front_page_content` option should contain, either:

- a serialized HTML string
- a content pointer to the source file containing the HTML

In the latter case, the pointer could for example be to `content:FrontPageHTML`, where that associated key points to the HTML file location:

```yaml
content:
  FrontPageHTML:
    url: frontpage.html
```

In the above example, the HTML file is placed in the root distribution directory of the deployment.

##  [Application inputs](./app-inputs) sources

```yaml
class_url: https://concepts.datalad.org/s/demo-research-information/unreleased.owl.ttl
data_url: ''
shapes_url: https://concepts.datalad.org/s/demo-research-information/unreleased.shacl.ttl
use_default_classes: false
use_default_data: false
use_default_shapes: false
```

All application input source URLs should either be unique and absolute online URIs, or a path relative to `shacl-vue/public` in the case of a file local to the repository. These URLs should return documents in TTL format. The defaults for all input source URLs are the repository-local demo files.

### `class_url`
The URL to fetch the class hierarchy from
### `data_url`
The URL to fetch the data graph from
### `shapes_url`
The URL to fetch the shapes graph from
### `use_default_classes`, `use_default_data`, and `use_default_shapes`
Set to `true` to specify the use of default demo files as fallback config URLs

## Update shapes

The `update_shapes` option provides a general config feature to update/amend the node- and property shapes that drive the UI of a `shacl-vue` deployment, thereby allowing changes to UI behaviour without having to update the model from which the SHACL shapes are created.

This option takes an object as value, with each key being a node shape IRI, which in turn has an object as value. Per node shape, the keys can be any valid SHACL keys of a node shape, e.g. `sh:description` or `sh:name`. A special key is `sh:property`, which has an object as value, with each key in turn being the `sh:path` of an associated property shape. Keys of the associated value (i.e. property shape) can be any valid SHACL keys of a property shape, e.g. `sh:datatype` or `sh:maxCount`, as well as any further IRIs used drive the UI, e.g. `dash:singleLine`. Here is an example:

```yaml
update_shapes: 
  xyzri:XYZPerson:
    sh:description: An XYZPerson is a human being,
    sh:property:
      dlprovmx:delegated_by: 
        sh:order: 0.001
      dlsocialmx:honorific_name_prefix: 
        sh:description: Honorable member
      xyzri:depiction:
        shaclvue:gitAnnexUpload: false
```

If this option is populated in the config file of a deployment, `shacl-vue` will use it to update its own internal representation of node- and property shapes after they have been loaded from the `shapes_url` at application startup. Existing key/values will be overwritten, new key/values will be added. All IRIs may also be specified in CURIE format.

When it becomes too cumbersome to repeat identical annotations for different/slots and classes, using `update_shapes`, the `update_shapes_default` option allows for specifying default annotations that can be applied to all node shapes or all property shapes. For example, the following:

```yaml
update_shapes_default:
  _all_node_shapes: # NOTE: not functional yet
  _all_property_shapes:
    dlthings:pid:
      sh:order: 0.001
```

will assign `sh:order: 0.001` to the property shape with path `dlthings:pid` of all node shapes in the deployment, barring those classes excluded by other config options, specifically the `show_classes(_with_prefix)` and `hide_classes(_with_prefix)` options (see below).

In other words, `update_shapes_default` allows specifying a global set of default slot-specific annotations, for example a standard order annotation for all slots in a whole deployment, thereby severely reducing wasteful lines of config that would have just repeated the same annotations for different classes.

## Property groups

```yaml
property_groups:
  identity:
    title: Identity
    order: 1
    description: Information about the identity of the record
```

`shacl-vue` provides the ability to add and sort properties in a form by [property groups](https://datashapes.org/forms.html#property-groups) (`sh:PropertyGroup`). The `property_groups` option is an object that takes unique property group names as keys, with values being objects to specify a group's:
- `title`: displayed as the group heading in a form
- `order`: the order of the group relative to other groups in a form
- `description`: a text-description of the group that will display when the cursor hovers over the group heading

For a detailed understanding of how to use this option to customize a `shacl-vue` deployment, see the [property ordering specification](./features-property-ordering).


## Identifier settings

```yaml
id_autogenerate:
  xyzri:XYZPerson: 'xyzrins:persons/{_randomUUID}'
id_autogenerate_override: true
id_iri: https://concepts.datalad.org/s/things/v2/pid
id_resolves_externally:
  - bibo
  - doi
```

### `id_iri`
The URI of the property that indicates the persistent identifier of an entity. It is central to the functioning of `shacl-vue` because it allows for the mapping between structured records and the representation of those records as named nodes in RDF graphs. The value of this option is dependent on the SHACL schema driving the `shacl-vue` instance. It defaults to `https://concepts.datalad.org/s/things/v2/pid` since the example input sources are created from the `https://concepts.datalad.org/s/things/v2/` schema that implements that persistent identifier definition.

### `id_autogenerate`
A dictionary mapping class CURIEs to auto-generated identifier rules, and allows the `shacl-vue` instance to auto-generate the value of the `id_iri`-property (i.e. the `PID`) of a manually created record of a particular class. The auto-generated value is determined from a string serialization operation that includes embedding a random UUID generated with JavaScripts `crypto.randomUUID()`. This option should receive an object with class CURIEs as its keys and the values being string templates. A curly brackets placeholder can be used together with the random UUID specifier (`_randomUUID`) in order to specify which part of the resulting string should contain the randomly generated unique identifier: i.e `{_randomUUID}`. In the example above, a generated PID for a record of the `xyzri:XYZPerson` class will have the format `https://concepts.datalad.org/s/demo-research-information/ns/persons/<randomUUID>`.

### `id_autogenerate_override`
A boolean, or array of class CURIEs. In some cases it might be desirable to still allow an autogenerated PID to be edited by the user. If this option is set to `true`, or more restrictively if it is an array that includes the class CURIE of interest, the PID field of a class record will display an edit button that can be used to enable the field to allow the PID to be edited by the user.

### `id_resolves_externally`
An array of prefix strings. Records for which the PID includes any of these prefixes will resolve online, and additional UI will become visible that allows such records to be navigated to both inside the application and externally online. Included prefixes should be known prefixes in the deployment, i.e. they should arrive via the input sources that drive the application or can be included via configuration (see `prefixes` below).

### `prefixes`
A mapping from prefix to namespace IRI for prefixes used throughout a `shacl-vue` instance. While most namespaces known to a `shacl-vue` instance are derived from its input sources (SHACL schema, RDF data, class hierarchy information), this option allows additional prefixes to be supplied in order to support referencing external vocabularies and use-case specific naming conventions.

## UI behavior

```yaml
allow_copy_record_urls: true
allow_edit_instances:
  - dlthings:Checksum
  - xyzri:XYZInfluence
class_name_display: name
class_icons:
  xyzri:ORCID: mdi-identifier
  xyzri:XYZActivity: mdi-run
component_config:
  NodeShapeViewer:
    hideBackLinks:
      - dlthings:AnnotationTag
      - xyzri:AgentRole
  InstancesSelectEditor:
    fetchingsRecordsText: Fetching records...
    dcterms:Identifier:
      show_classes: []
      show_classes_with_prefix:
        - xyzri
      hide_classes: []
      hide_classes_with_prefix: []
  URIEditor:
    default: curie
  W3CISO8601DateTimeEditor:
    yearStart: 1990
    yearEnd: 2028
display_name_autogenerate:
  xyzri:ORCID: 'ORCID: {skos:notation}'
  xyzri:XYZActivity: '{dlthings:name}'
display_name_autogenerate_placeholder:
  default: '?'
  dcterms:creator: ''
  dlthings:at_location: ''
  dlthings:at_time: ''
editor_selection:
  sh:datatype:
    dlthings:w3ctr-datetime: W3CISO8601DateTimeEditor
  shaclvue:gitAnnexUpload:
    true: InstancesUploadEditor
filter_records_by:
  - skos:prefLabel
  - shaclvue:displayLabel
  - dlthings:pid
hide_classes: []
hide_classes_with_prefix: []
no_edit_classes: []
show_all_fields: false
show_classes_with_prefix:
  - xyzri
show_shapes_wo_id: false
```

A vast range of options allow customizing a `shacl-vue` deployment to suit specific use cases.

### `allow_copy_record_urls`
A boolean that, when `true`, will show a share icon button on a record that will allow the user to copy the persistent URL of the record for sharing purposes

### `allow_edit_instances`
Allows an edit button to be added for all instances in an `InstancesSelectEditor`, i.e. the dropdown that allows users to select a specific record. This edit button allows the user to edit the specific record directly, without having to navigate to the record editor via the left-hand-side panel. `allow_edit_instances` can take a boolean value of `true` to apply this setting for all instances of all classes, or alternatively an array with specific class CURIEs to apply the setting only for instances of specific classes. The edit button will be disabled if the record's class is included in `no_edit_classes`.

### `class_name_display`
Specifies which format to use when displaying class names in the `shacl-vue` UI. Allowed options are:
- `name`: the value of the `sh:name` attribute in the class's nodeshape (e.g. `Originating Agent`); this option is the default
- `reference`: the reference of the class's nodeshape IRI in CURIE format (e.g. `Agent`); this option is used when 'name' is specified but the `sh:name` attribute is not available
- `curie`: the class's nodeshape IRI in full CURIE format (e.g. `prov:Agent`)

### `class_icons`
A mapping of class URIs to [Material Design Icons](https://pictogrammers.com/library/mdi/). By default, `class_icons` that are not defined will display as empty circles.

### `component_config`
Allows component-specific parameters to be passed to name-identified components. Such parameters allow the customization of behavior or display in `shacl-vue` components. The object has the exact name of any editor or viewer component as its keys, and values are key-value parameter pairs that should feed into the associated components. The `component_config` option is the primary avenue for customizing the `NodeShapeViewer`, i.e. the component that renders a record, including the [special button](./features-record-viewer#special-buttons) and [back-link](./features-record-viewer#back-links) functionality. An example `component_config` configuration is provided below.

### `display_name_autogenerate`
By default `shacl-vue` uses the `skos:prefLabel` of a record, if available, as its display label. When not available, the `display_name_autogenerate` provides a means to autogenerate the display label of a record from a string serialization of other properties of the same record. This option should receive an object with class CURIEs as its keys and the values being string templates. Placeholders in such a template should be curly brackets containing the CURIE of a property of the class that should be used instead of the placeholder. See example usage below.

### `display_name_autogenerate_placeholder`
When using the `display_name_autogenerate` option, it is possible that not all parameters in the template string exist as properties of an associated record for which a display label is being autogenerated. For such cases, the missing parameter will be replaced with a missing value placeholder string. This option allows for providing a `default` placeholder to be used for all missing values, or for providing a missing value placeholder per property. See example below.

### `editor_selection`
This option allows the UI to use config-driven selection of an editor component instead of the [component matching procedure](./editor-component#the-matching-script) that `shacl-vue` uses by default. The object takes keys of a SHACL property shape as its keys in CURIE format (e.g. `sh:datatype`, `sh:path`, or `sh:nodeKind`), and the values are objects themselves. These objects will have the to-be-matched CURIEs as keys, and the corresponding value should be the exact name of the component that will be selected. An example is provided below.

### `filter_records_by`
An array of slot IRIs in CURIE format that allows configuration of the fields/slots by which records in both the main `ShaclVue` component as well as the `InstancesSelectEditor` component can be filtered. It defaults to:

```yaml
filter_records_by:
  - skos:prefLabel,
  - shaclvue:displayLabel, # this is the display label generated with the template provided via the `display_name_autogenerate` option
  - dlthings:pid
```
There is (currently) no possibility to specify distinct filter-fields for records of different classes, i.e. the configuration applies across the board. However, the filtering will proceed even if the filter field is not contained within any given record.

### `show_classes`, `show_classes_with_prefix`, `hide_classes`, and `hide_classes_with_prefix`
These are options that together specify which classes to show and hide in the left-hand-side panel listing all data types (i.e. classes):
- `show_classes`: an array of class URIs that should all be shown
- `show_classes_with_prefix`: an array of prefixes, all classes containing any of these prefixes should be shown
- `hide_classes`: an array of class URIs that should be hidden
- `hide_classes_with_prefix`: an array of prefixes, all classes containing any of these prefixes should be hidden

If both `show_classes` and `show_classes_with_prefix` are empty arrays, all classes are shown, apart from those in `hide_classes` or those with prefixes in `hide_classes_with_prefix`. Records that end up being hidden/excluded:
- WILL NOT show up in the left-hand-side panel
- CANNOT be navigated to using URL query parameters
- by implication, CAN ALSO NOT be edited via URL query parameters
- CAN be created via `Add new item` button in `InstancesSelectEditor`, i.e. the dropdown that allows users to select a specific record.

These show/hide options can also be specified per class for the `InstancesSelectEditor`, using the `component_config` approach detailed below. In this way, it is possible to control exactly which subclasses are shown in the menu when the `Add new item` button is pressed. If these class-specific options are not provided, the app-level defaults are used.

### `show_all_fields`
Displays all properties in the form editor when a record is created/edited, when `true`. Properties in the form editor are displayed by default in order of reverse inheritance. For example, if the `Person` class is derived from the `Thing` class, the form editor for a `Person` would display the `Person`-properties in top, and the `Thing`-properties below that. Often, only the top-level properties are of immediate interest or importance to users and UX is improved by hiding other properties. The `show_all_fields` option, when `false`, would hide lower-level properties and display the top-level properties and required properties when a user opens the form editor to add/edit a record. In addition to the configuration option, the UI still allows the user to toggle between showing and hiding lower-level properties.

### `show_shapes_wo_id`
Shows data types (in the left-hand-side panel) for which the driving SHACL shapes do not have the `id_iri` property defined, when `true`

### `no_edit_classes`
Prevents records of specific classes from being created or edited by users. Records of these classes:
   - WILL show up in the left-hand-side panel, EXCLUDING the option to create new records
   - CAN be navigated to using URL query parameters
   - CANNOT be edited via URL query parameters
   - CANNOT be created via `Add new item` button in `InstancesSelectEditor`


### UI behavior customization examples

```yaml
...
editor_selection:
  sh:datatype:
    mydatetime:year: W3CISO8601YearEditor
component_config:
  W3CISO8601YearEditor:
    yearStart: 1925
    yearEnd: 2077
  InstancesSelectEditor:
    fetchingsRecordsText: Fetching records (this might take a while)...
    dlidentifiers:Identifier:
      show_classes: [],
      show_classes_with_prefix: [dlidentifiers]
      hide_classes: [],
      hide_classes_with_prefix: []
  NodeShapeViewer:
    recordNumberStepSize: 5
    textTruncateWidth: 85%
    hideBackLinks:
      - dlthings:AnnotationTag
      - xyzri:AgentRole
...
```

In this example, the `editor_selection` option specifies that, if a SHACL property shape is encountered where the `sh:datatype` is equal to `mydatetime:year`, the `W3CISO8601YearEditor` should be selected and rendered. The `component_config` option specifies that, for the `W3CISO8601YearEditor`, the `yearStart` and `yearEnd` options should be set to `1925` and `2077`, which for this component defines the starting and ending years that together make up the range of options in the rendered year-picker.

The `component_config` option also specifies that, for the `InstancesSelectEditor`, the `fetchingsRecordsText` should be set to `Fetching records (this might take a while)...`, which for this component defines the text that a user sees when more records are fetched from a configured service endpoint. This option is useful for providing users with an explanation of why a request might be taking a long time. The text displayed by default is `Fetching records...`.

The `component_config` option also specifies that, if the `InstancesSelectEditor` is populated for the `dlidentifiers:Identifier` class, the list of subclasses to show when the `Add new item` button is pressed should include only those that contain the `dlidentifiers` prefix.

Lastly, the `component_config` option specifies that, for the `NodeShapeViewer` (the component that renders a record of a specific type):
- the number of related records to show in any list (`recordNumberStepSize`) should default to `5` and allow users to increase/decrease that in steps of `5`
- via `textTruncateWidth`, any literal string should be truncated at `85%` width (the default), allowing users to expand the full text if desired. For full text wrapping at maximum width, `textTruncateWidth` can be set to `false`.
- via `hideBackLinks`, backlinks will be displayed for records of all classes except for those included in the configured array, i.e. `dlthings:AnnotationTag` and `xyzri:AgentRole`

```yaml
...
display_name_autogenerate:
    myns:TimeDuration: '{myns:start_date} to {myns:end_date}'
display_name_autogenerate_placeholder:
    default: '[X]'
    myns:start_date: '[*START]'
    myns:start_date: '[*END]'
...
```

In this example `display_name_autogenerate` is used to generate a display label for records of class `myns:TimeDuration`, specifically for cases where such records do not already have an existing `skos:prefLabel`. The display label is generated by concatenating three values: the property `myns:start_date`, the string `" to "`, and the property `myns:end_date`. If for example `myns:start_date` is `2022-09-27` and `myns:end_date` was missing in the data, then the generated display label would be `2022-09-27 to [*END]`. If the same was true, but the `display_name_autogenerate_placeholder` config option did not contain the `"myns:start_date": "[*END]"` key-value pair, then the generated display label would be `2022-09-27 to [X]`.


## Service API integration


```yaml
service_base_url:
  - url: https://pool.psychoinformatics.de/api/protected/
    type: write
  - url: https://pool.psychoinformatics.de/api/public/
    type: read
service_constrained_search:
  min_characters: 3
  typing_debounce: 800
service_endpoints:
  post-record: 'record/{name}?format=ttl'
  get-record: 'record?pid={curie}&format=ttl'
  get-records: 'records/{name}?format=ttl'
  get-records-before: 'records/{name}?format=ttl'
  get-paginated-records: 'records/p/{name}?format=ttl&size=100&page={page_number}'
  get-paginated-records-constrained: 'records/p/{name}?format=ttl&matching=%25{match_string}%25&size=100&page={page_number}'
service_fetch_before:
  get-records:
    - xyzri:XYZActivity
    - xyzri:XYZAgentRole
token_info: Please contact your administrator for credentials
token_info_url: mailto:administrator@example.com
use_service: true
use_token: true
```

While source data is specified in the [Application Inputs section](./app-inputs) as one of the main inputs to a `shacl-vue` instance, this input does not have to come from a single TTL-document via the `data_url` configuration option. In fact, it is likely beneficial to many `shacl-vue` instances to allow getting data from (and pushing data to) a separately and continuously maintained data source, using standard HTTP. An example of such a source is the [Dump Things Service](https://hub.psychoinformatics.de/orinoco/dump-things-server), which is supported by `shacl-vue` via the `use_service` and related configuration options. For detailed information on integrating these tools, see the [Backend integration with `dump-things`](./features-dumpthings.md) section.

In this specification, all URLs should be unique and absolute online URIs.

### `service_base_url`
A list of URLs (minimum 1) of the integrated service. The `url` property's value should be the actual base URL, and the `type` property's value can be either `read` or `write`. This option allows a single `shacl-vue` instance to be integrated with multiple services, for example in curation use cases where user-submitted records should be pushed to a `write` backend, while records that the user should be able to see but not edit will be retrieved from a `read` backend.

### `service_constrained_search`
This option supports `shacl-vue`'s type-ahead search functionality in combination with the `get-paginated-records-constrained` service endpoint (see example below). This option is an object with two fields:
   - `min_characters`: the minimum number of characters that a user should type before a constrained query is made using the `get-paginated-records-constrained` service endpoint; defaults to 4.
   - `typing_debounce`: the period (in milliseconds) that qualifies as a pause in typing, triggering the constrained request to be sent; defaults to 800 ms.

### `service_endpoints`
A mapping to endpoint templates, for the custom part of the endpoint URL that will be appended to the base URL before a request is made. These templates are typically useful for encoding query parameters. Template variables are included in curly brackets, and current options are `{name}` and `{curie}`, which follow the same definitions as given above for the `class_name_display` option. The `service_endpoint` options included in the example below are specific to integration with the `dump-things-service`.

### `service_fetch_before`
A list of IRIs indicating from which endpoints records should be fetched upon application startup, i.e. before these classes/records are actually selected or viewed by the user. This option should be supplied as an object with at least one of two keys, `get-record` or `get-records`, the value of either being an array of IRIs. `get-record` should contain an array of persistent identifier IRIs, while `get-records` should contain an array of class IRIs. NOTE: for the `get-records` option, the maximum number of records that will be fetched upfront per class IRI is the same as the `page_size` encoded into the `service_constrained_search` endpoint in the `service_endpoints` option.

### `token_info`
Instructional text about obtaining a token that will be displayed to a user in the application UI

### `token_info_url`
A URL that can be added to the instructional text that will be displayed to a user in the application UI

### `use_service`
This option enables back-end API integration with a deployed `dump-things-server`, when `true`. This option is used throughout `shacl-vue` to enable/disable related UI options (such as the `Submit` button) and for internal request-related functionality

### `use_token`
This option allows the use of an authentication token, when `true`. This enables UI components for the user to enter a token, and adds this token to any requests made to the integrated service.

### API example

An example usage of the `service_fetch_before`, `service_endpoints`, and `service_constrained_search` options is given below. Based on this combination of options, the application will fetch a maximum of 50 records of the `Person` class. Of particular note is the `get-paginated-records-constrained` endpoint, which when used for a request will return paginated records for which the JSON-string representation matches the included query parameter. This is used for `shacl-vue`'s type-ahead search functionality, which is further configurable using the `service_constrained_search` option:

```yaml
service_fetch_before:
  get-record: [],
  get-records:
    - "https://concepts.inm7.de/s/flat-base/unreleased/Person"
service_endpoints:
  post-record: "record/{name}?format=ttl"
  get-record: "record?pid={curie}&format=ttl"
  get-records: "records/{name}?format=ttl"
  get-paginated-records: "records/p/{name}?format=ttl&size=50&page={page_number}"
  get-paginated-records-constrained: "records/p/{name}?format=ttl&matching=%25{match_string}%25&size=100&page={page_number}"
service_constrained_search:
  min_characters: 4
  typing_debounce: 800
```
