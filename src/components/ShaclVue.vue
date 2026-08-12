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
                            :disabled="formOpen"
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
                                selectable
                                :disabled="formOpen"
                                v-model:selected="selectedItem"
                            >
                                <!-- Heading -->
                                <v-list-item value="data"><h4>Data Types</h4></v-list-item>
                                <!-- Items: priority -->
                                <span v-if="configVarsMain.priorityClasses?.length">
                                    <v-list-item
                                        v-for="node in configVarsMain.priorityClasses"
                                        :prepend-icon="node.icon ? node.icon : getClassIcon(toIRI(node.class, allPrefixes))"
                                        :title="node.title ? node.title :
                                            getDisplayName(
                                                toIRI(node.class, allPrefixes),
                                                configVarsMain,
                                                allPrefixes,
                                                shapesDS.data.nodeShapes[toIRI(node.class, allPrefixes)]
                                            )
                                        "
                                        :value="toIRI(node.class, allPrefixes)"
                                        @click="selectType(toIRI(node.class, allPrefixes), true, false, node.include_subclasses)"
                                    >
                                    </v-list-item>
                                    <v-divider
                                        opacity=".7"
                                        thickness="2"
                                        gradient
                                        style="margin-top: 1em; margin-bottom: 1em"
                                    ></v-divider>
                                </span>
                                <!-- Items: all that should be shown and can be edited -->
                                <v-list-item
                                    v-for="node in orderedNodeShapeNames"
                                    :prepend-icon="getClassIcon(shapesDS.data.nodeShapeNames[node])"
                                    :title="
                                        getDisplayName(
                                            shapesDS.data.nodeShapeNames[node],
                                            configVarsMain,
                                            allPrefixes,
                                            shapesDS.data.nodeShapes[shapesDS.data.nodeShapeNames[node]]
                                        )
                                    "
                                    :value="shapesDS.data.nodeShapeNames[node]"
                                    @click="selectType(shapesDS.data.nodeShapeNames[node], true, false, false)"
                                ></v-list-item>
                                <!-- Items: read only -->
                                <span v-if="noEditClassList.length">
                                    <v-divider
                                        opacity=".7"
                                        thickness="2"
                                        gradient
                                        style="margin-top: 1em; margin-bottom: 1em"
                                    >
                                        <small><em>Read Only</em></small>
                                    </v-divider>
                                    <v-list-item
                                        v-for="node in noEditClassList"
                                        :prepend-icon="getClassIcon(shapesDS.data.nodeShapeNames[node])"
                                        :title="
                                            getDisplayName(
                                                shapesDS.data.nodeShapeNames[node],
                                                configVarsMain,
                                                allPrefixes,
                                                shapesDS.data.nodeShapes[shapesDS.data.nodeShapeNames[node]]
                                            )
                                        "
                                        :value="shapesDS.data.nodeShapeNames[node]"
                                        @click="selectType(shapesDS.data.nodeShapeNames[node], true, false, false)"
                                    >
                                    </v-list-item>
                                </span>
                            </v-list>
                        </v-navigation-drawer>
                        <!-- The main view containing records and forms -->
                        <v-main
                            ref="mainContent"
                            style="height: 90vh; overflow-y: auto"
                        >
                            <!-- Everything is inside one container and one row -->
                            <v-container fluid>
                                <v-row>
                                    <!-- Column for records -->
                                    <v-col
                                        v-show="formOpen ? false : true"
                                        class="transition-all"
                                        :class="formOpen ? 'opacity-column' : ''"
                                    >
                                        <!-- Show records if a class is selected -->
                                        <span v-if="selectedIRI">
                                            <!-- Class header -->
                                            <ShaclVueRecordsHeader
                                                :selectedIRI="selectedIRI"
                                                :selectedShape="selectedShape"
                                                :fetchedItemCount="fetchedItemCount"
                                                :totalItemCount="totalItemCount"
                                                :internalHistory="internalHistory"
                                                :showProgress="showProgress"
                                                :canEditClass="canEditClass"
                                                v-model:currentProgress="currentProgress"
                                                v-model:headingHover="headingHover"
                                                @go-back="goBack"
                                                @create-record="addInstanceItem(selectedIRI)"
                                            />
                                            <!-- Class records -->
                                            <ShaclVueRecords
                                                :selectedIRI="selectedIRI"
                                                :classRecordsLoading="classRecordsLoading"
                                                :mobile="mobile"
                                                :showScrollTopBtn="showScrollTopBtn"
                                                :filteredRecords="(includeSubClasses ? filteredRecordItemsForClassWithSubclassItems : filteredRecordItemsByClass[selectedIRI]) || []"
                                                :fetchedItemCount="fetchedItemCount"
                                                :showFetchingPageLoader="showFetchingPageLoader"
                                                v-model:searchText="searchText"
                                                v-model:textMatchType="textMatchType"
                                                v-model:orderTopDown="orderTopDown"
                                                @scroll-end="onScrollEnd"
                                                @user-typing="onUserTyping"
                                                @handle-internal-navigation="handleInternalNavigation"
                                                @scroll-to-top="scrollToTop"
                                            />
                                        </span>
                                        <!-- If no class is selected, and there is HTML frontpage specified, show it -->
                                        <span v-else-if="frontPageHTML" style="margin-top: 1em; margin-left: 1em;">
                                            <div v-html="frontPageHTML"></div>
                                        </span>
                                        <!-- If no class is selected and no frontpage specified, show simple sentence -->
                                        <span v-else style="margin-top: 1em; margin-left: 1em;">
                                            <em>Select a data type</em>
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
                                                            :onSaveEvent="f.onSaveEvent"
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
                        <span v-if="configVarsMain.useService || configVarsMain.reviewBundleMode === 'patch-download'">
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
import { SHACL } from '@/modules/namespaces';
import { useDisplay } from 'vuetify'
import ShaclVueRecords from '@/components/ShaclVueRecords.vue';
import ShaclVueRecordsHeader from '@/components/ShaclVueRecordsHeader.vue';
import { useRecords } from '@/composables/useRecords';
import { useNavigation } from '@/composables/useNavigation';
import { useSubmit } from '@/composables/useSubmit';

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
    headingHover,
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
    recordItemsAll,
    constructItem,
    filteredRecordItemsByClass,
    filteredRecordItemsForClassWithSubclassItems,
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
    fetchFromService,
    internalHistory,
    rdfDS,
    searchText,
    selectedItem,
    selectType,
    setToken,
    shapesDS,
    textMatchType,
    clearToken,
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
provide('recordItemsAll', recordItemsAll);
provide('constructItem', constructItem);

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
            noEditClassList.value = getNoEditClassList(configVarsMain, allPrefixes);
            filteredNodeShapeNames.value = getFilteredNodeShapeNames(configVarsMain, allPrefixes);
            priorityFilteredNodeShapeNames.value = getPriorityFilteredNodeShapeNames(priorityClassList);
            orderedNodeShapeNames.value = getOrderedNodeShapeNames(configVarsMain, allPrefixes);
            allClassItems.value = getAllClassItems(configVarsMain, allPrefixes, getClassIcon);
            page_ready.value = true;
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

// --------- //
// Functions //
// --------- //
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

async function selectType(IRI, fromUser, fromBackButton, includeSubs=false) {
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
    canEditClass.value = configVarsMain.noEditClasses.indexOf(toCURIE(IRI, allPrefixes)) < 0 ? true : false
    if (config.value.use_service) {
        classRecordsLoading.value = true;
        // First fetch rdf data from configured service
        // The first fetch (when a class/type is selected) is always without a
        // matching parameter, to get info about total items on server
        var result = await fetchFromService('get-paginated-records-constrained', IRI, allPrefixes);
        // If there was an actual error during the try statement
        // before making the requests, relay error and deactivate loader
        if (result.status === null) {
            console.error(result.error);
            classRecordsLoading.value = false;
        }
        // If any of the results were successful, do nothing
        if (result.status.length && result.status.indexOf('success') >= 0) {
        } else {
            classRecordsLoading.value = false;
        }

        // We want to keep track of the progress of currently fetched items
        // vs total items, so we need the total item count of the current class
        var totalItems = getTotalItems(IRI)
        if (totalItems > 0) {
            totalItemCount.value = totalItems
        }
    }
    classRecordsLoading.value = false
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
</style>
