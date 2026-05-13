<template>
    <span v-if="props.classRecordsLoading">
        <v-skeleton-loader type="list-item-avatar"></v-skeleton-loader>
    </span>
    <span v-else>
        <div v-if="props.items.length">
            <DynamicScroller
                :items="props.items"
                :min-item-size="100"
                key-field="value"
                class="virtual-scroller"
                @scroll-end="scrollEnd()"
            >
                <template v-slot="{ item, index, active, }">
                    <DynamicScrollerItem
                        :item="item"
                        :index="index"
                        :active="active"
                        class="scroller-item"
                        :ref="itemRefs[index]"
                    >
                        <template #default>
                            <NodeShapeViewerMini
                                :classIRI="props.classIRI"
                                :quad="item.props.quad"
                                :key="props.selectedIRI + '-' + item.title"
                                variant="outlined"
                                @namedNodeSelected="onNamedNodeSelected"
                            />
                        </template>
                    </DynamicScrollerItem>
                </template>
                <template #after>
                    <div class="after-loader" :style="'color: ' + configVarsMain.appTheme.link_color + ';'">
                        <v-progress-circular v-show="props.showFetchingPageLoader" indeterminate :size="20" :width="4"></v-progress-circular>
                    </div>
                </template>
            </DynamicScroller>
        </div>
        <div v-else style="margin-top: 1em; margin-left: 1em;">
            <em>No items</em>
        </div>
    </span>
</template>

<script setup>

import { computed, inject, ref, onBeforeMount} from 'vue';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import {
    DynamicScroller,
    DynamicScrollerItem,
} from 'vue-virtual-scroller';
import NodeShapeViewerMini from './NodeShapeViewerMini.vue';
import { useDisplay } from 'vuetify'

const { mdAndUp, lgAndUp } = useDisplay()

// ----- //
// PROPS //
// ----- //
const props = defineProps({
    classIRI: String,
    items: Array,
    classRecordsLoading: Boolean,
    showFetchingPageLoader: Boolean,
});

const emit = defineEmits([
    'handle-internal-navigation',
    'scroll-end',
])

const configVarsMain = inject('configVarsMain')
const itemRefs = ref([]);

function onNamedNodeSelected(payload) {
  emit('handle-internal-navigation', payload)
}

function scrollEnd() {
    emit('scroll-end')
}

</script>

<style>

.row-sheet {
  max-height: 30vh;
  overflow: hidden;

}

.left-col {
  height: 100%;
}

.right-col {
  height: 100%;
}

.virtual-scroller {
    max-height: 25vh;
    overflow-y: auto;
}

.scroller-item {
    padding-bottom: 3px;
}
</style>

<style scoped>
.after-loader {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.mobile-scaled {
    transform: scale(0.75);
    transform-origin: top left;
    width: 120%;
}
</style>