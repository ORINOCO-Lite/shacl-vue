---
layout: doc
---

# Form property ordering

<div style="text-align:center; margin-top:1em;">
<div style="background:white; display:inline-block; padding:0; width:95%">
    <img src="/property_ordering.png" alt="alt">
</div>
</div>

`shacl-vue` provides the ability to add and sort properties in a form by [property groups](https://datashapes.org/forms.html#property-groups) (`sh:PropertyGroup`). Property groups are supported by the SHACL standard, specifically as a means to link a specific `sh:PropertyShape` to a group via the [`sh:group`](https://www.w3.org/TR/shacl/#group) characteristic. Essentially, `shacl-vue` allows specifying property groups, their relative order, and linking specific properties of a given class to a specific group, all for improved and intuitive display.

Below is a configuration example that specifies the `identity` group and gives it a `title` (`rdfs:label`), `order` (`sh:order`), and `description` (`rdfs:comment`):

```yaml
property_groups:
  identity:
    title: Identity
    order: 1
    description: Information about the identity of the record
```

To let a property/slot "belong to" a specified property group, `shacl-vue`s existing `update_shapes` or `update_shapes_default` configuration options can be used to add the `sh:group` annotation to that property/slot, and the value should be the associated key of the configured property group, for example:

```yaml
update_shapes_default:
  _all_property_shapes:
    dlthings:pid:
      sh:order: 1
      sh:group: identity
```

Fields in a form will then be grouped according to the above specification. Groups will
be shown in order, specified via the `order` value for a property group. Each group will have the associated `title` as its heading, and the `description` (if specified) will show on hover over the heading.

Within-group ordering uses the slots' existing `sh:order` annotation.

Furthermore, an arbitrary order threshold of 1000000 (ONE MILLION) can be used allow specifying whether a slot should be shown in a form by default (true, if `sh:order < 1000000`) or not. Other rules for specifying whether a slot should be shown include whether the slot is required, and whether the `All fields` switch in the form is checked.

Note that slots that do not have a `sh:group` value specified will be grouped into a `default` property group named `Additional properties`. If there are no groups specified the `Additional properties` heading will fall away.

Apart from the ONE MILLION threshold for determining default visibility in a form, the above approach is compatible with SHACL-based property groups specified via the shapes graph. This means that the grouping and ordering will be adhered to even if nothing is specified via `shacl-vue` config.