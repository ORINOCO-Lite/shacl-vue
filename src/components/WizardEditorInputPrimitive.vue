<template>
    <v-text-field
        v-if="input.type === 'text'"
        v-model="value"
        :placeholder="input.placeholder"
        :rules="rules"
        variant="outlined"
        density="compact"
        hide-details="auto"
        
    />
    <v-textarea
        v-else-if="input.type === 'text-paragraph'"
        v-model="value"
        :placeholder="input.placeholder"
        :rules="rules"
        variant="outlined"
        density="compact"
        hide-details="auto"
        
    />
    <v-switch
        v-else-if="input.type === 'boolean'"
        v-model="value"
        :rules="rules"
        density="compact"
        hide-details="auto"
        
    />
    <GitAnnexUploader4Wiz
        v-else-if="input.type === 'upload'"
        v-model="value"
        :config="uploadConfig"
    />
    <v-btn
        v-else-if="input.type === 'button'"
        @click="emit('button-click',input)"
        density="compact"
        hide-details="auto"
    >
        {{ input.name }}
    </v-btn>
</template>

<script setup>
import GitAnnexUploader4Wiz from '@/components/GitAnnexUploader4Wiz.vue'

const props = defineProps({
  input: Object,
  rules: Array,
  uploadConfig: Object
})

const value = defineModel();

const emit = defineEmits(['button-click'])
</script>

<style scoped>
:deep(.v-field__input) {
  font-size: 0.75rem;
}

:deep(.v-label) {
  font-size: 0.75rem;
}
</style>