<template>
    <v-tooltip v-for="b in btns" :text="props.config.tooltip" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn
                icon
                variant="tonal"
                size="x-small"
                class="rounded-lg"
                @click="openInNewTab(b.link)"
                v-bind="props"
                style="cursor: pointer;"
            >
                <span v-if="b.iconFig.type == 'mdi'">
                    <v-icon>{{ b.iconFig.icon }}</v-icon>
                </span>
                <span v-else>
                    <SVGIcon :icon="b.iconFig.icon"></SVGIcon>
                </span>
            </v-btn>
        </template>
    </v-tooltip>
</template>

<script setup>
import { ref, onBeforeMount, onMounted, inject, toRaw } from 'vue';
import SVGIcon from '@/components/SVGIcon.vue'
import { fillStringTemplate, getIcon} from '@/modules/utils';
import { openExternalHTTPURL } from '@/modules/safe-url';

// --------------- //
// Component props //
// --------------- //
const props = defineProps({
    returnVal: Array,
    config: Object,
});

// ---- //
// Data //
// ---- //
const btns = ref([]);
const configVarsMain = inject('configVarsMain')

// ----------------- //
// Lifecycle methods //
// ----------------- //
onBeforeMount(() => {
    for (const sBval of props.returnVal) {
        let btn = {}
        btn.link = fillStringTemplate(props.config.template, {'return': sBval})
        btn.iconFig = getIcon(props.config.icon, configVarsMain)
        btns.value.push(btn)
    }
});

// --------- //
// Functions //
// --------- //
function openInNewTab(url) {
    openExternalHTTPURL(url);
}


</script>
