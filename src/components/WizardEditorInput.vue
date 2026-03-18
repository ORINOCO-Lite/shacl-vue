<template>
    <WizardEditorInputArray
        v-if="input.multi_valued"
        :input="input"
        v-model="value"
        :rules="rules"
        :uploadConfig="uploadConfig"
        @button-click="emit('button-click',$event)"
    />
    <WizardEditorInputObject
        v-else-if="input.type === 'object'"
        :input="input"
        v-model="value"
    />
    <WizardEditorInputPrimitive
        v-else
        :input="input"
        v-model="value"
        :rules="rules"
        :uploadConfig="uploadConfig"
        @button-click="emit('button-click',$event)"
    />
</template>


<script setup>
import WizardEditorInputPrimitive from './WizardEditorInputPrimitive.vue'
import WizardEditorInputArray from './WizardEditorInputArray.vue'
import WizardEditorInputObject from './WizardEditorInputObject.vue'

const props = defineProps({
    input: Object,
    rules: Array,
    uploadConfig: Object
})

const value = defineModel();

const emit = defineEmits(['button-click'])

</script>

