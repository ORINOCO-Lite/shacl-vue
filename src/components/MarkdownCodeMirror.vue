<template>
    <div ref="editorEl" class="cm-editor" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, EditorSelection, Compartment } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { closeBrackets } from '@codemirror/autocomplete'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { useAppTheme } from '@/composables/useAppTheme';

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    }
})
const emit = defineEmits(['update:modelValue'])
const editorEl = ref(null)
let view
const { theme, isDark } = useAppTheme();
const themeCompartment = new Compartment()
const fixedHeightTheme = EditorView.theme({
    '&': {
        height: '100%',
    },
    '.cm-scroller': {
        height: '100%',
        overflow: 'auto',
    },
    '.cm-content': {
        padding: '8px 0',
    },
})

function wrapSelection(wrapper) {
    return ({ state, dispatch }) => {
        const selection = state.selection.main
        if (selection.empty) return false
        const selectedText = state.doc.sliceString(selection.from, selection.to)
        dispatch(
            state.update({
                changes: {
                    from: selection.from,
                    to: selection.to,
                    insert: `${wrapper}${selectedText}${wrapper}`,
                },
                selection: EditorSelection.range(
                    selection.from + wrapper.length,
                    selection.to + wrapper.length
                ),
            })
        )
        return true
    }
}

onMounted(() => {
    view = new EditorView({
        parent: editorEl.value,
        state: EditorState.create({
            doc: props.modelValue,
            extensions: [
                markdown({
                    codeLanguages: languages
                }),
                closeBrackets(),
                fixedHeightTheme,
                EditorView.lineWrapping,
                syntaxHighlighting(defaultHighlightStyle),
                history(),
                themeCompartment.of(isDark.value ? oneDark : []),
                keymap.of([
                    indentWithTab,
                      // markdown wrappers
                    { key: '*', run: wrapSelection('*') },
                    { key: '_', run: wrapSelection('_') },
                    { key: '`', run: wrapSelection('`') },
                    // bold & code
                    { key: 'Mod-b', run: wrapSelection('**') },
                    { key: 'Mod-i', run: wrapSelection('*') },
                    { key: 'Mod-`', run: wrapSelection('`') },
                    ...historyKeymap,
                    ...defaultKeymap
                ]),
                EditorView.updateListener.of(update => {
                    if (update.docChanged) {
                        emit(
                            'update:modelValue',
                            update.state.doc.toString()
                        )
                    }
                })
            ]
        })
    })
})

watch(() => props.modelValue, value => {
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
        view.dispatch({
            changes: {
                from: 0,
                to: current.length,
                insert: value
            }
        })
    }
})

watch(isDark, (dark) => {
    if (!view) return
    view.dispatch({
        effects: themeCompartment.reconfigure(dark ? oneDark : [])
    })
})

onBeforeUnmount(() => {
    view?.destroy()
})
</script>

<style scoped>
.cm-editor {
    height: 100%;
    width: 100%;
    font-family: monospace;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
}
</style>
