<template>
    <span v-if="ready">
        <span v-if="showWizards">
            <v-row no-gutters align="center">
                <v-col cols="4">
                    <v-icon>mdi-wizard-hat</v-icon> Wizards:
                </v-col>
                <v-col>
                    <v-tooltip v-for="wizE in Object.keys(wizardEditors)" :text="wizardEditors[wizE].tooltip" location="top">
                        <template v-slot:activator="{ props }">
                            <span
                                v-bind="props"
                                @click="openWizard(wizardEditors[wizE])"
                                style="margin-left: 0.5em; cursor: pointer;"
                            >
                                <span v-if="wizardEditors[wizE].iconFig.type == 'mdi'">
                                    <v-icon>{{ wizardEditors[wizE].iconFig.icon }}</v-icon>
                                </span>
                                <span v-else>
                                    <SVGIcon :icon="wizardEditors[wizE].iconFig.icon"></SVGIcon>
                                </span>
                            </span>
                        </template>
                    </v-tooltip>
                    <v-dialog v-model="wizardDialog" max-width="800px">
                        <WizardEditor :wizardConfig="selectedWizard" @save="handleWizardSave" @cancel="handleWizardCancel"></WizardEditor>
                    </v-dialog>
                </v-col>
            </v-row>
        </span>
        <span v-if="classProperties[localShapeIri].length > 0">
            <span
                v-for="property in classProperties[localShapeIri]"
                :key="localShapeIri + '-' + localNodeIdx + '-' + property"
            >
                <PropertyShapeEditor
                    :property_shape="propertyShapes[property]"
                    :node_uid="localShapeIri"
                    :node_idx="localNodeIdx"
                    :top_level_prop="true"
                />
            </span>
        </span>

        <span v-for="c in superClasses[localShapeIri]">
            <span v-if="groupHasVisibleProps(c)">
                <span
                    v-for="property in classProperties[c]"
                    :key="
                        localShapeIri +
                        '-' +
                        localNodeIdx +
                        '-' +
                        property[SHACL.path.value]
                    "
                >
                    <PropertyShapeEditor
                        :property_shape="propertyShapes[property]"
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
import { ref, onBeforeUnmount, onMounted, inject, toRaw, reactive} from 'vue';
import { SHACL, RDF, DLCO } from '../modules/namespaces';
import { 
    objectsEqual,
    nameOrCURIE,
    getContent,
    fillStringTemplate,
    findObjectByKey,
    findObjectIndexByKey,
} from '../modules/utils';
import { toCURIE } from 'shacl-tulip';
import SVGIcon from '@/components/SVGIcon.vue'

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
const rdfDS = inject('rdfDS');
const formData = inject('formData');
const superClasses = inject('superClasses');
const allPrefixes = inject('allPrefixes');
const configVarsMain = inject('configVarsMain');
const show_all_fields = inject('show_all_fields');
const savedNodes = inject('savedNodes');
const nodesToSubmit = inject('nodesToSubmit');
const registerHandler = inject('registerHandler')
const shape_obj = shapesDS.data.nodeShapes[localShapeIri.value];
const ready = ref(false);
const ignoredProperties = [RDF.type.value];
var propertyShapes = {};
var classProperties;
const showWizards = ref(false)
const wizardEditors = reactive({});
const wizardDialog = ref(false);
const selectedWizard = ref(null);
const wizardAddedQuads = ref([]);
function onFormCancel() {
    console.log("Running onFormCancel from NodeShapeEditor")
    for (const q of wizardAddedQuads.value) {
        // remove named nodes from savedNodes and nodesToSubmit
        if (q.subject.termType == 'NamedNode' && q.predicate.value == RDF.type.value) {
            console.log(`Removing named node from savedNodes and nodesToSubmit: ${q.subject.value}`)
            savedNodes.value.splice(findObjectIndexByKey(savedNodes.value, 'node_iri', q.subject.value), 1)
            nodesToSubmit.value.splice(findObjectIndexByKey(nodesToSubmit.value, 'node_iri', q.subject.value), 1)
        }
        // remove quad from graph store
        console.log(`Removing quad from graph store: ${q.subject.value} - ${q.predicate.value} - ${q.object.value}`)
        rdfDS.data.graph.delete(q)
    }
}
registerHandler('cancel', onFormCancel)

