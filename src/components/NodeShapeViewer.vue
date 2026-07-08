<template>
    <v-card class="mx-4 mb-4" :variant="props.variant" v-if="localItem.props" >
        <v-card-title :class="mobile ? 'text-body-1' : 'text-h6'" style="display: flex; align-items: center; gap: 6px;">
            <v-icon>{{ getClassIcon(props.classIRI) }}</v-icon
            >&nbsp;
            <span class="card-title">
                {{ localItem.prefLabel ? localItem.prefLabel : ( localItem.displayLabel ? localItem.displayLabel : localItem.title) }}
            </span>
            <span v-if="resolveExternally">
                <sup
                    ><a
                        class="inline-icon-btn"
                        :href="toIRI(localItem.title, allPrefixes)"
                        target="_blank"
                        ><v-icon>mdi-arrow-top-right-thick</v-icon></a
                    ></sup
                >
            </span>
        </v-card-title>
        <v-card-subtitle :class="mobile ? 'text-caption' : ''" >
            Type: <em>{{ toCURIE(localItem.props.subtitle, allPrefixes) }}</em> <span v-if="!mobile">&nbsp;</span>
            <span v-if="mobile"><br></span>
            <span v-if="!props.formOpen">
                <v-tooltip text="Edit record" location="bottom">
                    <template v-slot:activator="{ props }">
                        <span v-if="!mobile">&nbsp;</span>
                        <v-btn
                            icon="mdi-pencil"
                            variant="tonal"
                            size="x-small"
                            class="rounded-lg"
                            @click="editInstanceItem(localItem)"
                            :disabled="props.formOpen || !canEditClass"
                            v-bind="props"
                        ></v-btn>
                    </template>
                </v-tooltip>
                &nbsp;
                <v-tooltip text="View RDF" location="bottom">
                    <template v-slot:activator="{ props }">
                        <v-btn
                            icon="mdi-file-eye-outline"
                            variant="tonal"
                            size="x-small"
                            class="rounded-lg"
                            @click="viewRDF()"
                            :disabled="props.formOpen"
                            v-bind="props"
                        ></v-btn>
                    </template>
                </v-tooltip>
                <span v-if="!hideBackLinks">
                    &nbsp;
                    <v-tooltip text="View record links" location="bottom">
                        <template v-slot:activator="{ props }">
                            <v-btn
                                icon="mdi-database-eye-outline"
                                variant="tonal"
                                size="x-small"
                                class="rounded-lg"
                                @click="backLinksDialog = true"
                                :disabled="props.formOpen"
                                v-bind="props"
                            ></v-btn>
                        </template>
                    </v-tooltip>
                </span>
                <span v-if="showCopyLink">
                    &nbsp;
                    <v-tooltip text="Copy link" location="bottom">
                        <template v-slot:activator="{ props }">
                            <v-btn
                                :icon="linkCopied ? 'mdi-check' : 'mdi-link-variant'"
                                variant="tonal"
                                :color="linkCopied ? 'success' : ''"
                                size="x-small"
                                class="rounded-lg"
                                @click="copyRecordLink()"
                                :disabled="props.formOpen"
                                v-bind="props"
                            ></v-btn>
                        </template>
                    </v-tooltip>
                </span>
                <span v-if="showSpecialButtons">
                    <span v-for="button in specialButtons">
                        &nbsp;
                        <SpecialButton :returnVal="button.returnValue" :config="button.config"></SpecialButton>
                    </span>
                </span>
            </span>
        </v-card-subtitle>
        <v-card-text v-if="!props.formOpen" :class="mobile ? 'text-caption' : ''">
            <v-row align="stretch">
                <v-col :cols="showBackLinks ? 6 : 12">
                    <strong>Persistent Identifier</strong>: &nbsp;{{ localItem.title}}<br/>

                    <span v-if="fetchingRecords">
                        <v-skeleton-loader type="paragraph"></v-skeleton-loader>
                    </span>
                    <span v-else>

                        <!-- Literal nodes -->
                        <span v-for="(v, k, index) in localItem.triples['Literal']">
                            <span v-if="propertyShapes[k]">
                                <strong>
                                    {{
                                        nameOrCURIE(
                                            propertyShapes[k],
                                            shapesDS.data.prefixes,
                                            true
                                        )
                                    }}
                                </strong>:
                            </span>
                            <span v-else>
                                <strong>{{ k }}</strong>:
                            </span>
                            <span v-for="(el, i) in v.values">
                                <span v-if="i < showCounts['Literal'][k]">
                                    <span v-if="v.values.length > 1"><br/>&nbsp;-</span>
                                    &nbsp;<LiteralNodeViewer v-if="el" :textVal="el.value ?? el" :wrap="textWrapping" :width="textTruncateWidth"></LiteralNodeViewer>
                                </span>
                            </span>
                            <br/>
                            <MoreOrLessRecordsViewer
                                :records="v.values"
                                v-model:count="showCounts['Literal'][k]"
                                :stepSize="defaultStep"
                            ></MoreOrLessRecordsViewer>
                        </span>

                        <!-- Named nodes -->
                        <span v-for="(v, k, index) in localItem.triples['NamedNode']">
                            <span v-if="k != RDF.type.value">
                                <span v-if="propertyShapes[k]">
                                    <strong>
                                        {{
                                            nameOrCURIE(
                                                propertyShapes[k],
                                                shapesDS.data.prefixes,
                                                true
                                            )
                                        }}
                                    </strong>:&nbsp;&nbsp;<MoreOrLessRecordsViewer
                                        :records="v.values"
                                        v-model:count="showCounts['NamedNode'][k]"
                                        :stepSize="defaultStep"
                                        @more-button-pressed="showMoreRecords('NamedNode', k, $event)"
                                    ></MoreOrLessRecordsViewer>
                                    <span v-for="(el, i) in v.values">
                                        <span v-if="i < showCounts['NamedNode'][k]">
                                            <span v-if="v.values?.length > 1"><br />&nbsp;-&nbsp;</span>
                                            <NamedNodeViewer
                                                v-if="el"
                                                :textVal="el"
                                                :prefLabel="v.prefLabels?.[i]"
                                                :displayLabel="v.displayLabels?.[i]"
                                                :quad="getPidQuad(el, rdfDS.data.graph)"
                                                :targetClass="propertyShapes[k][SHACL.class.value]"
                                            >
                                            </NamedNodeViewer>
                                        </span>
                                    </span>
                                </span>
                                <span v-else>
                                    <strong>{{ k }}</strong
                                    >:
                                    <span v-for="(el, i) in v.values">
                                        <span v-if="i < showCounts['NamedNode'][k]">
                                            <span v-if="v.values?.length > 1"><br />&nbsp;-</span>
                                            &nbsp;{{ el.value }}
                                        </span>
                                    </span>
                                </span>
                                <br>                        
                            </span>
                        </span>
                    
                        <!-- Now show all blank nodes for which a display label has been configured, which makes them special-->
                        <span v-for="(v,k) in specialBlankNodes">
                            <strong>
                                {{
                                    nameOrCURIE(
                                        propertyShapes[k],
                                        shapesDS.data.prefixes,
                                        true
                                    )
                                }}
                            </strong>:&nbsp;&nbsp;<MoreOrLessRecordsViewer
                                :records="v.items.map(i => i.value)"
                                v-model:count="showCounts['BlankNodeSpecial'][k]"
                                :stepSize="defaultStep"
                                @more-button-pressed="showMoreRecords('BlankNodeSpecial', k, $event)"
                            ></MoreOrLessRecordsViewer>
                            <span v-for="itm in v.sortedVisibleItems(showCounts['BlankNodeSpecial'][k])"
                                :key="itm.index"
                                class="line-item">
                                <span v-if="itm.keyPropertyRole?.classIRI && itm.keyPropertyRole?.recordPID">
                                    &nbsp;-&nbsp;
                                    <v-tooltip location="top start">
                                        <template v-slot:activator="{ props }">
                                            <a
                                                v-bind="props"
                                                style="cursor: pointer"
                                                @click.prevent="selectNamedNode(itm.keyPropertyRole.classIRI, itm.keyPropertyRole.recordPID)"
                                                >{{ itm.displayLabel }}</a
                                            >
                                        </template>
                                        <template v-slot:default="{ isActive }">
                                            <v-icon >{{ getClassIcon(itm.keyPropertyRole.classIRI, allPrefixes) }}</v-icon>
                                            {{ getDisplayName(itm.keyPropertyRole.classIRI, configVarsMain, allPrefixes, shapesDS.data.nodeShapes[itm.keyPropertyRole.classIRI]) }}
                                        </template>
                                    </v-tooltip>
                                    
                                </span>
                                <span v-else>
                                    &nbsp;-&nbsp;<LiteralNodeViewer :textVal="itm.displayLabel" :wrap="'wrap'" :allowLink="false"></LiteralNodeViewer>
                                </span>
                            </span>
                        </span>
                    </span>
                </v-col>
            </v-row>
            <!-- Blank nodes -->
            <v-btn
                no-gutters
                v-if="Object.keys(localItem.triples['BlankNode']).length > 0"
                @click="showHideBlankNodes()"
                density="compact"
                :append-icon="
                    showBlankNodes ? 'mdi-chevron-down' : 'mdi-chevron-right'
                "
                :class="mobile ? 'text-overline': ''"
                >More details</v-btn
            >
            <span v-if="showBlankNodes">
                <br /><br />
                <span v-for="(v, k, index) in localItem.triples['BlankNode']">
                    <strong>
                        {{
                            nameOrCURIE(
                                propertyShapes[k],
                                shapesDS.data.prefixes,
                                true
                            )
                        }}
                    </strong>: &nbsp;<MoreOrLessRecordsViewer
                        :records="v.values"
                        v-model:count="showCounts['BlankNode'][k]"
                        :stepSize="defaultStep"
                        @more-button-pressed="showMoreRecords('BlankNode', k, $event)"
                    ></MoreOrLessRecordsViewer>
                    <br />
                    <span v-if="specialBlankNodes[k]?.items">
                        <span v-for="(itm, i) in specialBlankNodes[k].items">
                            <div v-if="i < showCounts['BlankNode'][k]">
                                <BlankNodeViewer :node="blankNode(itm.value)" />
                            </div>
                        </span>
                    </span>
                    <span v-else>
                        <span v-for="(el, i) in v.values">
                            <div v-if="i < showCounts['BlankNode'][k]">
                                <BlankNodeViewer :node="blankNode(el)"></BlankNodeViewer>
                            </div>
                        </span>
                    </span>
                </span>
            </span>
        </v-card-text>
    </v-card>

    <v-dialog
        v-model="ttlDialog"
        :max-width="mobile ? '90%' : '60%'"
        @click:outside="ttlDialog = false"
    >
        <v-card>
            <v-card-title
                >RDF record for: <em>{{ ttlDialog_name }}</em></v-card-title
            >
            <v-card-subtitle
                ><v-icon>{{ ttlDialog_icon }}</v-icon>
                {{ ttlDialog_type }}</v-card-subtitle
            >
            <v-card-text>
                <code>
                    <pre style="overflow-x: scroll">
                    {{ ttlDialog_content }}
                </pre
                    >
                </code>
            </v-card-text>
            <v-card-actions>
                <v-btn prepend-icon="mdi-download" @click="downloadTTL()"
                    >Download</v-btn
                >
                <v-btn prepend-icon="mdi-close-box" @click="ttlDialog = false"
                    >Close</v-btn
                >
            </v-card-actions>
        </v-card>
    </v-dialog>
    <v-dialog
        v-model="backLinksDialog"
        :max-width="mobile ? '90%' : '60%'"
        @click:outside="backLinksDialog = false"
    >
        <v-card>
            <v-card-text>
                <BackLinkViewer :record="localItem" @has-referencing-records="showBackLinks = true"></BackLinkViewer>
            </v-card-text>
        </v-card>
        
    </v-dialog>
