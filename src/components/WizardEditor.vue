<template>
    <v-card class="pa-1" v-if="props.wizardConfig">
        <v-card-title>{{ props.wizardConfig.name }}</v-card-title>
        <v-card-text>
            {{ props.wizardConfig.description }}
        </v-card-text>
        <v-card-text>
            <v-form
                ref="wizardForm"
                v-model="wizardFormValid"
                validate-on="lazy input"
                @submit.prevent="saveForm()"
            >
                <v-row no-gutters align="center" v-for="input in props.wizardConfig.inputs" :key="input.prop">
                    <v-col cols="4">
                        <span v-if="input.description">
                            <v-tooltip  :text="input.description" location="end top" origin="start bottom">
                                <template v-slot:activator="{ props }">
                                    <span v-bind="props">{{ input.name }}</span>
                                </template>
                            </v-tooltip>
                        </span>
                        <span v-else>
                            {{ input.name }}
                        </span>
                    </v-col>
                    <v-col>
                        <span >
                        <span v-if="input.type == 'text'">
                            <v-text-field v-model="modelVals[input.prop]" density="compact" variant="outlined" :label="input.placeholder ? input.placeholder : 'add text'" hide-details="auto" :rules="rules[input.prop]"></v-text-field>
                        </span>
                        <span v-else-if="input.type == 'text-paragraph'">
                            <v-textarea v-model="modelVals[input.prop]" density="compact" variant="outlined" :label="input.placeholder ? input.placeholder : 'add text'" hide-details="auto" :rules="rules[input.prop]"></v-textarea>
                        </span>
                        <span v-else-if="input.type == 'boolean'">
                            <v-switch v-model="modelVals[input.prop]" density="compact" variant="outlined" :label="input.placeholder ? input.placeholder : 'select value'" inset hide-details="auto" :rules="rules[input.prop]"></v-switch>
                        </span>
                        <span v-else>
                            kaaaaaaaaa
                        </span>
                    </span>
                    </v-col>
                </v-row>
            </v-form>
        </v-card-text>
        <v-card-actions>
            <v-btn
                    text="Cancel"
                    @click="cancelForm()"
                    style="margin-left: auto; margin-right: 1em"
                    prepend-icon="mdi-close-box"
                ></v-btn>
                <v-btn
                    text="Reset"
                    @click="resetForm()"
                    style="margin-right: 1em"
                    prepend-icon="mdi-undo"
                ></v-btn>
                <v-btn
                    text="Save"
                    type="submit"
                    @click="saveForm()"
                    prepend-icon="mdi-content-save"
                ></v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { reactive, ref, toRaw, watch} from 'vue';

// Define component props
const props = defineProps({
    wizardConfig: Object,
});
const emit = defineEmits(['save', 'cancel'])
// Refs
const wizardForm = ref(null);
const wizardFormValid = ref(null);
const modelVals = reactive({})
const rules = reactive({});
const baseRules = {}

watch(
    () => props.wizardConfig,
    (config) => initForm(config),
    { immediate: true }
)

function cancelForm() {
    emit('cancel')
}

function initForm(config) {
    Object.keys(modelVals).forEach(k => delete modelVals[k])
    Object.keys(rules).forEach(k => delete rules[k])
    if (!config?.inputs) return
    for (const input of config.inputs) {
        // Initialize model value per input
        modelVals[input.prop] = null
        // Set up validation rules
        rules[input.prop] = []
        // Add base rule if it exists
        if (baseRules[input.type]) {
            rules[input.prop].push(baseRules[input.type])
        }
        // Add required rule
        if (input.required) {
            rules[input.prop].push((value) => {
                if (value) return true;
                return 'This is a required field';
            });
        }
        // Add pattern matching rule
        if (input.pattern) {
            const {jsFlags, jsPattern} = getJsRegex(input.pattern)
            // anchor so it must match the entire value
            let anchored = jsPattern;
            if (!(jsPattern.startsWith('^') && jsPattern.endsWith('$'))) {
                anchored = `^${jsPattern}$`;
            }
            let regex;
            try {
                regex = new RegExp(anchored, jsFlags);
                const message = input.message ? input.message : 'Input does not match the required format';
                rules[input.prop].push((v) => {
                    if (!v) return true;
                    return regex.test(v) || message;
                });
            } catch (err) {
                console.error(`Invalid pattern “${input.pattern}”:`, err);
            }
        }
    }
}

// Functions
async function saveForm() {
    try {
        // Await the validation result
        const validationResult = await wizardForm.value.validate();
        if (validationResult.valid) {
            // If the form is valid, proceed to emit event with data
            emit('save', {...toRaw(modelVals), _template: toRaw(props.wizardConfig.template)})
        } else {
            console.log('Still some wizard form validation errors...');
            validationResult.errors.forEach((error) => {
                console.log(error)
            });
        }
    } catch (error) {
        console.error('Wizard form validation failed:', error);
    }
}

function resetForm() {
    Object.keys(modelVals).forEach(k => modelVals[k] = null)
}
</script>
