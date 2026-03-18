<template>
    <v-row no-gutters align="center" v-for="child in input.inputs" :key="child.prop" >
        <v-col cols="4">
            <span v-if="child.description">
                <v-tooltip  :text="child.description" location="end top" origin="start bottom">
                    <template v-slot:activator="{ props }">
                        <span v-bind="props">{{ child.name }}</span>
                    </template>
                </v-tooltip>
            </span>
            <span v-else>
                {{ child.name }}
            </span>
        </v-col>
        <v-col>
            <WizardEditorInput
                :input="child"
                :model-value="modelValue?.[child.prop]"
                @update:modelValue="updateField(child.prop, $event)"
            />
        </v-col>
    </v-row>
</template>

<script setup>
import WizardEditorInput from './WizardEditorInput.vue'

const props = defineProps({
  input: Object,
})

const modelValue = defineModel();

function updateField(prop, val) {
    modelValue.value = {
        ...(modelValue.value || {}),
        [prop]: val
    }
}
</script>