</template>

<script setup>
import {
    reactive,
    onBeforeMount,
    inject,
    ref,
    watch,
    provide,
    computed,
    toRaw,
    nextTick,
} from 'vue';
import {
    makeReadable,
    getPrefLabel,
    nameOrCURIE,
    getPidQuad,
    dlTTL,
    toSnakeCase,
    quadsToTTL,
    getRecordQuads,
    getRecordDisplayLabel,
    hasConfigDisplayLabel,
    getNodeShapePropertyWithAnnotations,
    getSubjectQuad,
    getDisplayName,
    quadsToTripleObject,
    findBlankNodeLink,
    toIRI,
    toCURIE,
} from '@/modules/utils';
import { RDF, SHACL, SKOS } from '@/modules/namespaces';
import MoreOrLessRecordsViewer from '@/components/MoreOrLessRecordsViewer.vue';
import SpecialButton from '@/components/SpecialButton.vue'
import { useCompConfig } from '@/composables/useCompConfig';
import { useDisplay } from 'vuetify'
import BackLinkViewer from './BackLinkViewer.vue';
import { DataFactory } from 'n3';
const { blankNode, namedNode } = DataFactory;
const { mobile } = useDisplay()
// Define component properties
const props = defineProps({
    classIRI: String,
    item: Object,
    quad: Object,
    variant: String,
    formOpen: Boolean,
});
const { item } = props;
const localItem = reactive({});
const editInstanceItem = inject('editInstanceItem');
const configVarsMain = inject('configVarsMain');
const allPrefixes = inject('allPrefixes');
const fetchFromService = inject('fetchFromService');
const getClassIcon = inject('getClassIcon');
const rdfDS = inject('rdfDS');
const shapesDS = inject('shapesDS');
const lastSavedNode = inject('lastSavedNode');
const recordItemsAll = inject('recordItemsAll');
const constructItem = inject('constructItem');
const showBlankNodes = ref(false);
const shape_obj = shapesDS.data.nodeShapes[props.classIRI];
const resolveExternally = ref(false);
const linkCopied = ref(false)
const showCopyLink = ref(false)
const propertyShapes = {};
for (var p of shape_obj.properties) {
    propertyShapes[p[SHACL.path.value]] = p;
}
const {componentName, componentConfig} = useCompConfig(configVarsMain);
const defaultStep = componentConfig?.recordNumberStepSize ? componentConfig.recordNumberStepSize : 5;
let textTruncateWidth;
if (componentConfig?.textTruncateWidth === false) {
    textTruncateWidth = null
} else if (!componentConfig?.textTruncateWidth) {
    textTruncateWidth = '85%'
} else {
    textTruncateWidth = componentConfig.textTruncateWidth
}
const textWrapping = textTruncateWidth ? 'nowrap' : 'wrap'
const showCounts = reactive(
    {
        'Literal': {},
        'NamedNode': {},
        'BlankNode': {},
        'BlankNodeSpecial': {},
    }
);

