<template>
    <v-card>
        <v-card-title>Record submission</v-card-title>
        <v-card-text>
            <v-skeleton-loader :loading="awaitingResponse" type="paragraph">
                <span v-if="!responseReceived">
                    <span v-if="nodesToSubmit.length">
                        You have edited and saved
                        {{ nodesToSubmit.length }} record{{
                            nodesToSubmit.length == 1 ? '' : 's'
                        }}
                        for submission:

                        <v-container fluid style="margin-top: 2em; margin-bottom: 2em">
                            <v-checkbox
                                v-for="r in nodesToSubmit"
                                v-model="selectedNodesToSubmit"
                                :value="r.node_iri"
                                align="start"
                                class="align-start"
                                style="align-items: flex-start;"
                            >
                                <template v-slot:label>
                                    <div class="d-flex align-center">
                                        &nbsp;
                                        <v-icon class="mt-1 mr-2">
                                            {{ getClassIcon(r.nodeshape_iri) }}
                                        </v-icon>
                                        &nbsp;
                                        <div>
                                            <strong><em>
                                                {{
                                                    getDisplayName(
                                                        r.nodeshape_iri,
                                                        configVarsMain,
                                                        allPrefixes,
                                                        shapesDS.data.nodeShapes[r.nodeshape_iri]
                                                    )
                                                }}:
                                            </em></strong>
                                            {{
                                                getRecordDisplayLabel(namedNode(r.node_iri),rdfDS, allPrefixes, configVarsMain) == r.node_iri ?
                                                getRecordDisplayLabel(namedNode(r.node_iri),rdfDS, allPrefixes, configVarsMain) :
                                                getRecordDisplayLabel(namedNode(r.node_iri),rdfDS, allPrefixes, configVarsMain)
                                                +' (' + r.node_iri + ')'
                                            }}
                                        </div>
                                    </div>
                                </template>
                            </v-checkbox>
                        </v-container>
                    </span>
                    <span v-else>
                        <div style="text-align: center; margin-top: 2em;">
                            <em><h3>Nothing to submit</h3></em>
                        </div>
                    </span>
                </span>
            </v-skeleton-loader>
            <span v-if="responseReceived">
                <v-icon v-if="responseSuccess" style="color: green">mdi-check-circle</v-icon>
                <v-icon v-if="responseFailure" style="color: red">mdi-alert-circle</v-icon>
                {{ responseText }}
                <br />
                <br />
                <v-btn
                    v-if="responseFailure"
                    density="compact"
                    @click="toggleFailureResponse()"
                    :prepend-icon="failureToggleIcon"
                >
                    Error details:
                </v-btn>

                <span v-if="responseFailure && showCompleteFailure">
                    <br /><br />
                    <span v-for="(e, i) in responseErrors">
                        <strong>Error {{ i + 1 }}</strong> <br />
                        <strong>Status: </strong>{{ e.status }}  {{ e.statusText }}<br />
                        <strong>Message: </strong>{{ e.message }} <br />
                        <div style="display: flex;margin-bottom: 1em;">
                            <strong>Response body: </strong>
                            <v-btn
                                :icon="copiedIndex === i ? 'mdi-check' : 'mdi-content-copy'"
                                :style="copiedIndex === i ? 'color: green;' : ''"
                                @click="copyErrorText(e.body, i)"
                                density="compact" size="small" variant="text"
                                style="margin-left: auto;"
                            ></v-btn>
                        </div>
                        <small>
                            <pre class="error-stack">{{ e.body || '(no body returned)' }}</pre>
                        </small>
                    </span>
                </span>
            </span>
        </v-card-text>
        <v-card-actions class="position-absolute top-0 right-0 pa-2">
            <v-btn v-if="!responseReceived && nodesToSubmit.length" @click="downloadTTL()">
                <v-icon>mdi-download</v-icon> Download RDF
            </v-btn>
            <v-btn v-if="!responseReceived && nodesToSubmit.length" type="submit" @click="submit()">
                <v-icon>mdi-check-circle-outline</v-icon> Submit
            </v-btn>
            <v-btn v-if="responseReceived" @click="clearSubmitErrors()">
                <v-icon>mdi-check-circle-outline</v-icon> OK
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup>import { ref, onBeforeMount, inject } from 'vue';
import { getDisplayName, getRecordDisplayLabel, getRecordQuads, quadsToTTL, dlTTL} from '@/modules/utils';

