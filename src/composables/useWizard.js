import { ref, reactive } from "vue";
import { getContent, fillStringTemplate, findObjectByKey, findObjectIndexByKey, nodeShapeHasProperty, getIcon} from "@/modules/utils";
import { toCURIE, toIRI } from "shacl-tulip";
import { RDF } from "@/modules/namespaces";
import { DataFactory } from 'n3';
const { namedNode, quad } = DataFactory;

export function showWizardGroup(configVarsMain, context, classUri, allPrefixes, shapesDS) {
    console.log("Checking if wizard group should be shown")
    const classCurie = toCURIE(classUri, allPrefixes);
    // class-based wizards ?
    const selection = configVarsMain.wizardEditorSelection?.[classCurie]?.[context]
    // slot-based wizards ?
    let slot_selection = false;
    if (configVarsMain.wizardEditorSelection?._slots) {
        for (const slot of Object.keys(configVarsMain.wizardEditorSelection._slots)) {
            let slotIRI = toIRI(slot, allPrefixes)
            if (nodeShapeHasProperty(toIRI(classUri, allPrefixes), shapesDS, slotIRI, allPrefixes)
                && configVarsMain.wizardEditorSelection._slots[slot][context]
                && Array.isArray(configVarsMain.wizardEditorSelection._slots[slot][context])
                && configVarsMain.wizardEditorSelection._slots[slot][context].length > 0
            ) {
                slot_selection = true;
                break;
            }
        }
    }
    const rval = slot_selection || selection && Array.isArray(selection) && selection.length > 0;
    return rval
}