const ttlDialog = ref(false);
const ttlDialog_icon = ref('');
const ttlDialog_name = ref('');
const ttlDialog_type = ref('');
const ttlDialog_content = ref('');
const backLinksDialog = ref(false);
const fetchingRecords = ref(false);
const canEditClass = ref(false);
const showSpecialButtons = ref(false);
const specialButtons = reactive({});
const showBackLinks = ref(false);
const firstUpdateDone = ref(false);
const hideBackLinksConfig = componentConfig?.hideBackLinks;
const hideBackLinks = ref(true);
if (hideBackLinksConfig === false || Array.isArray(hideBackLinksConfig) &&
    !hideBackLinksConfig.includes(toCURIE(props.classIRI, allPrefixes))) {
        hideBackLinks.value = false
}

const emit = defineEmits(['namedNodeSelected']);
function selectNamedNode(recordClass, recordPID) {
    emit('namedNodeSelected', { recordClass, recordPID });
}
provide('selectNamedNode', selectNamedNode);

onBeforeMount(async () => {
    if (configVarsMain.allowCopyRecordUrls === true ||
        ( Array.isArray(configVarsMain.allowCopyRecordUrls) &&
        configVarsMain.allowCopyRecordUrls.indexOf(props.classIRI) >= 0 )
    ) {
        showCopyLink.value = true;
    }
    canEditClass.value = configVarsMain.noEditClasses.indexOf(toCURIE(props.classIRI, allPrefixes)) < 0 ? true : false
    fetchingRecords.value = true;
    await updateItem();
    fetchingRecords.value = false;
    firstUpdateDone.value = true;
    let recordPIDprefix = toCURIE(props.quad.subject.value, allPrefixes, 'parts').prefix;
    if (configVarsMain['idResolvesExternally'].indexOf(recordPIDprefix) >= 0) {
        resolveExternally.value = true;
    }
    initShowCounts();
});