// ----------------- //
// Lifecycle methods //
// ----------------- //

onMounted(() => {
    for (var p of shape_obj.properties) {
        propertyShapes[p[SHACL.path.value]] = p;
    }
    classProperties = orderProperties(propertyShapes);
    console.log(localShapeIri.value)
    let classCurie = toCURIE(localShapeIri.value, allPrefixes)
    // Load wizard editors if any, also load template content
    if (Object.keys(configVarsMain.wizardEditorSelection) && Object.keys(configVarsMain.wizardEditorSelection).includes(classCurie)){
        for (const wizard of configVarsMain.wizardEditorSelection[classCurie]) {
            wizardEditors[wizard] = configVarsMain.wizardEditors[wizard]
            wizardEditors[wizard].template = getContent(configVarsMain.content, wizardEditors[wizard].template)
            wizardEditors[wizard].iconFig = getIcon(wizardEditors[wizard])
        }
    }
    if (Object.keys(wizardEditors).length > 0) {
        showWizards.value = true
    }
    ready.value = true;
});

onBeforeUnmount(() => {
    localShapeIri.value = null;
    localNodeIdx.value = null;
});

// --------- //
// Functions //
// --------- //

function getIcon(wizard) {
    if (wizard.icon) {
        if (wizard.icon.startsWith('mdi-')) {
            return {
                type: 'mdi',
                icon: wizard.icon
            }
        } else if (wizard.icon.startsWith('content:')) {
            return {
                type: 'svg',
                icon: getContent(configVarsMain.content, wizard.icon)
            }
        } else {
            return {
                type: 'svg',
                icon: wizard.icon
            }
        }
    }
    return {
        type: 'mdi',
        icon: 'mdi-plus-box'
    }
}

function openWizard(wizard) {
    selectedWizard.value = wizard;
    wizardDialog.value = true;
}

async function handleWizardSave(wizardData) {
    // vars
    let class_uri = localShapeIri.value;
    let subject_uri = localNodeIdx.value;
    wizardDialog.value = false;
    selectedWizard.value = null;
    // Add current formData node ID as "pid"
    wizardData.pid = subject_uri;
    // fill string template
    let newTTL = fillStringTemplate(wizardData._template, wizardData)
    // parse TTL, adding quads to graph data
    let newQuads = await rdfDS.parseTTLandDedup(newTTL);
    rdfDS.triggerReactivity();
    // Now we process each added quad
    for (const q of newQuads) {
        // If the quad has the current node ID as subject, we need to add it to formdata, and also remove the quad from graph store
        // If the quad has a different named node as subject, we need to keep track of it for submission purposes
        if (q.subject.value == subject_uri) {
            // Skip unlikely but possible redeclaration of the current record
            if (q.predicate.value != RDF.type.value) {
                // Do not add an object to the predicate array if the exact value already exists there
                let mustAddObject = true;
                let objectArray = formData.content[class_uri][subject_uri][q.predicate.value]
                if (objectArray) {
                    const existingObjectVal = objectArray.find((element) => element.value === q.object.value);
                    if (existingObjectVal) mustAddObject = false;
                }
                if (mustAddObject) {
                    // we use formData.addPredicate because formData.addObject assumes the predicate already has at least one value in the array
                    formData.addPredicate(class_uri, subject_uri, q.predicate.value)
                    let newLength = formData.content[class_uri][subject_uri][q.predicate.value].length
                    formData.content[class_uri][subject_uri][q.predicate.value][newLength-1].value = q.object.value;
                    formData.content[class_uri][subject_uri][q.predicate.value][newLength-1]._key = crypto.randomUUID();
                }
            }
            // now we remove the record quad from graph because it was added prematurely;
            // this will be re-added, (importantly: with the correct PID), when the main form is saved
            rdfDS.data.graph.delete(q)
        } else {
            // We keep track of all quads added to the graph, in case they need to be removed on form cancel
            wizardAddedQuads.value.push(q);
            // We need to keep track of the named nodes saved to the graph, for submission
            if (q.subject.termType == 'NamedNode' && q.predicate.value == RDF.type.value) {
                let saved_node = {
                    nodeshape_iri: q.object.value,
                    node_iri: q.subject.value
                }
                savedNodes.value.push(saved_node);
                if (!findObjectByKey(nodesToSubmit.value, 'node_iri', saved_node.node_iri)) {
                    nodesToSubmit.value.push(saved_node);
                }
            }
        }
    }
}

