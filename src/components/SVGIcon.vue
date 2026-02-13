<template>
    <v-icon :size="size">
        <span
            class="custom-svg"
            v-html="icon"
        />
    </v-icon>
</template>

<script setup>
    defineProps({
        icon: String,
        size: {
            type: [Number, String],
            default: 24,
        },
    })
</script>

<style scoped>
.custom-svg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.custom-svg svg {
    width: 100%;
    height: 100%;
    display: block;
    fill: currentColor;
}
</style>