function initShowCounts() {
    for (const n of ['BlankNodeSpecial', 'BlankNode', 'NamedNode', 'Literal']) {
        const nt = n == 'BlankNodeSpecial' ? 'BlankNode' : n
        for (const pred in localItem.triples[nt]) {
            showCounts[n][pred] = defaultStep;
        }
    }
}


async function updateItem(update=false) {
    // Completely reset reactive object
    for (const key of Object.keys(localItem)) {
        delete localItem[key];
    }
    // Distinguish between an update triggered by a record edit_save event
    // and the normal onMount behaviour
    let newItem
    if (update) {
        newItem = constructItem(props.item);
        newItem._displayLabel = structuredClone(toRaw(recordItemsAll[props.item]._displayLabel));
    } else {
        newItem = structuredClone(toRaw(recordItemsAll[props.item]));
    }
    // Recreate fresh structure
    for (const key of Object.keys(newItem)) {
        localItem[key] = newItem[key]
    }
    localItem.quad = props.quad;

    // An incoming item has already been preprocessed to a minimal level by functionality in 
    // `useRecords` when the  node was added to the graph store initially. This led to the entry
    // of the item into the global `recordItemsAll`. It is assumed that the item already has a
    // preflabel and displaylabel entered.

    // The item will have the format:
    // var item = {
    //     title: record,
    //     value: record,
    //     props: {
    //         subtitle: recordClass,
    //         quad: mainQuad,
    //         itemValue: record,
    //         _prefLabel: '',
    //         _displayLabel: '',
    //         _searchBlob: '',
    //         ...
    //     },   
    //     triples: {
    //         Literal: {...},
    //         BlankNode: {...},
    //         NamedNode: {...},
    //     }
    // };

    // Item has the 'triples' field with content inside e.g.: 
    // item.triples[termType][quad.predicate.value] = {
    //     values: [], // this will be an array (could be empty)
    //     // the keys below will not exist if this item has not been processed by a NodeShapeViewer yet
    //     displayLabels: [], 
    //     prefLabels: [],
    //     keyPropertyRoles: [],
    //     relatedTriples: [],
    // };

    // A) For literal triples: no need to fetch related nodes or format the value/display
    //    i.e.: nothing to do
    // B) For namedNode triples: we want to process, for each property, each value that is initially displayed
    //    This means for that we break the loop once we reach the default step size, because that limits what
    //    will initially be rendered.

    // First we get all records required for the record display name
    for (const k of Object.keys(localItem._displayLabel.parts)) {
        const v = localItem._displayLabel.parts[k];
        if (v.termType != 'NamedNode') {
            continue;
        }
        // TODO: what if v is an array? should we deal with that here? and where else?
        const results = await fetchFromService(
            'get-record',
            v.value,
            allPrefixes,
            '',
            recordItemsAll,
        );
        if (results?.status?.includes('success') || results?.status?.includes("skipped")) {
            // Now we first need to be sure that the record is processed after fetching
            // We can only wait for records that are actually fetched, i.e. the result status includes success
            const recordFetched = results.url.some(entry =>
                entry.records?.includes(v.value)
            );
            if (recordFetched) {
                const record = await waitForRecordProcessing(v.value);
                await nextTick();
            }
        }
    }
    // Now calculate display and pref labels for the current record, from scratch
    localItem.prefLabel = getPrefLabel(props.quad.subject, rdfDS, allPrefixes);
    localItem.displayLabel = getRecordDisplayLabel(props.quad.subject, rdfDS, allPrefixes, configVarsMain)
    // TODO: reconsider. Should we be updating the global
    // if calculated values are different from what is registered globally, update global value
    if (recordItemsAll[localItem.value]?.props?._prefLabel != localItem.prefLabel) {
        console.log(`local preflabel (${localItem.prefLabel}) is different, updating global value (prev: ${recordItemsAll[localItem.value].props._prefLabel})`)
        recordItemsAll[localItem.value].props._prefLabel = localItem.prefLabel;
    }
    if (recordItemsAll[localItem.value]?.props?._displayLabel != localItem.displayLabel) {
        console.log(`local display label (${localItem.displayLabel}) is different, updating global value (prev: ${recordItemsAll[localItem.value].props._displayLabel})`)
        recordItemsAll[localItem.value].props._displayLabel = localItem.displayLabel;
    }    
    // TODO: we need to trigger a recalculation of the searchblob here IF either or both of these values
    // were updated for the item in recordItemsAll
    var termType = 'NamedNode';
    // For each NamedNode property
    for (const propURI of Object.keys(localItem.triples[termType])) {
        // We skip the RDF.type predicate
        if (propURI == RDF.type.value) continue;
        // Get the content object:
        const tripleObj = localItem.triples[termType][propURI];
        initializeHelperArrays(termType, propURI, ['displayLabels', 'prefLabels'])
        // Now we loop over all values of the current property
        for (const [i, value] of tripleObj.values.entries()) {            
            // We want to limit upfront calculations/fetching/etc to only those values that are shown by default
            if (i == defaultStep) break;
            // If neither an associated displayLabel nor prefLabel exists for the current value
            // it means the property+value combination has not been processed before
            if (tripleObj.displayLabels?.[i] || tripleObj.prefLabels?.[i] ) {
                continue; // skip iteration if already processed
            }
            // Now we update the property
            await updateNamedNodeProperty(propURI, i, value)
        }
    }

    // For blankNode triples
    var termType = 'BlankNode';
    // For each BlankNode property
    for (const propURI of Object.keys(localItem.triples[termType])) {
        // Get the content object
        const tripleObj = localItem.triples[termType][propURI];
        // Get variables necessary for keyInfoRole and specialBlankNode derivations:
        const ps = propertyShapes[propURI];
        const cIRI = ps[SHACL.class.value];
        tripleObj.classIRI = cIRI;
        tripleObj.configDisplayLabel = hasConfigDisplayLabel(cIRI, allPrefixes, configVarsMain);
        const keyPropertyShape = getNodeShapePropertyWithAnnotations(ps[SHACL.class.value], shapesDS, {"dash:propertyRole": "dash:KeyInfoRole"}, allPrefixes)
        const keyPropertyRole = keyPropertyShape ? keyPropertyShape[SHACL.path.value] : null;
        initializeHelperArrays(termType, propURI, ['relatedTriples', 'keyPropertyRoles', 'displayLabels', 'prefLabels'])
        // Now we loop over all values of the current property
        for (const [i, value] of tripleObj.values.entries()) {
            // We want to limit upfront calculations/fetching/etc to only those values that are shown by default
            if (i == defaultStep) break;
            // If we don't have the related triples of the current blank node value yet, we take it as an
            // indication that this blank node value has not been processed for the NodeShapeViewer yet,
            // so we process it all
            if (tripleObj['relatedTriples']?.[i]) continue; // skip this iteration if processing has already happened
            // now we update the property
            await updateBlankNodeProperty(propURI, i, value, keyPropertyRole, keyPropertyShape)

        }
    }
    // Last step of updating the item is to prepare the data for rendering special buttons
    // (could be argued that "updateItem" should only be about updating item data, i.e. in recordItemsAll
    // and not for setting component refs, which would mean that this step should occur outside of this function)
    // Now let's check for clickable data
    if (componentConfig?.specialButtons && typeof componentConfig?.specialButtons === 'object'
        && Object.keys(componentConfig?.specialButtons).length > 0
    ) {
        for (const sB of Object.keys(componentConfig?.specialButtons)) {
            let foundSB = findBlankNodeLink(localItem, componentConfig.specialButtons[sB], allPrefixes)
            if (foundSB) {
                specialButtons[sB] = {};
                specialButtons[sB].returnValue = foundSB;
                specialButtons[sB].config = componentConfig.specialButtons[sB];
            }
        }
        if (Object.keys(specialButtons).length) {
            showSpecialButtons.value = true;
        }
    }
}


