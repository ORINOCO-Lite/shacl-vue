<template>
    <span v-if="ready">
        <span v-if="showWizardGroup(configVarsMain, '_record', localShapeIri, allPrefixes)">
            <v-row no-gutters align="center">
                <v-col cols="4">
                    <v-icon>mdi-wizard-hat</v-icon> Wizards:
                </v-col>
                <v-col>
                    <WizardGroup :context="'_record'" :classUri="localShapeIri" :recordUri="localNodeIdx"></WizardGroup>
                </v-col>
            </v-row>
        </span>

        <span v-for="group in orderArrayOfObjects([...Object.values(usedPropertyGroups)], SHACL.order.value) ">
            <span v-if="groupHasVisibleProps(group)">
                <span v-if="Object.keys(usedPropertyGroups).length > 1">
                    <span v-if="group[RDFS.comment.value]">
                        <v-tooltip :text="group[RDFS.comment.value]" location="top start">
                            <template v-slot:activator="{ props }">
                                <h3 v-bind="props"><code class="code-style">{{group[RDFS.label.value]}}</code></h3>
                            </template>
                        </v-tooltip>
                    </span>
                    <span v-else>
                        <h3><code class="code-style">{{group[RDFS.label.value]}}</code></h3>
                    </span>
                </span>
                <span
                    v-for="property in _sortPropertiesByOrder(group['own_properties'])"
                    :key="
                        localShapeIri +
                        '-' +
                        localNodeIdx +
                        '-' +
                        property[SHACL.path.value]
                    "
                >
                    <PropertyShapeEditor
                        :property_shape="property"
                        :node_uid="localShapeIri"
                        :node_idx="localNodeIdx"
                        :top_level_prop="false"
                    />
                </span>
            </span>
        </span>
    </span>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, inject, toRaw } from 'vue';
import { SHACL, RDF, RDFS, DLCO } from '../modules/namespaces';
import { 
    nameOrCURIE,
    orderArrayOfObjects,
} from '../modules/utils';
import { showWizardGroup } from '@/composables/useWizard'
import WizardGroup from '@/components/WizardGroup.vue'

// ----- //
// Props //
// ----- //

const props = defineProps({
    shape_iri: String,
    node_idx: String,
});

// ---- //
// Data //
// ---- //

const localShapeIri = ref(props.shape_iri);
const localNodeIdx = ref(props.node_idx);
const shapesDS = inject('shapesDS');
const show_all_fields = inject('show_all_fields');
const allPrefixes = inject('allPrefixes');
const configVarsMain = inject('configVarsMain');
const shape_obj = shapesDS.data.nodeShapes[localShapeIri.value];
const ready = ref(false);
const ignoredProperties = [RDF.type.value];
var propertyShapes = {};
const usedPropertyGroups = ref({});

// ----------------- //
// Lifecycle methods //
// ----------------- //

onMounted(() => {
    for (var p of shape_obj.properties) {
        propertyShapes[p[SHACL.path.value]] = p;
    }
    usedPropertyGroups.value = computeUsedPropertyGroups();
    ready.value = true;
});

onBeforeUnmount(() => {
    localShapeIri.value = null;
    localNodeIdx.value = null;
});

// --------- //
// Functions //
// --------- //

function computeUsedPropertyGroups() {
    // first get a list of all the sh:PropertyGroup instances 
    // that are provided for any property via sh:group
    var group_instances = shape_obj.properties.map(function(shape_prop) {
        return shape_prop[SHACL.group.value];
    });
    // make list unique and remove falsy values
    group_instances = [...new Set(group_instances)].filter( Boolean )
    var used_prop_groups = {}
    for (var group_name of group_instances) {
        // Here we also deal with the possibility that the property group
        // provided for a property via `sh:group` was not declared as a
        // propertyGroup (with e.g. name, description, order) and is therefore
        // not part of the incoming SHACL, i.e. not in propertyGroups.value
        if (shapesDS.data.propertyGroups[group_name]) {
            used_prop_groups[group_name] = shapesDS.data.propertyGroups[group_name]
        } else {
            used_prop_groups[group_name] = {}
        }
    }
    // add default property group to used
    used_prop_groups['_default'] = shapesDS.data.propertyGroups['_default']
    // initialise 'own_properties' array
    for (var group_name of Object.keys(used_prop_groups)) {
        used_prop_groups[group_name]["own_properties"] = []
    }
    // add shape properties to correct group
    for (var p of shape_obj.properties) {
        if (p.hasOwnProperty(SHACL.group.value)) {
            used_prop_groups[p[SHACL.group.value]]["own_properties"].push(p)
        } else {
            if (ignoredProperties.indexOf(p[SHACL.path.value]) < 0) {
                used_prop_groups['_default']["own_properties"].push(p)
            }
        }
    }

    // for (const gName of Object.keys(used_prop_groups)) {
    //     const group = used_prop_groups[gName];
    //     group.sorted_properties = used_prop_groups
    // }
    return used_prop_groups;
}

function _sortPropertiesByOrder(properties) {
    // Sort array of properties based on the sh:order value in propertyShapes
    return [...properties].sort((a, b) => {
        const rawOrderA = a?.['http://www.w3.org/ns/shacl#order'];
        const rawOrderB = b?.['http://www.w3.org/ns/shacl#order'];
        const orderA = rawOrderA !== undefined ? Number(rawOrderA) : Infinity;
        const orderB = rawOrderB !== undefined ? Number(rawOrderB) : Infinity;
        // sh:order
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        // nameOrCURIE fallback
        const nameA = nameOrCURIE(a, shapesDS.data.prefixes, true);
        const nameB = nameOrCURIE(b, shapesDS.data.prefixes, true);
        return nameA.localeCompare(nameB);
    });
}


// --------- //
// Functions //
// --------- //

function groupHasVisibleProps(group) {
    if (group.own_properties?.length == 0) {
        return false;
    }
    for (var p of group.own_properties) {
        var currShape = p;
        if (show_all_fields.value) {
            return true;
        } else {
            if (currShape[SHACL.minCount?.value] > 0) {
                return true;
            }
            if (currShape[SHACL.order.value] < 1000000) {
                return true;
            }
            if (
                currShape.hasOwnProperty(DLCO.recommended.value) &&
                currShape[DLCO.recommended.value] == 'true'
            ) {
                return true;
            }
        }
    }
    return false;
}
</script>
