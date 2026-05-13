<template>
    <v-card :variant="props.variant" style="width: fit-content;">
        <v-card-text v-if="!props.formOpen" :class="mobile ? 'text-caption' : ''" style="display: flex; align-items: center; gap: 6px; padding: 5px">
            <v-tooltip :text="toCURIE(record.subtitle, allPrefixes)" location="top left">
                <template v-slot:activator="{ props }">
                    <v-icon v-bind="props" color="primary">{{ getClassIcon(record.subtitle) }}</v-icon>
                </template>
            </v-tooltip>
            <v-menu>
                <template v-slot:activator="{ props }">
                    <v-btn
                        variant="tonal"
                        size="x-small"
                        class="rounded-lg"
                        :disabled="props.formOpen || !canEditClass"
                        v-bind="props"
                        density="comfortable"
                        icon="mdi-dots-vertical">
                    </v-btn>
                </template>
                <v-list density="compact">
                    <v-list-item
                        :key="1"
                        :value="1"
                        density="compact"
                        @click="editInstanceItem(record)"
                    >
                        <v-list-item-title class="small-text"><v-icon :icon="'mdi-pencil'"></v-icon>&nbsp;&nbsp;Edit record</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                        :key="2"
                        :value="2"
                        density="compact"
                        @click="viewRDF()"
                    >
                        <v-list-item-title class="small-text"><v-icon :icon="'mdi-file-eye-outline'"></v-icon>&nbsp;&nbsp;View RDF</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>

            <span class="card-title">
                {{ record.prefLabel ? record.prefLabel : ( record.displayLabel ? record.displayLabel : record.title) }}
            </span>
            <span v-if="resolveExternally">
                <sup
                    ><a
                        class="inline-icon-btn"
                        :href="toIRI(record.title, allPrefixes)"
                        target="_blank"
                        ><small><v-icon>mdi-arrow-top-right-thick</v-icon></small></a
                    ></sup
                >
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
import { RDF, SHACL } from '@/modules/namespaces';
import MoreOrLessRecordsViewer from '@/components/MoreOrLessRecordsViewer.vue';
import SpecialButton from '@/components/SpecialButton.vue'
import { useCompConfig } from '@/composables/useCompConfig';
import { useDisplay } from 'vuetify'
import BackLinkViewer from './BackLinkViewer.vue';
const { mobile } = useDisplay()
// Define component properties
const props = defineProps({
    classIRI: String,
    quad: Object,
    variant: String,
    formOpen: Boolean,
});

const editInstanceItem = inject('editInstanceItem');
const configVarsMain = inject('configVarsMain');
const allPrefixes = inject('allPrefixes');
const fetchFromService = inject('fetchFromService');
const getClassIcon = inject('getClassIcon');
const rdfDS = inject('rdfDS');
const shapesDS = inject('shapesDS');
const lastSavedNode = inject('lastSavedNode');
const record = reactive({});
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
    updateRecord(true);
    fetchingRecords.value = false;
    firstUpdateDone.value = true;
    let recordPIDprefix = toCURIE(props.quad.subject.value, allPrefixes, 'parts').prefix;
    if (configVarsMain['idResolvesExternally'].indexOf(recordPIDprefix) >= 0) {
        resolveExternally.value = true;
    }
});

const specialBlankNodes = computed( () => {
    const triples = record.triples?.['BlankNode'] ?? {};
    const result = {};
    for (const [key, v] of Object.entries(triples)) {
        if (!v.configDisplayLabel || !Array.isArray(v.values)) continue
        const merged = v.values.map((value, i) => ({
            value,
            displayLabel: v.displayLabels?.[i] ?? '',
            keyPropertyRole: v.keyPropertyRoles?.[i] ?? null,
        }))
        const sorted = merged.sort((a, b) => {
            // display labels starting with 'http' are deprioritized
            const aIsHttp = a.displayLabel.trim().toLowerCase().startsWith('http')
            const bIsHttp = b.displayLabel.trim().toLowerCase().startsWith('http')
            if (aIsHttp && !bIsHttp) return 1
            if (!aIsHttp && bIsHttp) return -1
            // within each group, sort alphabetically
            return a.displayLabel.localeCompare(b.displayLabel, undefined, { sensitivity: 'base' })
        })
        result[key] = {
            ...v,
            items: sorted,
        }
    }
    return result
})


async function viewRDF() {
    ttlDialog.value = false;
    ttlDialog_icon.value = getClassIcon(props.classIRI);
    ttlDialog_name.value = record.prefLabel ? record.prefLabel : record.title;
    ttlDialog_type.value = toCURIE(record.subtitle, allPrefixes);
    var rQs = getRecordQuads(record.value, rdfDS.data.graph, true)
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


function updateRecord(fetchData, from) {
    record.title = props.quad.subject.value;
    record.quad = props.quad;
    record.value = props.quad.subject.value;
    record.subtitle = props.quad.object.value;
    record.relatedQuads = rdfDS.getSubjectTriples(props.quad.subject);
    record.prefLabel = getPrefLabel(props.quad.subject, rdfDS, allPrefixes);
    record.triples = {
        Literal: {},
        BlankNode: {},
        NamedNode: {},
    };
    record.displayLabel = getRecordDisplayLabel(record.quad.subject, rdfDS, allPrefixes, configVarsMain)
}

async function addRecordProperty(quad, fetchData) {
    var termType = quad.object.termType;
    if (
        termType === 'NamedNode' &&
        quad.predicate.value != RDF.type.value &&
        fetchData
    ) {
        const results = await fetchFromService(
            'get-record',
            quad.object.value,
            allPrefixes
        );
    }
    if (!record.triples[termType].hasOwnProperty(quad.predicate.value)) {
        record.triples[termType][quad.predicate.value] = {
            values: [],
            displayLabels: [],
            prefLabels: [],
            keyPropertyRoles: [],
            relatedTriples: [],
        };
    }
    let kpr = null
    if (termType === 'BlankNode') {
        let ps = propertyShapes[quad.predicate.value]
        let keyPropertyShape = getNodeShapePropertyWithAnnotations(ps[SHACL.class.value], shapesDS, {"dash:propertyRole": "dash:KeyInfoRole"}, allPrefixes)
        let keyPropertyRole = keyPropertyShape ? keyPropertyShape[SHACL.path.value] : null
        let bnRelatedQuads = rdfDS.getSubjectTriples(quad.object);
        let relatedTriples = quadsToTripleObject(bnRelatedQuads, allPrefixes)
        record.triples[termType][quad.predicate.value]['relatedTriples'].push(relatedTriples)
        for (const bnQuad of bnRelatedQuads) {
            if (bnQuad.object.termType === 'NamedNode') {
                console.log("Also fetching blank node object record:")
                console.log(bnQuad.object.value)
                const results = await fetchFromService(
                    'get-record',
                    bnQuad.object.value,
                    allPrefixes
                );
                console.log(results)
            }
            if (keyPropertyRole && bnQuad.predicate.value === keyPropertyRole) {
                let iri = null
                let subjQ = getSubjectQuad(bnQuad.object, rdfDS.data.graph)
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
    if (kpr) {
        record.triples[termType][quad.predicate.value].keyPropertyRoles.push(kpr);
    } else {
        record.triples[termType][quad.predicate.value].keyPropertyRoles.push(null);
    }
    // selectNamedNode(currentClassIRI, currentRecordPID)
    record.triples[termType][quad.predicate.value].values.push(quad.object);
}

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
.small-text {
    font-size: 12px;
}
</style>