import { useToken } from '@/composables/tokens';
import { DataFactory, Store } from 'n3';
const { namedNode } = DataFactory;

const props = defineProps({
    dialog: Boolean,
});

const selectedNodesToSubmit = defineModel('selectedNodesToSubmit')
const submitForm = ref(null);
const tokenval = ref(null);
const { token, setToken, clearToken } = useToken();
const submitRdfData = inject('submitRdfData');
const tokenExists = ref(false);
const shapesDS = inject('shapesDS');
const rdfDS = inject('rdfDS');
const nodesToSubmit = inject('nodesToSubmit');
const ID_IRI = inject('ID_IRI');
const config = inject('config');
const configVarsMain = inject('configVarsMain');
const getClassIcon = inject('getClassIcon');
const allPrefixes = inject('allPrefixes');
const awaitingResponse = ref(false);
const responseReceived = ref(false);
const responseSuccess = ref(false);
const responseFailure = ref(false);

const showCompleteFailure = ref(false);
const responseText = ref('');
const responseErrors = ref([]);

const failureToggleIcon = ref('mdi-chevron-right');
const copiedIndex = ref(null);

function toggleFailureResponse() {
    showCompleteFailure.value = !showCompleteFailure.value;
    if (showCompleteFailure.value) {
        failureToggleIcon.value = 'mdi-chevron-down';
    } else {
        failureToggleIcon.value = 'mdi-chevron-right';
    }
}

const rules = [
    (value) => {
        if (value) return true;
        return 'A token is required';
    },
];

function clearSubmitErrors() {
    responseSuccess.value = false;
    responseFailure.value = false;
    responseText.value = '';
    responseErrors.value = [];
    responseReceived.value = false;
    awaitingResponse.value = false;

}

async function submit() {
    // Validate the form first
    if (!tokenExists.value) {
        const { valid } = await submitForm.value.validate();
        if (!valid) {
            console.log('invalid');
            return;
        }
        setToken(tokenval.value);
    }
    awaitingResponse.value = true;
    var submit_result = await submitRdfData(
        nodesToSubmit.value.filter(obj => selectedNodesToSubmit.value.includes(obj.node_iri)),
        shapesDS,
        ID_IRI.value,
        allPrefixes,
        config,
        rdfDS
    );
    if (submit_result.success) {
        responseSuccess.value = true;
        responseFailure.value = false;
        responseText.value = 'Your metadata submission was successful!';
    } else {
        responseSuccess.value = false;
        responseFailure.value = true;
        responseText.value =
            'There was an error during metadata submission, please try again or report this to your administrator if the problem persists.';
        if (
            submit_result.error &&
            Array.isArray(submit_result.error) &&
            submit_result.error.length > 0
        ) {
            responseErrors.value = submit_result.error;
            for (var e of submit_result.error) {
                console.error(e);
            }
        }
    }
    responseReceived.value = true;
    awaitingResponse.value = false;
}

async function downloadTTL() {
    let toSubmit = [...nodesToSubmit.value];
    const ds = new Store();
    for (const node of toSubmit) {
        var quads = getRecordQuads(node.node_iri, rdfDS.data.graph, true);
        ds.addQuads(quads)
    }
    const allQuads = ds.getQuads(null, null, null, null)
    var ttlstring = await quadsToTTL(allQuads, allPrefixes);
    ttlstring = ttlstring.replace(/^\s+/g, '');
    ttlstring = '\n' + ttlstring;
    dlTTL(ttlstring, 'submit_rdf_data_' + Date.now())
}

onBeforeMount(() => {
    if (token.value !== null && token.value !== 'null') {
        tokenExists.value = true;
    }
});

async function copyErrorText(text, i) {
    try {
        await navigator.clipboard.writeText(text);
        copiedIndex.value = i;
        setTimeout(() => {
            if (copiedIndex.value === i) copiedIndex.value = null;
        }, 1000);
    } catch (err) {
        console.error('Clipboard copy failed:', err);
    }
}
</script>

<style scoped>
.error-stack {
    border: 1px solid rgb(255, 112, 112);
    border-radius: 8px;
    background-color: rgb(var(--v-theme-background));
    overflow-x: scroll;
    padding: 0.5em;
}
</style>