async function updateNamedNodeProperty(propURI, i, value) {
    // Updating a NamedNode property means means we need to possibly fetch the related
    // named node and derive values for the item from it
    const termType = 'NamedNode';
    // if the related node (identified by value = NamedNode pid) is not yet in
    // recordItemsAll, we need to fetch it:
    const results = await fetchFromService(
        'get-record',
        value,
        allPrefixes,
        '',
        recordItemsAll,
    );
    if (results?.status?.includes('success') || (results?.status?.includes("skipped"))) {
        // Now we first need to be sure that the record is processed after fetching
        // We can only wait for records that are actually fetched, i.e. the result status includes success
        const recordFetched = results.url.some(entry =>
            entry.records?.includes(value)
        );
        if (recordFetched) {
            const record = await waitForRecordProcessing(value);
            await nextTick();
            // Then we can grab the preflabel and displaylabel
            let dL = getRecordDisplayLabel(namedNode(value), rdfDS, allPrefixes, configVarsMain)
            createFillArray(localItem.triples[termType][propURI].displayLabels, i, dL)
            createFillArray(localItem.triples[termType][propURI].prefLabels, i, record.props._prefLabel)
        } else {
            console.log(`Record request sent but no record returned: ${value}`)
        }
    } else {
        // Related record does not exist in the backend, i.e. no labels can be derived
        createFillArray(localItem.triples[termType][propURI].displayLabels, i, null)
        createFillArray(localItem.triples[termType][propURI].prefLabels, i, null)
    }
}


