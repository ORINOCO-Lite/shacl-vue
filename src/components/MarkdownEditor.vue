<template>
    <v-input
        v-model="internalValue"
        :rules="rules"
        ref="fieldRef"
        :id="inputId"
        hide-details="auto"
    >
        <v-textarea
            v-model="subValues.text"
            density="compact"
            variant="outlined"
            label="add text"
            hide-details="auto"
        >
            <template #append-inner>
                <v-icon
                    class="cursor-pointer"
                    @click="markdownDialog = true"
                >
                    mdi-language-markdown
                </v-icon>
            </template>
        </v-textarea>
    </v-input>

    <v-dialog v-model="markdownDialog" max-width="1200" content-class="markdown-dialog-wrapper">
        <v-card class="markdown-dialog">
            <v-card-title class="d-flex justify-space-between">
                <span>Markdown editor</span>
                <v-btn
                    @click="markdownDialog = false"
                    prepend-icon="mdi-close-box"
                    size="small"
                >Close</v-btn>
            </v-card-title>
            <v-divider />
            <v-card-text class="markdown-dialog-body pa-1">
                <v-row class="markdown-row">
                    <v-col cols="12" md="6" class="pa-4">
                        <MarkdownCodeMirror
                            v-model="subValues.text"
                        />
                    </v-col>
                    <v-col cols="12" md="6" class="pa-4">
                        <div
                            class="markdown-preview"
                            v-html="renderedMarkdown"
                        />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { useRules } from '../composables/rules';
import { useRegisterRef } from '../composables/refregister';
import { useBaseInput } from '@/composables/base';
import { computed, ref } from 'vue';
import MarkdownCodeMirror from '@/components/MarkdownCodeMirror.vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

const props = defineProps({
    modelValue: String,
    property_shape: Object,
    node_uid: String,
    node_idx: String,
    triple_uid: String,
    triple_idx: Number,
});
const { rules } = useRules(props.property_shape);
const inputId = `input-${Date.now()}`;
const { fieldRef } = useRegisterRef(inputId, props);
const emit = defineEmits(['update:modelValue']);
const { subValues, internalValue } = useBaseInput(
    props,
    emit,
    valueParser,
    valueCombiner
);

function valueParser(value) {
    // Parsing internalValue into ref values for separate subcomponent(s)
    return {
        text: value,
    };
}

function valueCombiner(values) {
    // Determine internalValue from subvalues/subcomponents
    return values.text;
}

const markdownDialog = ref(false)

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
    const normalized = normalizeMarkdownNewlines(subValues.value.text || '')
    const raw = md.render(normalized)
    const renderedMD = DOMPurify.sanitize(raw, {
        USE_PROFILES: { html: true }
    })
    return renderedMD
})

</script>

<script>
import { SHACL, SHACLVUE, XSD } from '../modules/namespaces';
export const matchingLogic = (shape) => {
    // sh:nodeKind exists
    if (shape.hasOwnProperty(SHACL.nodeKind.value)) {
        // sh:nodeKind == sh:Literal
        if (shape[SHACL.nodeKind.value] == SHACL.Literal.value) {
            // sh:datatype exists
            if (shape.hasOwnProperty(SHACL.datatype.value)) {
                // sh:datatype == xsd:string
                if (shape[SHACL.datatype.value] == XSD.string.value) {
                    // text area
                    return (
                        shape.hasOwnProperty(SHACL.datatype.value) &&
                        shape[SHACLVUE.markdown.value] == 'true'
                    );
                }
            }
        }
    }
    return false;
};
</script>

<style>
.v-overlay__content.markdown-dialog-wrapper {
  max-height: none !important;
  height: 85vh;
}

.markdown-dialog-wrapper {
  display: flex;
}

.markdown-dialog {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.markdown-dialog-body {
  flex: 1;
  overflow: hidden;
  overflow-y: auto;
}

.markdown-row {
  height: 100%;
}

.markdown-row > .v-col {
  height: 100%;
  display: flex;
}

.markdown-row > .v-col > * {
  flex: 1;
  min-height: 0;
}

.markdown-preview {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
  padding: 12px;
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
