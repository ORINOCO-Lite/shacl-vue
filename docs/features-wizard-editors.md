---
layout: doc
---

# Wizard editors

Sometimes the standard `shacl-vue` approach of matching a dedicated editor component to a single modeled property shape does not fully address the use case at hand. Think of creating complicated, multi-jump linkages between a record being edited and some other records, perhaps multiple at a time.

Let's take the following example: a user might want to add a DOI (Digital Object Identifier) to a `Publication` record, but there is no `doi` property on the `Publication` class, and instead:
- a `Publication` has an `identifiers` slot, with the range `Identifier`
- the `Identifier` class has slots: `notation` and `creator`
- there is also a `DOI` class that subclasses from `Identifier`
- to create a `DOI` record, the `notation` is important while the `creator` is already known

Ideally, all of these classes and slots and linkages are details that should be of no concern to the user. They just want to add a DOI for their publication (actually the only really required field to enter is `notation`!) and having to do that via the existing route (find the `identifiers` slot -> create a new `DOI` record -> add `notation` -> add the `creator` correctly! -> finally save and link the created `DOI` record) is unnecessarily complex and bad UX.

There should be simpler way to achieve this. And there is, using the "Wizard Editor"!

This is a powerful feature that allows specification of arbitrarily complex user input and metadata linkage via relatively simple configuration of primitive form inputs and metadata templates. Think of it as a way to:
- specify which arbitrary inputs should be shown in a form
- specify how those input values should feed into a TTL template
- autocreate arbitrarily complex and linked metadata upon saving the wizard form

A wizard editor can be configured to appear for any class, to use any of the supported inputs, and to use any TTL template. Specific configuration options are provided below.

## Wizard configuration

This section will provide all currently available wizard configuration options using the DOI use case as a demonstrator, with the following config:

```yaml
wizard_editor_selection:
  xyzri:XYZPublication:
    - DOIWizard

wizard_editors:
  DOIWizard:
    name: DOI Wizard
    description: Enter the 'Notation' field and hit *Save* in order to create a DOI record
    icon: mdi-identifier
    tooltip: Add a DOI
    inputs:
      - prop: notation
        name: Notation
        description: This is the unique DOI identifier text usually following 'http://doi.org/'
        type: text
        placeholder: 'example: 10.21105/joss.03262'
        required: true
        pattern: # some XSD-compatible regular expression 
        default: # some default value
    template: content:DOIWizardTemplate

content:
  DOIWizardTemplate:
    url: DOIWizardTemplate.ttl
```

### `wizard_editor_selection`

This option provides a means to specify which wizards should show up for which classes. It is an object with class IRIs as keys (in CURIE format) and associated values being lists of wizards to make available for the class identied by the key.

### `wizard_editors`

This is the main config option that allows creation of a wizard editor and specification of its `input`s, `template`, and other options. The wizard receives a key (here `DOIWizard`), and then its options:

Wizard options include:

#### `name`

This is a human-readable name for the wizard that will be displayed at the top of the wizard form.

#### `description`

This is human-readble descriptive text or instructions to help users understand the context and purpose of the form, and will render inside the initiated wizard form underneath the name.

#### `icon`

This provides a means to specify the icon image that will show up on records for which the specific wizard has been configured to render. Clicking on the icon is the primary and only way to open the associated wizard editor. Icons can be specified in different formats:

- an `mdi-` string which will render any of the standard free icons from the [`mdi` icon library](https://pictogrammers.com/library/mdi/)
- an svg string, which will be rendered as is
- a `content:` pointer to an SVG file, which will be loaded and rendered as is

Importantly, any SVGf file or string used in this context should have a viewport or width/height of `24x24 px`.

#### `tooltip`

This is a short human-readable sentence that will show when the cursor hovers over the wizard icon and is intended to explain shortly what the wizard does.

#### `input`s

The core of the wizard lies in its specification of `input`s. An `input` can have several properties:

- `prop` is the field name through which this input is referenced, both in `shacl-vue` internals and inside the TTL template
- `name` will render as the input label
- `description` is a further description of the input that will render when hovering over the input label
- `type` tells `shacl-vue` which type of input component to render, for which the input value will be captured; currently only `text`, `text-paragraph` and `boolean` are supported, and many more are in the pipeline
- `placeholder` will render if the field has no entered value yet
- `required` will make the field required (or not) for validation purposes
- `pattern` will apply a regular expression check to text-based inputs for validation purposes
- `default` will prepulate the value of the input

#### `template`

Another core part of the wizard specification is the TTL template string, which will be populated using the values entered for the wizard inputs. The TTL string format is the same as is already supported by `shacl-vue`. For example:

```ttl
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix dlthings: <https://concepts.datalad.org/s/things/unreleased/> .
@prefix ror: <https://ror.org/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<{pid}> dcterms:identifier _:n0-1.
_:n0-1 a dlthings:DOI;
    skos:notation "{notation}";
    dcterms:creator ror:01fyxcz70.
```

Note the following inside the template:

- `{pid}` is the standard way to refer to the record within the context of which the wizard editor is rendered, for example if the `DOIWizard` is initiated from a specific `Publication` record, that record's identifier becomes available inside the TTL template.
- `{notation}` is an example of how the `prop` of a configured `input` is used to reference it inside the TTL template

The TTL template can be specified as a direct string inside the configuration, but also as a file via a `content:` pointer to the file URL.



Finally, another new config option `wizard_editor_selection` can be used to specify which wizards should be made available to which classes. The config above says: show the `DOI Wizard` for `xyzri:XYZPublication` records (during creation/editing).

## Wizard editor demo

::: info
TODO
:::


## Nunjucks support

::: info
TODO
:::

See: https://hub.psychoinformatics.de/orinoco/shacl-vue/commit/fe85c08ccc416f1e21559b8950e5f3a636f0a500