async function updateBlankNodeProperty(propURI, i, value, keyPropertyRole, keyPropertyShape) {
    const termType = 'BlankNode';
    // First we fetch related quads, we need it for multiple blank node steps
    var bnRelatedQuads = rdfDS.getSubjectTriples(blankNode(value));
    // a) for special buttons, we convert related quads to an object of triples and store it in the item
    let bnRelatedTriples = quadsToTripleObject(bnRelatedQuads, allPrefixes)
    createFillArray(localItem.triples[termType][propURI]['relatedTriples'], i, bnRelatedTriples)
    // b) for specialBlankNode and keyInfoRole rendering tasks, we need to loop through all related quads
    var kpr = null;
    for (const bnQuad of bnRelatedQuads) {
        if (bnQuad.predicate.value === RDF.type.value) continue; // we skip class type statements
        if (bnQuad.object.termType === 'NamedNode') {
            let foundRecord
            const results = await fetchFromService(
                'get-record',
                bnQuad.object.value,
                allPrefixes,
                '',
                recordItemsAll,
            );
            if (results?.status?.includes("success") || results?.status?.includes("skipped")) {
                const recordFetched = results.url.some(entry =>
                    entry.records?.includes(bnQuad.object.value)
                );
                if (recordFetched) {
                    foundRecord = await waitForRecordProcessing(bnQuad.object.value);
                    await nextTick();
                } else {
                    console.log(`Record request sent but no record returned: ${bnQuad.object.value}`)
                }
            }

            if (keyPropertyRole && bnQuad.predicate.value === keyPropertyRole) {
                let iri = null
                // let subjQ = 
                let subjQ = foundRecord?.props?.quad;
                // let subjQ = getSubjectQuad(bnQuad.object, rdfDS.data.graph)
                if (subjQ) {
                    iri = subjQ?.object?.value
                } else {
                    iri = keyPropertyShape[SHACL.class.value];
                }
                kpr = {
                    classIRI: iri,
                    recordPID: bnQuad.object.value
                }
            }
        }
    }
    // We have done the loop and have fetched/gathered the necessary information from related quads
    // Now we can use that information to set values on the item:
    // - for keyPropertyRoles
    if (kpr) {
        createFillArray(localItem.triples[termType][propURI].keyPropertyRoles, i, kpr)
    } else {
        createFillArray(localItem.triples[termType][propURI].keyPropertyRoles, i, null)
    }
    let dL = getRecordDisplayLabel(blankNode(value), rdfDS, allPrefixes, configVarsMain)
    let pL = getPrefLabel(blankNode(value), rdfDS, allPrefixes)
    createFillArray(localItem.triples[termType][propURI].displayLabels, i, dL)
    createFillArray(localItem.triples[termType][propURI].prefLabels, i, pL)
}