export function useWizard() {
    // ---- //
    // Data //
    // ---- //
    const showWizards = ref(false)
    const wizardEditors = reactive({});
    const wizardDialog = ref(false);
    const selectedWizard = ref(null);
    const wizardAddedQuads = ref([]);

    // ----------------- //
    // Lifecycle methods //
    // ----------------- //

    // --------- //
    // Functions //
    // --------- //
    function setupWizards(context, class_IRI, configVarsMain, allPrefixes, shapesDS) {
        let classCurie = toCURIE(class_IRI, allPrefixes)
        // Load wizard editors if any, also load icon/template content
        // first class-based wizards
        if (configVarsMain.wizardEditorSelection?.[classCurie]?.[context]){
            for (const wizard of configVarsMain.wizardEditorSelection?.[classCurie]?.[context]) {
                console.log(`adding wizard '${wizard}' for class '${classCurie}' and context '${context}'`)
                wizardEditors[wizard] = configVarsMain.wizardEditors[wizard]
                wizardEditors[wizard].template = getContent(configVarsMain.content, wizardEditors[wizard].template)
                wizardEditors[wizard].iconFig = getIcon(wizardEditors[wizard].icon, configVarsMain)
            }
        }
        // then slot-based wizards
        if (configVarsMain.wizardEditorSelection?._slots) {
            for (const slot of Object.keys(configVarsMain.wizardEditorSelection._slots)) {
                let slotIRI = toIRI(slot, allPrefixes)
                if (nodeShapeHasProperty(toIRI(class_IRI, allPrefixes), shapesDS, slotIRI, allPrefixes)) {
                    for (const wizard of configVarsMain.wizardEditorSelection?._slots[slot][context]) {
                        if (wizard in wizardEditors) continue;
                        wizardEditors[wizard] = configVarsMain.wizardEditors[wizard]
                        wizardEditors[wizard].template = getContent(configVarsMain.content, wizardEditors[wizard].template)
                        wizardEditors[wizard].iconFig = getIcon(wizardEditors[wizard].icon, configVarsMain)
                    }
                }
            }
        }
        if (Object.keys(wizardEditors).length > 0) {
            showWizards.value = true
        }
    }

    function openWizard(wizard) {
        selectedWizard.value = wizard;
        wizardDialog.value = true;
    }

    function handleWizardCancel() {
        wizardDialog.value = false;
        selectedWizard.value = null;
    }

    async function handleWizardSave(context, class_uri, wizardData, rdfDS, savedNodes, nodesToSubmit, subject_uri=null, formData) {
        wizardDialog.value = false;
        selectedWizard.value = null;
        // if the context is '_record', add the current formData node ID as "pid"
        if (context == '_record') {
            wizardData.pid = subject_uri;
        }
        // Now we fill string template
        let newTTL = fillStringTemplate(wizardData._template, wizardData)
        // And then parse TTL, adding quads to graph data
        let newQuads = await rdfDS.parseTTLandDedup(newTTL);
        rdfDS.triggerReactivity();
        // Now we process each added quad differently based on context:
        // if context is _record, we need to work with formData of current record being edited
        // if context is _class or higher level, we can ignore formData because everything happens via template
        if (context == '_record') {
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
                    // We keep track of all other quads added to the graph, in case they need to be removed on form cancel
                    wizardAddedQuads.value.push(q);
                    // We need to keep track of the named nodes saved to the graph, for submission
                    keepTrackOfNamedNodes(q, savedNodes, nodesToSubmit);
                }
            }
        } else {
            console.log("The context was not _record...")
            for (const q of newQuads) {
                // Here we do not have to keep track of quads added to the graph,
                // because there's no parent form that can still be cancelled.
                // We need to keep track of the named nodes saved to the graph, for submission
                keepTrackOfNamedNodes(q, savedNodes, nodesToSubmit);
            }
        }
    }

    function keepTrackOfNamedNodes(q, savedNodes, nodesToSubmit) {
        if (q.subject.termType == 'NamedNode' && q.predicate.value == RDF.type.value) {
            let saved_node = {
                nodeshape_iri: q.object.value,
                node_iri: q.subject.value
            }
            if (!findObjectByKey(savedNodes.value, 'node_iri', saved_node.node_iri)) {
                savedNodes.value.push(saved_node);
            }
            if (!findObjectByKey(nodesToSubmit.value, 'node_iri', saved_node.node_iri)) {
                nodesToSubmit.value.push(saved_node);
            }
        }
    }

    function onFormWithWizardCancel(savedNodes, nodesToSubmit, rdfDS) {
        for (const q of wizardAddedQuads.value) {
            // remove named nodes from savedNodes and nodesToSubmit
            if (q.subject.termType == 'NamedNode' && q.predicate.value == RDF.type.value) {
                savedNodes.value.splice(findObjectIndexByKey(savedNodes.value, 'node_iri', q.subject.value), 1)
                nodesToSubmit.value.splice(findObjectIndexByKey(nodesToSubmit.value, 'node_iri', q.subject.value), 1)
            }
            rdfDS.data.graph.delete(q)
        }
    }

    function onFormWithWizardSave(classIRI, recordID, formData, rdfDS, configVarsMain) {
        // This will run when the user hits the form save button, at which time the
        // PID of the record will be known inside formData. We need to access this.
        // We need to loop through all quads that the wizard saved and run a check:
        // if the quad has the current record ID as object, it will already be in the graph
        // while the record ID (i.e. the quad object) might be the wrong one.
        // So we check it against the correct PID. If the same, we do nothing. If they differ
        // we need to replace the quad with one that references the correct object
        let recordPID = formData.content[classIRI]?.[recordID]?.[configVarsMain.idIri]?.[0].value
        if (recordID === recordPID) {
            return;
        }
        for (const q of wizardAddedQuads.value) {
            if (q.object.value == recordID) {
                // remove quad from graph store, add one with correct object
                rdfDS.data.graph.delete(q)
                let newQuad = quad(q.subject, q.predicate, namedNode(recordPID), null)
                rdfDS.data.graph.add(newQuad)
            }   
        }
    }

    // ------- //
    // Returns //
    // ------- //
    return {
        showWizards,
        wizardEditors,
        wizardDialog,
        selectedWizard,
        wizardAddedQuads,
        setupWizards,
        openWizard,
        handleWizardCancel,
        handleWizardSave,
        onFormWithWizardCancel,
        onFormWithWizardSave,
    };
}