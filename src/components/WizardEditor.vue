<template>
    <v-card class="pa-1" v-if="props.wizardConfig">
        <v-card-title>{{ props.wizardConfig.name }}</v-card-title>
        <v-card-text>
            <div class="markdown-preview" v-html="renderedMarkdown" />
        </v-card-text>
        <v-card-text class="text-caption">
            <v-form
                ref="wizardForm"
                v-model="wizardFormValid"
                validate-on="lazy input"
                @submit.prevent="saveForm()"
            >
                <span v-if="showComponent && componentPlugin && componentName">
                    <component
                        :is="plugins[componentPlugin].components[componentName]"
                        v-model:modelVals="modelVals"
                        :config="props.wizardConfig"
                        @init-form="initForm(props.wizardConfig)"
                    />
                </span>
                <span v-else>
                    <div class="fill-height">
                        <v-row no-gutters align="stretch" v-for="input in props.wizardConfig.inputs" :key="input.prop" class="wizard-input-row">
                            <v-col cols="3">
                                <span v-if="input.type !== 'button'">
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
                                </span>
                            </v-col>
                            <v-col>
                                <WizardEditorInput
                                    :input="input"
                                    v-model="modelVals[input.prop]"
                                    :rules="rules[input.prop]"
                                    :uploadConfig="uploadConfig"
                                    @button-click="callInputBtnFunction"
                                />
                            </v-col>
                        </v-row>
                    </div>
                </span>
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
import { reactive, ref, toRaw, watch, inject, computed} from 'vue';
import WizardEditorInput from './WizardEditorInput.vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

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
const configVarsMain = inject('configVarsMain');
const uploadConfig = configVarsMain.gitannexP2phttpConfigWizard ?? {};
const plugins = inject('runtimePlugins')
const rdfDS = inject('rdfDS')
const showComponent = ref(false);
const componentPlugin = ref(null);
const componentName = ref(null);

watch(
    () => props.wizardConfig,
    (config) => initForm(config),
    { immediate: true }
)

function cancelForm() {
    emit('cancel')
}

function initForm(config) {
    if (props.wizardConfig?.component) {
        let parts = props.wizardConfig.component.split(':');
        if (parts.length == 2 && plugins?.[parts[0]]?.components?.[parts[1]]) {
            showComponent.value = true;
            componentPlugin.value = parts[0];
            componentName.value = parts[1];
        }
    }
    Object.keys(modelVals).forEach(k => delete modelVals[k])
    Object.keys(rules).forEach(k => delete rules[k])
    if (!config?.inputs) return
    for (const input of config.inputs) {
        // Initialize model value per input
        modelVals[input.prop] = initModelValue(input)
        // Initialize rules per input
        initInputRules(input, rules)
    }
}


function initModelValue(input) {
    // multi-valued → empty array
    if (input.multi_valued) {
        return []
    }
    // object → empty object
    if (input.type === 'object') {
        return {}
    }
    // primitive
    return input.default ?? null
}

function initInputRules(input, rules) {
    rules[input.prop] = []
    if (baseRules[input.type]) {
        rules[input.prop].push(baseRules[input.type])
    }
    if (input.required) {
        rules[input.prop].push(v => !!v || 'This is a required field')
    }
    if (input.pattern) {
        const { jsFlags, jsPattern } = getJsRegex(input.pattern)
        let anchored = jsPattern
        if (!(jsPattern.startsWith('^') && jsPattern.endsWith('$'))) {
            anchored = `^${jsPattern}$`
        }
        try {
            const regex = new RegExp(anchored, jsFlags)
            const message = input.message || 'Input does not match the required format'
            rules[input.prop].push(v => !v || regex.test(v) || message)
        } catch (err) {
            console.error(`Invalid pattern "${input.pattern}"`, err)
        }
    }
    // recurse into objects
    if (input.type === 'object') {
        for (const child of input.inputs || []) {
            initInputRules(child, rules)
        }
    }
}