function handleWizardCancel() {
    wizardDialog.value = false;
    selectedWizard.value = null;
}

function orderProperties(propertyShapes) {
    // The current class has a possible hierarchy of superclasses
    // The current class has properties, any of which can originate from
    // any of its possible superclasses.
    // We need to divide all class properties into groups of properties that
    // stem from particular superclasses.
    //
    // How should it work?
    // A property should be divided into the class group that either made the
    // latest change to it if it was inherited, or into the class that introduced
    // the property.
    //
    // `PropertyShape`s in SHACL are present in all `NodeShape`s of the specific class
    // hierarchy. For example, if the class `Thing` has a property `name` and the
    // class `SpecificThing` is a subclass of `Thing`, then it too will have the
    // property `name`. This also means that both `NodeShape`s for `Thing` and for
    // `SpecificThing` will have the `PropertyShape` associated with property `name`,
    // and these `PropertyShape`s should be identical UNLESS the inheriting class
    // `SpecificThing` introduced a change to the property and by extension to the
    // `PropertyShape`.

    // Initialize onbject to store all classes and properties
    var classProps = {};
    // Get all properties of the current class as a new array
    var propertyPaths = Object.keys(propertyShapes);
    classProps[localShapeIri.value] = propertyPaths;
    // Upfront removal of properties that should be excluded
    for (var ip of ignoredProperties) {
        removeArrayElement(propertyPaths, ip);
    }
    // Get superclasses
    var currentSuperClasses = superClasses[localShapeIri.value];
    // If the class has no superclasses, all of the properties are from the single class
    if (currentSuperClasses.length == 0) {
        // We have to order the properties first before returning
        const sortedProps = _sortPropertiesByOrder(propertyPaths, propertyShapes)
        // Assign sorted array back to the new object
        classProps[localShapeIri.value] = sortedProps
        return classProps;
    }
    // Initialize all superclass property arrays -> empty
    // Initialize all superclass property references -> arrays of property paths
    var superClassPropRefs = {};
    for (var c of currentSuperClasses) {
        classProps[c] = [];
        // do not include properties that should be excluded
        superClassPropRefs[c] = shapesDS.data.nodeShapes[c].properties
            .filter(
                (shape_prop) =>
                    ignoredProperties.indexOf(shape_prop[SHACL.path.value]) < 0
            )
            .map((shape_prop) => shape_prop[SHACL.path.value]);
    }
    // Now loop through all the properties and divide them into their top-most-level originating class
    // note: creating a copy via json so that we don't modify the array that is being looped through
    for (var p of JSON.parse(JSON.stringify(propertyPaths))) {
        // Loop through superclasses in reverse order
        var firstSuperClass = null;
        var previousSuperClass = null;
        var changedSuperClass = null;
        for (var i = currentSuperClasses.length - 1; i >= 0; i--) {
            var c = currentSuperClasses[i];
            if (!superClassPropRefs[c].includes(p)) {
                // Property is not originated by this class, let's test the next one
                continue;
            }
            if (!firstSuperClass) {
                // If we don't have a first superclass set yet, set it
                firstSuperClass = c;
            } else {
                // this means we are dealing with a next superclass in the hierarchy
                // we can now compare the latest class property shape with previous class property shape
                var superClassPropShape = getClassPropShape(c, p);
                var previousSuperClassPropShape = getClassPropShape(
                    previousSuperClass,
                    p
                );
                // If they aren't the same store the latest class iri as the "changedSuperClass"
                if (
                    !objectsEqual(
                        toRaw(superClassPropShape),
                        toRaw(previousSuperClassPropShape)
                    )
                ) {
                    changedSuperClass = c;
                }
                // If they are the same, we do nothing
            }
            // take the next step
            previousSuperClass = c;
        }
        // after looping through superclasses, we should also do the same (and last)
        // comparison with the current class property shape. If the property was not
        // included in any superclasses, this means firstSuperClass will be null
        // and that the property was introduced by the current class, meaning it should
        // stay in propertyPaths and we should move on to the next property
        if (!firstSuperClass) {
            continue;
        }
        var previousSuperClassPropShape = getClassPropShape(
            previousSuperClass,
            p
        );
        var currentClassPropShape = propertyShapes[p];
        if (
            !objectsEqual(
                toRaw(currentClassPropShape),
                toRaw(previousSuperClassPropShape)
            )
        ) {
            changedSuperClass = localShapeIri.value;
        }
        // If the property shape changed along the way, we need to assign the property
        // to the group of the class that changed it last
        if (changedSuperClass) {
            // If the last changed class is the same as current class, we do noting
            // since the property is already part of "propertyPaths".
            // Otherwise we need to do the assignment and removal
            if (changedSuperClass != localShapeIri.value) {
                removeArrayElement(propertyPaths, p);
                classProps[changedSuperClass].push(p);
            }
        }
        // If nothing was changed, we have to put the property into the "firstSuperClass"
        // group and remove the property from the current class group
        else {
            removeArrayElement(propertyPaths, p);
            classProps[firstSuperClass].push(p);
        }
    }

    const sortedClassProps = {};
    for (const classIRI in classProps) {
        // Get the array of properties for the current class
        const properties = classProps[classIRI];
        // Sort the properties based on the sh:order value in propertyShapes
        const sortedProperties = _sortPropertiesByOrder(properties, propertyShapes)
        // Assign sorted array back to the new object
        sortedClassProps[classIRI] = sortedProperties;
    }
    return sortedClassProps;
}

