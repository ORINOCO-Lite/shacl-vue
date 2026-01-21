<template>
    <v-app>
        <ShaclVue></ShaclVue>
        <!-- <ShaclVue :configUrl="confURL"></ShaclVue> -->
    </v-app>
</template>

<script setup>
    // A specific config URL can be provided:
    // const confURL = '';
    // If not provided, the default config URLs will be tried in order at the base URL:
    // 1. config.yaml
    // 2. config.yml
    // 3. config.json
</script>
