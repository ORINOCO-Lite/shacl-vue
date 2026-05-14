<template>
    <v-app>
        <component :is="appVariant" />
        <!-- <component :is="appVariant" :configUrl="confURL"></component> -->
    </v-app>
</template>

<script setup>
    import { defineAsyncComponent } from 'vue';
    // A specific config URL can be provided:
    // const confURL = '';
    // If not provided, the default config URLs will be tried in order at the base URL:
    // 1. config.yaml
    // 2. config.yml
    // 3. config.json
    // Now we set the main component based on VITE_SHACLVUE_VARIANT environment variable
    const variant = import.meta.env.VITE_SHACLVUE_VARIANT
    const componentMap = {
        default: defineAsyncComponent(() => import('@/components/ShaclVue.vue')),
        starter: defineAsyncComponent(() => import('@/components/ShaclVueStarter.vue')),
    }
    const appVariant = componentMap[variant] || componentMap.default;
</script>