function initializeHelperArrays(termType, propURI, arrayKeys = []) {
    for (const k of arrayKeys) {
        if (!Array.isArray(localItem.triples[termType][propURI][k])) {
            localItem.triples[termType][propURI][k] = [];
        }
    }
}


async function waitForRecordProcessing(id, timeoutMs = 10000) {
    // Handle already-processed records
    const currentStatus = recordItemsAll[id]?.status;
    if (currentStatus === 'ready') {
        return recordItemsAll[id];
    }
    if (currentStatus === 'error') {
        throw new Error(`Record ${id} failed processing`);
    }
    return new Promise((resolve, reject) => {

        const stop = watch(() => recordItemsAll[id]?.status, (status) => {
            if (status === 'ready') {
                clearTimeout(timer);
                stop();
                resolve(recordItemsAll[id]);
            }

            if (status === 'error') {
                clearTimeout(timer);
                stop();
                reject(new Error(`Record ${id} failed processing`));
            }
        });

        // Safety timeout
        const timer = setTimeout(() => {
            stop();
            reject(new Error(`Timeout waiting for record ${id}`));
        }, timeoutMs);
    });
}


function createFillArray(arr, i, value) {
    // we want to set: arr[i] = value, but if the array size is not correct this will fail
    // so we need to fill all possible elements in between with null values, including at i
    for (var idx = arr.length; idx <= i; idx++ ) {
        arr.push(null)
    }
    // finally, set element i value
    arr[i] = value;
}


async function showMoreRecords(termType, property, oldCount) {
    if (!['NamedNode', 'BlankNode', 'BlankNodeSpecial'].includes(termType)) return;
    const tt = termType == 'BlankNodeSpecial' ? 'BlankNode' : termType;
    let tripleObj = localItem.triples[tt][property];
    for (var idx = oldCount; idx < oldCount + defaultStep; idx++) {
        if (idx == tripleObj.values.length) break; // we have reached the end
        var value = tripleObj.values[idx];
        // If neither an associated displayLabel nor prefLabel exists for the current value
        // it means the property+value combination has not been processed before
        if (termType === 'NamedNode') {
            // if (tripleObj.displayLabels?.[idx] || tripleObj.prefLabels?.[idx] ) {
            //     continue; // skip iteration if already processed
            // }
            // Now we update the property
            await updateNamedNodeProperty(property, idx, value)
        } else {
            // Get variables necessary for keyInfoRole and specialBlankNode derivations:
            const ps = propertyShapes[property];
            const keyPropertyShape = getNodeShapePropertyWithAnnotations(ps[SHACL.class.value], shapesDS, {"dash:propertyRole": "dash:KeyInfoRole"}, allPrefixes)
            const keyPropertyRole = keyPropertyShape ? keyPropertyShape[SHACL.path.value] : null;
            // If we don't have the related triples of the current blank node value yet, we take it as an
            // indication that this blank node value has not been processed for the NodeShapeViewer yet,
            // so we process it all
            // if (tripleObj['relatedTriples']?.[idx]) continue; // skip this iteration if processing has already happened
            // now we update the property
            await updateBlankNodeProperty(property, idx, value, keyPropertyRole, keyPropertyShape)
        }
    }
}

