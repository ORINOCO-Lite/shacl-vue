<template>
    <span v-if="showWizards">
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
            <WizardEditor :wizardConfig="selectedWizard" @save="saveWizard" @cancel="handleWizardCancel"></WizardEditor>
        </v-dialog>
    </span>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, inject, toRaw } from 'vue';
import SVGIcon from '@/components/SVGIcon.vue'
import { useWizard } from '@/composables/useWizard';

// Define component props and data
const props = defineProps({
    context: String,
    classUri: String,
    recordUri: String,
});

// ---- //
// Data //
// ---- //

const registerHandler = inject('registerHandler')
const configVarsMain = inject('configVarsMain')
const allPrefixes = inject('allPrefixes')
const rdfDS = inject('rdfDS')
const formData = inject('formData')
const shapesDS = inject('shapesDS')
const savedNodes = inject('savedNodes')
const nodesToSubmit = inject('nodesToSubmit')
const {
    showWizards,
    wizardEditors,
    wizardDialog,
    selectedWizard,
    setupWizards,
    openWizard,
    handleWizardCancel,
    handleWizardSave,
    onFormWithWizardCancel,
    onFormWithWizardSave,
} = useWizard();

// ----------------- //
// Lifecycle methods //
// ----------------- //
onMounted(() => {
    setupWizards(props.context, props.classUri, configVarsMain, allPrefixes, shapesDS)
    if (props.context == '_record') {
        registerHandler('cancel', cancelWizardForm)
        registerHandler('save', saveWizardForm)
    }
});

// --------- //
// Functions //
// --------- //

function cancelWizardForm() {
    onFormWithWizardCancel(savedNodes, nodesToSubmit, rdfDS)
}

function saveWizardForm() {
    onFormWithWizardSave(props.classUri, props.recordUri, formData, rdfDS, configVarsMain)
}

function saveWizard(wizardData) {
    handleWizardSave(
        props.context,
        props.classUri,
        wizardData,
        rdfDS,
        savedNodes,
        nodesToSubmit,
        props.recordUri,
        formData
    )
}


</script>