async function saveForm() {
    try {
        // Await the validation result
        const validationResult = await wizardForm.value.validate();
        if (validationResult.valid) {
            // If the form is valid, proceed to emit event with data
            emit('save', {...toRaw(modelVals), _template: toRaw(props.wizardConfig.template), _template_type: toRaw(props.wizardConfig.template_type)})
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

async function resetForm() {
    await wizardForm.value.reset()
    const config = props.wizardConfig
    if (!config?.inputs) return

    for (const input of config.inputs) {
        modelVals[input.prop] = initModelValue(input)
    }
}

async function callInputBtnFunction(btn) {
    if (!btn.on_click) {
        let msg = "No 'on_click' action configured for button input in Wizard Editor"
        console.error(msg)
        alert(msg)
        return;
    }
    if (!btn.on_click.call) {
        let msg = "No 'call' function specified for button on_click in Wizard Editor"
        console.error(msg)
        alert(msg)
        return;
    }
    // create data
    const data = {
        rdfDS: rdfDS,
        ...toRaw(modelVals)
    }

    let btnResult;
    if (btn.on_click.plugin) {
        btnResult = await plugins[btn.on_click.plugin][btn.on_click.call](data)
    } else {
        let fn = btn.on_click.call
        btnResult = await fn(data)
    }
    if (btnResult) {
        applyResultToModel(props.wizardConfig.inputs, modelVals, btnResult)
    }
}

function applyResultToModel(inputs, model, result) {
    if (!result || typeof result !== 'object') return
    for (const input of inputs) {
        const prop = input.prop
        if (!(prop in result)) continue;
        const value = result[prop]
        if (value === undefined || value === null) continue;
        // multi-valued
        if (input.multi_valued) {
            if (!Array.isArray(value)) continue;
            model[prop] = value.map(item => {
                if (input.type === 'object') {
                    const obj = initModelValue({ ...input, multi_valued: false })
                    applyResultToModel(input.inputs || [], obj, item)
                    return obj
                }
                return item
            })
            continue;
        }
        // object
        if (input.type === 'object') {
            if (typeof value !== 'object') continue
            if (!model[prop]) {
                model[prop] = initModelValue(input)
            }
            applyResultToModel(input.inputs || [], model[prop], value)
            continue;
        }
        // primitive
        model[prop] = value
    }
}

const md = new MarkdownIt({
    breaks: true,
    highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value
            } catch (e) {
                //
            }
        }
        return hljs.highlightAuto(code).value
    }
})

function normalizeMarkdownNewlines(text) {
    const normalizedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
    return normalizedText
}

const renderedMarkdown = computed(() => {
    const normalized = normalizeMarkdownNewlines(props.wizardConfig.description || '')
    const raw = md.render(normalized)
    const renderedMD = DOMPurify.sanitize(raw, {
        USE_PROFILES: { html: true }
    })
    return renderedMD
})
</script>

<style scoped>
.wizard-input-row {
    padding-bottom: 0.2em;
    margin-bottom: 0.2em;
}

.markdown-preview {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: none;
  padding: 0px;
  height: 100%;
  overflow-y: auto;
  line-height: 1.6;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  font-size: 0.95rem;
}

.markdown-preview a {
  color: rgb(var(--v-theme-primary));
}

.markdown-preview > * {
  margin-top: 0;
  margin-bottom: 1.2em;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 1.5em;
  margin: 0.5em 0 1em;
  list-style-position: outside;
}

.markdown-preview li {
  margin: 0.25em 0;
}

.markdown-preview h1 {
  font-size: 1.8em;
  margin-bottom: 0.6em;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.3em;
}

.markdown-preview h2 {
  font-size: 1.5em;
}

.markdown-preview h3 {
  font-size: 1.25em;
}

.v-theme--light .markdown-preview pre {
  background: #f6f8fa;
  color: #24292f;
}

.v-theme--dark .markdown-preview pre {
  background: #161b22;
  color: #e6edf3;
}

.markdown-preview pre {
  padding: 12px 14px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.9em;
  line-height: 1.5;
}

.markdown-preview pre code {
  background: transparent;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

.v-theme--light .markdown-preview :not(pre) > code {
  background: rgba(0, 0, 0, 0.06);
  color: #24292f;
}

.v-theme--dark .markdown-preview :not(pre) > code {
  background: rgba(255, 255, 255, 0.12);
  color: #e6edf3;
}

.markdown-preview :not(pre) > code {
  padding: 0.15em 0.35em;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown-preview blockquote {
  border-left: 4px solid #d0d7de;
  padding-left: 1em;
  color: #57606a;
}

.markdown-preview hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 2em 0;
}

</style>