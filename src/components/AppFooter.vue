<template>
    <v-footer height="50">
        <div style="display: flex; justify-content: space-around; width: 100%;">
            <div
                class="text-caption text-disabled"
                style="text-align: center;"
            >
                <span class="d-none d-sm-inline-block">Powered by</span>
                <a
                    :href="link"
                    title="shacl-vue"
                    class="d-inline-block mx-2 social-link"
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <v-icon size="24"
                        ><v-img src="/shacl_vue_logo.svg"></v-img
                    ></v-icon>
                </a>
                <span class="d-none d-sm-inline-block">shacl-vue (<v-tooltip location="top" content-class="tight-tooltip">
                    <template v-slot:activator="{ props }">
                        <a target="_blank" :href="link" v-bind="props">{{'v' + date}}</a>
                    </template>
                    <small>
                    <v-card style="padding: 0.25em;">
                        <em>branch:</em> {{ branch }}<br>
                        <em>commit:</em> {{ commit_short }}
                    </v-card>
                    </small>
                </v-tooltip>)
                </span>
            </div>
            <span v-for="d in configVarsMain.footerLinks">
                <div v-if="d.url && d.text" class="text-caption">
                    <a :href="d.url" target="_blank">{{d.text}}</a>
                </div>
            </span>
        </div>
    </v-footer>
</template>

<script setup>
import { inject } from 'vue';
const configVarsMain = inject('configVarsMain');
const branch = __SV_BRANCH__;
const commit = __SV_COMMIT_HASH__;
const commit_short = __SV_COMMIT_HASH_SHORT__;
const date = __SV_COMMIT_DATE__;

// const branch = __BRANCH__;
// const commit_short = __COMMIT_HASH_SHORT__;
// const commit = __COMMIT_HASH__;
const link = `https://hub.psychoinformatics.de/orinoco/shacl-vue/src/commit/${commit}`;

</script>


<style>
/* Override Vuetify’s default padding/constraints for tooltip */
.tight-tooltip.v-overlay__content {
    padding: 0 !important;
    margin: 0 !important;
    max-width: none !important;
    min-width: auto !important;
    width: auto !important;
    height: auto !important;
    background-color: rgb(var(--v-theme-background)) !important;
    color: rgb(var(--v-theme-on-surface)) !important;
    border: 1px solid #b4b4b4;
}
</style>