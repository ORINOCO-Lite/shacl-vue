<template>
    <v-row no-gutters v-for="(value,idx) in modelValue" :key="idx" :class="idx + 1 == modelValue.length ? '' : 'array-input-row'">
        <v-col>
            <span v-if="modelValue.length > 1" class="element-idx">{{ idx + 1 }}</span>
            <WizardEditorInput
                :input="{...input, multi_valued: false}"
                v-model="modelValue[idx]"
                @button-click="emit('button-click',$event)"
            />
        </v-col>
        <v-col cols="auto">
            &nbsp;
            <v-btn
                v-if="modelValue.length>1"
                icon="mdi-delete-outline"
                @click="remove(idx)"
                rounded="0"
                elevation="1"
                density="compact"
            />
            &nbsp;
            <v-btn
                v-if="idx===modelValue.length-1"
                icon="mdi-plus-circle-outline"
                @click="add"
                rounded="0"
                elevation="1"
                density="compact"
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

const emit = defineEmits(['button-click'])

function add() {
    modelValue.value = [...(modelValue.value || []), null]
}

function remove(idx) {
    const copy = [...modelValue.value]
    copy.splice(idx,1)
    modelValue.value = copy;
}
</script>

<style scoped>
.array-input-row {
    padding-bottom: 0.2em;
    margin-bottom: 0.2em;
    border-bottom: 1px solid grey;
}
.element-idx {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    border: 1px solid grey;
}
</style>