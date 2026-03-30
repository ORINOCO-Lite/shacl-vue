<template>
    <h2
        class="mx-4 mb-4 truncate-heading"
        @mouseenter="headingHover = true"
        @mouseleave="headingHover = false"
    >
        <!-- In-app back button -->
        <span v-if="internalHistory.length">
            <v-btn
                icon="mdi-chevron-left"
                density="compact"
                variant="outlined"
                @click="emit('go-back')"
                :disabled="openForms.length > 0"
            ></v-btn>
            &nbsp;
        </span>
        <!-- Class display name -->
        <span class="display-text-wrapper">
            {{
                getDisplayName(
                    props.selectedIRI,
                    configVarsMain,
                    allPrefixes,
                    shapesDS.data.nodeShapes[props.selectedIRI]
                )
            }}
            <span v-if="props.fetchedItemCount">
                <small>
                    ({{props.fetchedItemCount}}<span v-if="props.totalItemCount && props.totalItemCount > props.fetchedItemCount">/{{ props.totalItemCount }}</span>
                    record{{ fetchedItemCount == 1 ? '' : 's' }})
                </small>
            </span>
            <v-progress-linear
                v-model="currentProgress"
                height="5"
                :color="configVarsMain.appTheme.link_color"
                class="progress-underline"
                rounded
                :style="{ opacity: props.showProgress ? 1 : 0 }"
            >
            </v-progress-linear>
        </span>
        <!-- 'Create new record' button -->
        &nbsp;&nbsp;
        <v-tooltip text="Create a new record" location="top">
            <template v-slot:activator="{ props: activatorProps }">
                <v-btn
                    v-bind="activatorProps"
                    icon="mdi-plus"
                    size="x-small"
                    variant="tonal"
                    @click="emit('create-record')"
                    :disabled="openForms.length > 0 || !props.canEditClass"
                ></v-btn>
            </template>
        </v-tooltip>
        <!-- Wizard buttons -->
        <span v-if="shouldShowWizardGroup">
            <WizardGroup :context="'_class'" :classUri="props.selectedIRI"></WizardGroup>
        </span>
    </h2>
    <!-- Class description paragraph -->
    <p class="mx-4 mb-4" v-html="formattedDescription"></p>
</template>

<script setup>

import WizardGroup from '@/components/WizardGroup.vue'
import { showWizardGroup } from '@/composables/useWizard'
import { inject, computed} from 'vue';
import { addCodeTagsToText, getDisplayName} from '@/modules/utils'
import { RDFS, SHACL } from '@/modules/namespaces'

// ----- //
// PROPS //
// ----- //
const props = defineProps({
    selectedIRI: String,
    selectedShape: Object,
    fetchedItemCount: Number,
    totalItemCount: Number,
    internalHistory: Array,
    showProgress: Boolean,
    canEditClass: Boolean,
});

const emit = defineEmits([
  'go-back',
  'create-record'
])

const currentProgress = defineModel('currentProgress')
const headingHover = defineModel('headingHover')

const openForms = inject('openForms')
const configVarsMain = inject('configVarsMain')
const allPrefixes = inject('allPrefixes')
const shapesDS = inject('shapesDS')

const formattedDescription = computed(() => {
    // For the class description, use a regular expression to replace text between backticks with <code> tags
    if (props.selectedShape) {
        let comment = props.selectedShape.hasOwnProperty(RDFS.comment.value) ? props.selectedShape[RDFS.comment.value] :
                (props.selectedShape.hasOwnProperty(SHACL.description.value) ? props.selectedShape[SHACL.description.value] : null);
        return addCodeTagsToText(comment);
    } else {
        return '-';
    }
});

const shouldShowWizardGroup = computed(() =>
    showWizardGroup(
        configVarsMain,
        '_class',
        props.selectedIRI,
        allPrefixes,
        shapesDS
    )
)

</script>

<style scoped>
.display-text-wrapper {
    position: relative; /* so the bar anchors under just the text */
    display: inline-block;
    padding-bottom: 0.3em;
}
.truncate-heading {
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Hide overflowed text */
    text-overflow: ellipsis; /* Add ellipsis for overflowed text */
}

.display-text-wrapper {
    position: relative; /* so the bar anchors under just the text */
    display: inline-block;
    padding-bottom: 0.3em;
}
.progress-underline {
    position: absolute;   /* take it out of layout flow */
    left: 0;
    right: 0;
    bottom: 0;
    transform: translateY(1.45em);
}
</style>