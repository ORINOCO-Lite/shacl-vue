<template>
    <AppHeader v-if="configReady" :logo="configVarsMain.appTheme.logo" @tokenDialogOpened="onTokenDialogOpened"/>
    <v-main>
        <v-container fluid>
            <span v-if="page_ready">
                <v-card>
                    <v-layout>
                        <!-- Button to open/close class selection pane -->
                        <v-btn
                            v-if="mobile"
                            :icon="drawer ? 'mdi-chevron-left' : 'mdi-chevron-right'"
                            size="40"
                            class="drawer-fab"
                            @click="drawer = !drawer"
                            theme="dark"
                            :color="configVarsMain.appTheme.panel_color"
                        ></v-btn>
                        <!-- Class selection pane -->
                        <v-navigation-drawer
                            theme="dark"
                            :color="configVarsMain.appTheme.panel_color"
                            v-model="drawer"
                            style="overflow-y: auto"
                            :permanent="!mobile"
                            :temporary="mobile"
                            app
                        >
                            <v-list
                                nav
                                v-model:selected="classSelection"
                                select-strategy="leaf"
                            >
                                <v-list-item>
                                    <template #prepend>
                                    <v-list-item-action start>
                                        <v-checkbox-btn
                                            :model-value="allSelected"
                                            :indeterminate="isIndeterminate"
                                            @update:model-value="toggleAll"
                                        />
                                    </v-list-item-action>
                                    </template>

                                    <v-list-item-title>
                                    <h4>All Data Types</h4>
                                    </v-list-item-title>
                                </v-list-item>
                                <v-list-item
                                    v-for="item in allClassItems"
                                    :key="item.value"
                                    :title="item.title"
                                    :value="item.value"
                                >
                                    <template v-slot:prepend="{ isSelected, select }">
                                        <v-list-item-action start>
                                            <v-checkbox-btn :model-value="isSelected" @update:model-value="select"></v-checkbox-btn>
                                        </v-list-item-action>
                                    </template>
                                    <template v-slot:append="{ }">
                                        <v-tooltip :text="item.props.description" location="end" max-width="500px">
                                            <template v-slot:activator="{ props }">
                                                <v-icon v-bind="props">{{ item.props.icon }}</v-icon>
                                            </template>
                                        </v-tooltip>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-navigation-drawer>
                        <!-- The main view containing records and forms -->
                        <v-main
                            ref="mainContent"
                            style="height: 90vh; overflow-y: auto"
                        >
                            <!-- Everything is inside one container and one row -->
                            <v-container fluid>
                                <v-row v-if="fetchingFirstPages" justify="center" class="mt-4">
                                    <div class="text-center">
                                        <v-progress-circular indeterminate :size="90" :width="3" :color="configVarsMain.appTheme.link_color">
                                            <template v-slot:default><em> Fetching<br>data... </em></template>
                                        </v-progress-circular>
                                    </div>
                                </v-row>
                                <v-row v-else>
                                    <!-- Column for records -->
                                    <v-col
                                        v-show="formOpen ? false : true"
                                        class="transition-all ml-1"
                                        :class="formOpen ? 'opacity-column' : ''"
                                    >
                                        <h1 style="margin-bottom: 0.5em;">All of the Things</h1>
                                        <v-row>
                                            <v-col :cols="props.mobile ? 12 : 8">
                                                <v-text-field
                                                    v-model="searchInput"
                                                    density="compact"
                                                    variant="outlined"
                                                    :label="`Enter at least ${configVarsMain.serviceConstrainedSearch.min_characters} characters to search all records`"
                                                    hide-details="auto"
                                                    style="margin-bottom: 1em;"
                                                    :disabled="openForms.length > 0"
                                                    :class="props.mobile ? 'mobile-scaled' : '' "
                                                >
                                                    <template v-slot:append-inner>
                                                        <v-icon
                                                            v-if="searchInput"
                                                            class="mr-2"
                                                            @click.stop="clearField()"
                                                            @mousedown.stop.prevent
                                                        >
                                                            mdi-close-circle
                                                        </v-icon>
                                                    </template>
                                                </v-text-field>
                                            </v-col>
                                            <v-col v-if="!props.mobile"></v-col>
                                        </v-row>
                                        <v-tooltip text="Scroll to top" location="top end">
                                            <template v-slot:activator="{ props: activatorProps }">
                                                <v-fab
                                                    v-if="props.showScrollTopBtn && openForms.length == 0"
                                                    @click="scrollToTop"
                                                    icon="mdi-arrow-up-bold"
                                                    :app="true"
                                                    style="bottom: 2em;"
                                                    v-bind="activatorProps"
                                                ></v-fab>
                                            </template>
                                        </v-tooltip>
                                        <!-- All Class records -->
                                        <span v-for="cl in allClassItems" :key="cl.value">
                                            <v-sheet
                                                v-show="classSelection.includes(cl.value) && cl.props.totalItemCount && itemsByClass[cl.value]?.length"
                                                class="row-sheet border rounded pa-4 mb-4"
                                            >
                                                <v-row class="h-25" style="overflow-y: scroll;">
                                                    <v-col cols="6" class="left-col">
                                                        <h3 style="margin-bottom: 1em;">
                                                            <v-icon>{{ cl.props.icon }}</v-icon> {{ cl.title }}
                                                            <span v-if="showWizardGroup(
                                                                    configVarsMain,
                                                                    '_class',
                                                                    cl.value,
                                                                    allPrefixes,
                                                                    shapesDS
                                                                )">
                                                                <WizardGroup :context="'_class'" :classUri="cl.value"></WizardGroup>
                                                            </span>
                                                        </h3>
                                                        <p>{{ cl.props.description }}</p>
                                                    </v-col>
                                                    <v-col class="right-col">
                                                        <ShaclVueRecordsMini
                                                            :classIRI="cl.value"
                                                            :items="itemsByClass[cl.value] || []"
                                                            class="right-col-div"
                                                            @scroll-end="onScrollEndOfClass(cl.value)"
                                                        />
                                                    </v-col>
                                                </v-row>
                                            </v-sheet>
                                        </span>
                                    </v-col>

                                    <!-- Column for Form(s) -->
                                    <v-col v-if="formOpen">
                                        <v-expansion-panels
                                            variant="accordion"
                                            v-model="currentOpenForm"
                                            class="custompanels"
                                        >
                                            <v-expansion-panel
                                                v-for="(f, i) in openForms"
                                                :key="
                                                    f.shapeIRI +
                                                    '-' +
                                                    f.nodeIDX +
                                                    '-expansionpanel'
                                                "
                                                :value="'panel' + (i + 1).toString()"
                                                :disabled="f.disabled"
                                            >
                                                <v-expansion-panel-title>
                                                    <h2>
                                                        <em>
                                                            {{ f.formType === 'new' ? 'Adding' : 'Editing' }}:
                                                            {{
                                                                getDisplayName(
                                                                    f.shapeIRI,
                                                                    configVarsMain,
                                                                    allPrefixes,
                                                                    shapesDS.data.nodeShapes[f.shapeIRI]
                                                                )
                                                            }}
                                                        </em>
                                                    </h2>
                                                </v-expansion-panel-title>
                                                <v-expansion-panel-text density="compact" eager>
                                                    <div v-show="currentOpenForm === ('panel' + (i + 1))">
                                                        <FormEditor
                                                            :key="
                                                                f.shapeIRI +
                                                                '-' +
                                                                f.nodeIDX +
                                                                '-form-' +
                                                                f.formType
                                                            "
                                                            :shape_iri="f.shapeIRI"
                                                            :node_idx="f.nodeIDX"
                                                        ></FormEditor>
                                                    </div>
                                                </v-expansion-panel-text>
                                            </v-expansion-panel>
                                        </v-expansion-panels>
                                    </v-col>
                                </v-row>
                            </v-container>

                        </v-main>
                        <!-- Button to open/close submission drawer -->
                        <span v-if="configVarsMain.useService">
                            <v-navigation-drawer
                                theme="dark"
                                :color="configVarsMain.appTheme.panel_color"
                                v-model="submissionDrawer"
                                style="overflow-y: auto"
                                :temporary="true"
                                location="right"
                                :width="800"
                                app
                            >
                                <SubmitComp v-if="submissionDrawer" v-model:selectedNodesToSubmit="selectedNodesToSubmit" :openCloseFn="submitFn"></SubmitComp>
                            </v-navigation-drawer>
                        </span>
                    </v-layout>
                </v-card>
            </span>
            <span v-else>
                <v-skeleton-loader type="article"></v-skeleton-loader>
            </span>
        </v-container>
    </v-main>
    <AppFooter />
