// useForm.js
/*
This composable is meant to be used only by the main ShaclVue component
It returns refs and functions that are then provided to other components
in the hierarchy via provide/inject.
*/

import { reactive, computed, ref} from 'vue';
import { FormBase } from 'shacl-tulip';
import { toIRI} from '@/modules/utils';

export function useForm({openForms, rdfDS, allPrefixes, callbacks = {}}) {
    // ---- //
    // Data //
    // ---- //
    const formData = new FormBase(null, reactive({}));
    const addItem = ref(false);
    const editItem = ref(false);
    const formOpen = ref(false);
    const editMode = ref(false);
    const lastSavedNode = ref(null);

    // --------------------- //
    // Lifecycle/Vue methods //
    // --------------------- //
    const currentOpenForm = computed(() => {
        if (openForms.length > 0) {
            return 'panel' + openForms.length.toString();
        }
        return null;
    });

    // --------- //
    // Functions //
    // --------- //
    function addInstanceItem(selectedIRI) {
        editItem.value = false;
        addItem.value = false;
        let newItemIdx = crypto.randomUUID();
        addForm(selectedIRI, newItemIdx, 'new');
        addItem.value = true;
        formOpen.value = true;
        if (callbacks.onAddInstanceItem) {
            callbacks.onAddInstanceItem()
        }
    }

    function editInstanceItem(instance, addQuadsToForm = true, removeNode = true) {
        // When user selects to edit, it will be either a namedNode or blankNode
        // and the related information would already be in the graph as triples
        // Also, related information might already be in formData if the user
        // created or edited the same node before in the same session. If not,
        // then a formData node has to be created from the triples in the graph.
        addItem.value = false;
        editItem.value = false;
        var subjectTerm = instance.quad.subject;
        var objectTerm = instance.quad.object;
        let editShapeIRI;
        if (objectTerm.termType === 'NamedNode') {
            editShapeIRI = objectTerm.value;
        } else {
            editShapeIRI = toIRI(objectTerm.value, allPrefixes);
        }
        let editItemIdx = instance.value; // this is the id
        // Now create the formData entries from quads in the graph dataset
        if (addQuadsToForm) {
            formData.quadsToFormData(editShapeIRI, subjectTerm, rdfDS);
        }
        // set editMode
        editMode.value = true;
        // open formEditor
        addForm(editShapeIRI, editItemIdx, 'edit', removeNode);
        editItem.value = true;
        formOpen.value = true;
        if (callbacks.onEditInstanceItem) {
            callbacks.onEditInstanceItem(editShapeIRI, editItemIdx)
        }
    }

    function addForm(shapeIRI, nodeIDX, formType, removeNode = true, onSaveEvent = undefined ) {
        // shapeIRI: class IRI
        // nodeIDX: node ID
        // formType: 'new' | 'edit'
        // removeNode: true | 'onSave' | 'onCancel' | false
        for (var i = 0; i < openForms.length; i++) {
            openForms[i].disabled = true;
        }
        openForms.push({
            shapeIRI: shapeIRI,
            nodeIDX: nodeIDX,
            formType: formType,
            disabled: false,
            removeNode: removeNode,
            onSaveEvent: onSaveEvent,
        });
        if (callbacks.onAddForm) {
            callbacks.onAddForm()
        }
    }

    function removeForm(savedNode) {
        if (savedNode) {
            lastSavedNode.value = savedNode;
        }
        openForms.pop();
        if (openForms.length > 0) {
            openForms.at(-1).disabled = false;
        } else {
            editItem.value = false;
            formOpen.value = false;            
            editMode.value = false;
            if (callbacks.onRemoveForm) {
                callbacks.onRemoveForm()
            }
            if (savedNode && callbacks.onRemoveFormSaved) {
                callbacks.onRemoveFormSaved();
            }
        }
    }

    // ------- //
    // Returns //
    // ------- //
    return {
        addForm,
        addInstanceItem,
        currentOpenForm,
        editInstanceItem,
        editMode,
        formData,
        formOpen,
        lastSavedNode,
        openForms,
        removeForm,
    };
}