// trigger record update whenever lastSavedNode is updated, i.e. whenever a form is saved
watch(
    lastSavedNode, async (savedNode) => {
        if (savedNode) {
            if (savedNode.node_iri == localItem.value) {
                console.log(`UPDATING BLAAAAAAAAAAAA BECAUSE form SAVE happened`)
                await waitForRecordProcessing(localItem.value)
                await updateItem(true);
                await nextTick();
                initShowCounts();
                console.log(toRaw(recordItemsAll[localItem.value]))
            }
        }
    }
)

// trigger record update whenever lastSavedNode is updated, i.e. whenever a form is saved
watch(
    props.triples, (trips) => {
        console.log(`TRIPLES CHANGED`)
        console.log(trips['NamedNode'])
    }
)

function copyRecordLink() {
    var nodeShapeCurie = toCURIE(props.classIRI, allPrefixes);
    var pidCurie = toCURIE(props.quad.subject.value, allPrefixes);
    var nsQPvar = encodeURIComponent('sh:NodeShape')
    var nsQP = encodeURIComponent(nodeShapeCurie)
    var pidQP = encodeURIComponent(pidCurie)
    var queryParams = `?${nsQPvar}=${nsQP}&pid=${pidQP}`;
    var urlText = window.location.origin + window.location.pathname + queryParams
    copyTextToClipboard(urlText)
}

async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        linkCopied.value = true
        setTimeout(() => {
            linkCopied.value = false;
        }, 1000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    }
}

const specialBlankNodes = computed( () => {
    const triples = localItem.triples?.['BlankNode'] ?? {};
    const result = {};
    for (const [key, v] of Object.entries(triples)) {
        if (!v.configDisplayLabel || !Array.isArray(v.values)) continue
        const merged = v.values.map((value, i) => ({
            value,
            index: i,
            displayLabel: v.displayLabels?.[i] ?? '',
            keyPropertyRole: v.keyPropertyRoles?.[i] ?? null,
        }))
        result[key] = {
            ...v,
            items: merged,
            sortedVisibleItems(count) {
                return [...merged]
                    .slice(0, count)
                    .sort((a, b) => {
                        const aIsHttp = a.displayLabel.trim().toLowerCase().startsWith('http')
                        const bIsHttp = b.displayLabel.trim().toLowerCase().startsWith('http')
                        if (aIsHttp && !bIsHttp) return 1
                        if (!aIsHttp && bIsHttp) return -1
                        return a.displayLabel.localeCompare(
                            b.displayLabel,
                            undefined,
                            { sensitivity: 'base' }
                        )
                    })
            }
        }
    }
    return result
})

async function viewRDF() {
    ttlDialog.value = false;
    ttlDialog_icon.value = getClassIcon(props.classIRI);
    ttlDialog_name.value = localItem.props._prefLabel ? localItem.props._prefLabel : ( localItem.props._displayLabel ? localItem.props._displayLabel : localItem.title)
    ttlDialog_type.value = toCURIE(localItem.props.subtitle, allPrefixes);
    var rQs = getRecordQuads(localItem.value, rdfDS.data.graph, true)
    var tmpStr = await quadsToTTL(rQs, allPrefixes);
    ttlDialog_content.value = tmpStr.replace(/^\s+/g, '');
    ttlDialog_content.value = '\n' + ttlDialog_content.value;
    ttlDialog.value = true;
}

function downloadTTL() {
    dlTTL(ttlDialog_content.value, toSnakeCase(ttlDialog_name.value) + '.ttl');
}

function showHideBlankNodes() {
    showBlankNodes.value = !showBlankNodes.value;
}

</script>

<style scoped>
.line-item {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.card-title {
    display: inline-block;
    text-wrap: wrap;
    max-width: 90%;
    line-height: 1.2em;
    vertical-align: middle;
}
.mobile-scaled {
    transform: scale(0.75);
    transform-origin: top left;
    width: 120%;
}
</style>