</template>

<!------------>
<!-- SCRIPT -->
<!------------>

<script setup>
// ------- //
// IMPORTS //
// ------- //
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    provide,
    reactive,
    ref,
    toRaw,
    watch,
} from 'vue';
import { useConfig } from '@/composables/configuration';
import {
    findObjectByKey,
    getDisplayName,
    includeClass,
    toCURIE,
    toIRI,
} from '@/modules/utils';
import editorMatchers from '@/modules/editors';
// Leave the viewerMatchers import here to load viewers, even if unused in this component
import viewerMatchers from '@/modules/viewers';
import defaultEditor from '@/components/UnknownEditor.vue';
import { useData } from '@/composables/useData';
import { useClasses } from '@/composables/useClasses';
import { useShapes } from '@/composables/useShapes';
import { useForm } from '@/composables/useForm';
import { useToken } from '@/composables/tokens';
import { RDFS, SHACL } from '@/modules/namespaces';
import { useDisplay } from 'vuetify'
import ShaclVueRecordsMini from '@/components/ShaclVueRecordsMini.vue';
import { useRecords } from '@/composables/useRecords';
import { useNavigation } from '@/composables/useNavigation';
import { useSubmit } from '@/composables/useSubmit';
import { showWizardGroup } from '@/composables/useWizard'