function _sortPropertiesByOrder(properties, propertyShapes) {
    // Sort array of properties based on the sh:order value in propertyShapes
    return properties.slice().sort((a, b) => {
        const rawOrderA = propertyShapes[a]?.['http://www.w3.org/ns/shacl#order'];
        const rawOrderB = propertyShapes[b]?.['http://www.w3.org/ns/shacl#order'];
        const orderA = rawOrderA !== undefined ? Number(rawOrderA) : Infinity;
        const orderB = rawOrderB !== undefined ? Number(rawOrderB) : Infinity;
        // sh:order
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        // nameOrCURIE fallback
        const nameA = nameOrCURIE(propertyShapes[a], shapesDS.data.prefixes, true);
        const nameB = nameOrCURIE(propertyShapes[b], shapesDS.data.prefixes, true);
        return nameA.localeCompare(nameB);
    });
}

function removeArrayElement(arr, el) {
    const index = arr.indexOf(el);
    if (index > -1) {
        // only splice array when item is found
        arr.splice(index, 1); // 2nd parameter means remove one item only
    }
}

// --------- //
// Functions //
// --------- //
function getClassPropShape(class_iri, property_path) {
    return shapesDS.data.nodeShapes[class_iri].properties.find((propshape) => {
        return propshape[SHACL.path.value] == property_path;
    });
}

function groupHasVisibleProps(c) {
    if (classProperties[c].length == 0) {
        return false;
    }
    for (var p of classProperties[c]) {
        var currShape = propertyShapes[p];
        if (show_all_fields.value) {
            return true;
        } else {
            if (currShape[SHACL.minCount?.value] > 0) {
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
