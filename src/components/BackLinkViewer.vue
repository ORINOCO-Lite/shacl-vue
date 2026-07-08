<template>
    <v-skeleton-loader v-if="fetchingStuff" type="paragraph"></v-skeleton-loader>
    <h4 v-if="hasNoReferencingRecords" style="margin-bottom: 1em; font-style: italic;">This record is not currently referenced by other records</h4>
    <h4 v-if="Object.keys(refRecords).length" style="margin-bottom: 1em;">Records referencing this record:</h4>
    <small>
    <div v-for="(arr, key) in refRecords" style="margin-bottom: 0.5em;">
        <em>via <strong>{{makeReadable(toCURIE(key, allPrefixes, 'parts').property)}}</strong></em>:
        <span v-for="r in arr">
            <br>&nbsp;-&nbsp;
            <NamedNodeViewer
                :textVal="r.record_id"
                :prefLabel="getPrefLabel(r.quad.subject, rdfDS, allPrefixes)"
                :displayLabel="getRecordDisplayLabel(r.quad.subject, rdfDS, allPrefixes, configVarsMain)"
                :quad="r.quad"
                :targetClass="r.class_iri"
                :allowLink="true"
            >
            </NamedNodeViewer>
        </span>
    </div>
    </small>
</template>

<script setup>

import { inject, onMounted, ref } from 'vue';
import { toCURIE, getReferencingRecords, getPrefLabel, getRecordDisplayLabel, makeReadable} from '@/modules/utils';

const props = defineProps({
    record: Object,
});
const fetchFromService = inject('fetchFromService')
const allPrefixes = inject('allPrefixes')
const rdfDS = inject('rdfDS')
const configVarsMain = inject('configVarsMain')
const refRecords = ref({});
const hasNoReferencingRecords = ref(false);
const fetchingStuff = ref(false);

onMounted(async () => {
    fetchingStuff.value = true;
    const arg = allPrefixes['dlthings'] + 'Thing';
    await fetchFromService('get-paginated-records-constrained', arg, allPrefixes, props.record.title )
    await fetchFromService('get-paginated-records-constrained', arg, allPrefixes, toCURIE(props.record.title, allPrefixes))
    refRecords.value = getReferencingRecords(props.record.title, rdfDS.data.graph)
    if (Object.keys(refRecords.value).length == 0) {
        hasNoReferencingRecords.value = true;
    }
    fetchingStuff.value = false;
})
    
</script>