// ----- //
// PROPS //
// ----- //
// We only receive the config file url, everything depends on it
const props = defineProps({
    configUrl: String,
});

// ---------------- //
// MAIN DATA FOR UI //
// ---------------- //
const { mobile } = useDisplay()
const page_ready = ref(false);
const internalHistory = ref([]);
const firstNavigationDone = ref(false);
const mainContent = ref(null);
var selectedShape = ref(null);
var selectedIRI = ref(null);
const canSubmit = ref(true);
var selectedItem = ref(null);
const drawer = mobile.value ? ref(false) : ref(true);
const canEditClass = ref(true)
const openForms = reactive([]);
const allItems = reactive({})
const fetchingFirstPages = ref(false);

// ------------------- //
// RUN ALL COMPOSABLES //
// ------------------- //
// Note: order is important for config and data|classes|chapes|forms
// Token handling
const { token, setToken, clearToken } = useToken();
// Configuration
const { 
    allPrefixes,
    config,
    configError,
    configReady,
    configVarsMain,
    frontPageHTML,
    getClassIcon,
    ID_IRI,
    mergePrefixes,
    priorityClassList,
    processPriorityClasses,
    processPropertyGroups,
    processSearchableFields,
    processShapeUpdates,
    processUpfrontServiceRequests,
    searchableFields,
} = useConfig(props.configUrl);
// Classes from OWL
const { classDS, getClassData, allSubClasses, processSubClasses} = useClasses(config);
// Shapes from SHACL
const {
    shapesDS,
    getSHACLschema,
    updateShapesFromDefault,
    updateShapes,
    updatePropertyGroups,
    idFilteredNodeShapeNames,
    noEditClassList,
    filteredNodeShapeNames,
    priorityFilteredNodeShapeNames,
    orderedNodeShapeNames,
    allClassItems,
    getIdFilteredNodeShapeNames,
    getNoEditClassList,
    getFilteredNodeShapeNames,
    getPriorityFilteredNodeShapeNames,
    getOrderedNodeShapeNames,
    getAllClassItems,
} = useShapes(config);
// Graph data
const {
    fetchedPages,
    fetchFromService,
    firstPageFetched,
    getRdfData,
    getTotalItems,
    hasUnfetchedPages,
    http401response,
    nodesToSubmit,
    rdfDS,
    savedNodes,
    submitRdfData,
    submittedNodes,
} = useData(config);
// Record list
const {
    classRecordsLoading,
    currentProgress,
    fetchedItemCount,
    fetchNextPage,
    headingHover,
    includedClasses,
    includeSubClasses,
    isFetchingPage,
    onScrollEnd,
    onUserTyping,
    orderTopDown,
    searchText,
    showFetchingPageLoader,
    showProgress,
    showScrollTopBtn,
    textMatchType,
    totalItemCount,
    recordItemsByClass,
    filteredRecordItemsAll,
} = useRecords(
    allPrefixes,
    allSubClasses,
    config,
    configVarsMain,
    fetchFromService,
    firstPageFetched,
    hasUnfetchedPages,
    openForms,
    rdfDS,
    searchableFields,
    selectedIRI,
);
// Form functionality
const { 
    addForm,
    addInstanceItem,
    currentOpenForm,
    editInstanceItem,
    editMode,
    formData,
    formOpen,
    lastSavedNode,
    removeForm,
} = useForm({
    openForms,
    rdfDS,
    allPrefixes,
    callbacks: {
        onAddInstanceItem: afterAddInstanceItem,
        onEditInstanceItem: afterEditInstanceItem,
        onAddForm: scrollToTop,
        onRemoveForm: afterFormsClosed, // will run when last form is closed
    }
});
// App navigation
const {
    goBack,
    handleInternalNavigation,
    setViewFromQuery,
    updateURL,
} = useNavigation(
    addInstanceItem,
    allPrefixes,
    configVarsMain,
    editInstanceItem,
    internalHistory,
    rdfDS,
    searchText,
    selectedItem,
    selectType,
    setToken,
    shapesDS,
    textMatchType,
)
// Form submission
const {
    selectedNodesToSubmit,
    submissionDrawer,
    submitFn,
    submitWarning,
    tokenWarning,
} = useSubmit(nodesToSubmit)

// ------------------------------------------------- //
// PROVIDE DATA TO COMPONENTS LOWER IN THE HIERARCHY //
// ------------------------------------------------- //
provide('allPrefixes', allPrefixes);
provide('editMode', editMode);
provide('formOpen', formOpen);
provide('editInstanceItem', editInstanceItem);
provide('addForm', addForm);
provide('openForms', openForms);
provide('removeForm', removeForm);
provide('lastSavedNode', lastSavedNode);
provide('canSubmit', canSubmit);
provide('formData', formData);
provide('config', config);
provide('configError', configError);
provide('configVarsMain', configVarsMain);
provide('ID_IRI', ID_IRI);
provide('rdfDS', rdfDS);
provide('shapesDS', shapesDS);
provide('classDS', classDS);
provide('allSubClasses', allSubClasses);
provide('fetchFromService', fetchFromService);
provide('hasUnfetchedPages', hasUnfetchedPages);
provide('getTotalItems', getTotalItems);
provide('firstPageFetched', firstPageFetched);
provide('http401response', http401response)
provide('submitRdfData', submitRdfData);
provide('savedNodes', savedNodes);
provide('submittedNodes', submittedNodes);
provide('nodesToSubmit', nodesToSubmit);
provide('searchableFields', searchableFields);
provide('editorMatchers', editorMatchers);
provide('defaultEditor', defaultEditor);
provide('getClassIcon', getClassIcon);
provide('submitFn', submitFn);
provide('tokenWarning', tokenWarning);
provide('submitWarning', submitWarning);

// --------------------- //
// Lifecycle/Vue methods //
// --------------------- //
// Once config is loaded and processed (a.k.a. ready) we load all shapes and data
watch(
    configReady,
    async (newValue) => {
        if (newValue) {
            formData.ID_IRI = ID_IRI.value;
            await getRdfData();
            await getClassData();
            await getSHACLschema();
        }
    },
    { immediate: true }
);
// Some config processing can only be done once all shapes and data have been loaded (which we know by
// watching "shapes prefixes loaded" as a proxy). This is mainly because we require all prefixes.
// - merge all prefixes
// - fetch data from service (if necessary)
// - set component states from URL query parameters (if necessary)
watch(
    () => shapesDS.data.prefixesLoaded,
    async (newValue) => {
        if (newValue) {
            // Get all prefixes and derive context from it
            // Prefixes are necessary for all the following steps
            mergePrefixes([shapesDS.data.prefixes, rdfDS.data.prefixes, classDS.data.prefixes])
            // Get list of priority classes from config
            processPriorityClasses();
            // Fetch data if configured via 'service_fetch_before'
            processUpfrontServiceRequests(fetchFromService)
            // Process configured shape updates
            processShapeUpdates(updateShapesFromDefault, updateShapes)
            // Add any configured property groups to shapes dataset
            processPropertyGroups(updatePropertyGroups)
            // Prepare allSubClasses object with class URIs as keys, and their respective subclass URIs as arrays
            // This is required for the InstancesSelectEditor
            processSubClasses();
            // Now transform/derive the searchable fields for "filter records by" 
            processSearchableFields();
            // Set component states from URL query parameters
            setViewFromQuery();
            
            // Get all class-related data
            idFilteredNodeShapeNames.value = getIdFilteredNodeShapeNames(configVarsMain, ID_IRI);
            filteredNodeShapeNames.value = getFilteredNodeShapeNames(configVarsMain, allPrefixes);
            priorityFilteredNodeShapeNames.value = getPriorityFilteredNodeShapeNames(priorityClassList);
            orderedNodeShapeNames.value = getOrderedNodeShapeNames(configVarsMain, allPrefixes);
            allClassItems.value = getAllClassItems(configVarsMain, allPrefixes, getClassIcon);
            page_ready.value = true
            // then fetch first page per class
            fetchingFirstPages.value = true;
            await getFirstPages();
            fetchingFirstPages.value = false;
            // Starter components needs 'selectType' to only run once at startup
            let mainIRI = 'https://concepts.datalad.org/s/things/v2/Thing';
            selectType(mainIRI, true, false, true)
        }
    },
    { immediate: true }
);

// Warn if there are any pending records to submit when the user closes the tab/window
onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
});
onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

// -------------- //
// Computed props //
// -------------- //
const itemsByClass = computed(() => {
    const map = {};
    for (const item of filteredRecordItemsAll.value) {
        const cl = item.props.subtitle;
        if (!map[cl]) map[cl] = [];
        map[cl].push(item);
    }
    return map;
});

const visibleClasses = computed(() =>
    allClassItems.value.filter(cl =>
        classSelection.includes(cl.value) &&
        itemsByClass.value[cl.value]?.length
    )
);

const searchInput = ref('');
let debounceTypingTimer = null;
watch(searchInput, (val) => {
    clearTimeout(debounceTypingTimer);

    debounceTypingTimer = setTimeout(() => {
        searchText.value = val;
    }, 200); // or 300ms
});

const allValues = computed(() => allClassItems.value.map(i => i.value))
const allSelected = computed(() =>
    allValues.value.length > 0 &&
    allValues.value.every(v => classSelection.value.includes(v))
)
const isIndeterminate = computed(() =>
    classSelection.value.length > 0 &&
    classSelection.value.length < allValues.value.length
)
const classSelection = ref([])
watch(
    allClassItems,
    (items) => {
        if (items?.length) {
            classSelection.value = items.map(i => i.value);
        }
    },
    { immediate: true }
)

function toggleAll(val) {
    classSelection.value = val ? [...allValues.value] : []
}
watch(
  classSelection,
  (items) => {
        includedClasses.value = classSelection.value;
  },
  { immediate: true }
)

// --------- //
// Functions //
// --------- //
async function getFirstPages() {
    const promises = allClassItems.value.map(async (item) => {
        const result = await fetchFromService(
            'get-paginated-records-constrained',
            item.value,
            allPrefixes
        );
        const totalItems = getTotalItems(item.value);
        if (totalItems > 0) {
            item.props.totalItemCount = totalItems;
        }
    });
    await Promise.all(promises);
}

function onScrollEndOfClass(classIRI) {
    console.log(`Scroll end for class: ${classIRI}`)
    fetchNextPage(classIRI)
}

function afterFormsClosed() {
    drawer.value = mobile.value ? false : true;
    canSubmit.value = true;
    classRecordsLoading.value = false;
    updateURL(selectedIRI.value, false, null, allPrefixes);
}

function afterAddInstanceItem() {
    if (mobile.value) drawer.value = false;
    canSubmit.value = false;
    updateURL(selectedIRI.value, true, null, allPrefixes);
}

function afterEditInstanceItem(editShapeIRI, editItemIdx) {
    if (mobile.value) drawer.value = false;
    canSubmit.value = false;
    updateURL(editShapeIRI, true, editItemIdx, allPrefixes);
}

function handleBeforeUnload(event) {
    if (nodesToSubmit.value.length > 0) {
        event.preventDefault();
        event.returnValue = '';
        return '';
    }
}

function scrollToTop() {
    nextTick(() => {
        const el = mainContent.value?.$el || mainContent.value;
        if (el) el.scrollTop = 0;
    });
}

function clearField() {
    searchInput.value = '';
    searchText.value = '';
    textMatchType.value = 'partial';
}

function toggleOrder() {
    orderTopDown.value = !orderTopDown.value;
    if (orderTopDown.value) {
        orderIcon.value = 'mdi-arrow-down-thick';
    } else {
        orderIcon.value = 'mdi-arrow-up-thick';
    }
}


async function selectType(IRI, fromUser, fromBackButton, includeSubs=false) {
    // Let's document this
    // Currently, this is called either when a class is selected from the side pane
    // or when a class is specified via URL query parameter.
    // Much of what happens on selection is specific to rendering a single class
    // and its items for the conventional `ShaclVue` component.
    // Apart from that, which steps are actually minimally necessary?

    var tempIncludeSubs = includeSubClasses.value;
    includeSubClasses.value = includeSubs ? includeSubs : false;
    fetchedItemCount.value = null;
    totalItemCount.value = 0
    isFetchingPage.value = false;
    showScrollTopBtn.value = false;
    var tempSearchText = searchText.value;
    var tempIRI = selectedIRI.value;
    searchText.value = '';
    textMatchType.value = 'partial';
    selectedIRI.value = IRI;
    selectedShape.value = shapesDS.data.nodeShapes[IRI];
    canEditClass.value = configVarsMain.noEditClasses.indexOf(toCURIE(IRI, allPrefixes)) < 0 ? true : false;
    scrollToTop();
    if (fromUser) {
        updateURL(IRI, false, null, allPrefixes);
    }

    if (!fromUser || fromBackButton) {
        selectedItem.value = [IRI];
    }

    if (firstNavigationDone.value) {
        if (!fromBackButton) {
            internalHistory.value.push({
                iri: tempIRI,
                searchText: tempSearchText,
                includeSubs: tempIncludeSubs,
            });
        }
    } else {
        firstNavigationDone.value = true;
    }
    if (mobile.value) {
        drawer.value = false;
    }
}

function onTokenDialogOpened() {
    // Replace url with one where token is not included
    const url = new URL(window.location);
    url.searchParams.delete('token');
    window.history.replaceState(null, '', url);
}

</script>

<style>
.code-style {
    color: #ff0000;
    background-color: #f5f5f5;
    padding: 0.1em 0.2em;
    font-family: monospace;
    border-radius: 4px;
    border: 1px solid #ddd;
}
.v-expansion-panel-text {
    display: unset !important;
    margin: 0 !important;
    padding: 0 !important;
}
.v-expansion-panel-text__wrapper {
    margin: 0 !important;
    padding: 0 !important;
}

a {
    color: var(--link-color);
    text-decoration: none;
}

a:hover {
    color: var(--hover-color);
    text-decoration: underline;
}

a:visited {
    color: var(--visited-color);
}

a:active {
    color: var(--active-color);
}
</style>

<style scoped>
.opacity-column {
    opacity: 0.5; /* Set opacity value between 0 (fully transparent) and 1 (fully opaque) */
}
.custompanels {
    border: 1px solid #ccc !important; /* Change to your preferred color */
    box-shadow: none !important; /* Remove elevation */
    border-radius: 8px; /* Optional: Adjust border rounding */
}
.custompanels .v-expansion-panel {
    border-bottom: 1px solid #ddd !important; /* Adds a subtle divider between panels */
    box-shadow: none !important;
    border-radius: 8px; /* Optional: Adjust border rounding */
}
.drawer-fab {
  position: fixed;
  top: var(--v-layout-top);
  left: 0;
  border-radius: 0 6px 6px 0;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.3);
  z-index: 2000;
}

.row-sheet {
  max-height: 30vh;
  overflow: hidden;
}

.left-col {
  height: 100%;
  overflow-y: scroll;
}

.right-col {
  height: 100%;
}

.right-col-div {
    max-height: 30vh;
    overflow-y: auto;
}
</style>
