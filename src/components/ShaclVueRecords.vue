<template>
    <span v-if="props.classRecordsLoading">
        <v-skeleton-loader type="list-item-avatar"></v-skeleton-loader>
    </span>
    <span v-else>
        <div v-if="props.fetchedItemCount">
            <v-row v-if="props.fetchedItemCount">
                <v-col :cols="props.mobile ? 12 : 8">
                    <v-text-field
                        v-model="searchText"
                        density="compact"
                        variant="outlined"
                        :label="`Enter at least ${configVarsMain.serviceConstrainedSearch.min_characters} characters to search all records`"
                        hide-details="auto"
                        style="margin: 1em;"
                        :disabled="openForms.length > 0"
                        @update:modelValue="emit('user-typing')"
                        :class="props.mobile ? 'mobile-scaled' : '' "
                    >
                        <template v-slot:append-inner>
                            <v-icon
                                v-if="searchText"
                                class="mr-2"
                                @click.stop="clearField()"
                                @mousedown.stop.prevent
                            >
                                mdi-close-circle
                            </v-icon>
                        </template>
                        <template #append>
                            <span v-if="props.mobile">
                                <v-btn
                                    variant="outlined"
                                    @click="toggleOrder()"
                                    :icon="orderIcon"
                                    :disabled="openForms.length > 0"
                                ></v-btn>
                            </span>
                            <span v-else>
                                <v-btn
                                    variant="outlined"
                                    @click="toggleOrder()"
                                    :append-icon="orderIcon"
                                    :disabled="openForms.length > 0"
                                >
                                    Order
                                </v-btn>
                            </span>
                        </template>
                    </v-text-field>
                </v-col>
                <v-col v-if="!props.mobile"></v-col>
            </v-row>
            <v-tooltip text="Scroll to top" location="top end">
                <template v-slot:activator="{ props: activatorProps }">
                    <v-fab
                        v-if="props.showScrollTopBtn && openForms.length == 0"
                        @click="scrollToTop"
                        icon="mdi-arrow-up-bold"
                        :app="true"
                        style="bottom: 2em;"
                        v-bind="activatorProps"
                    ></v-fab>
                </template>
            </v-tooltip>
            <DynamicScroller
                :items="props.filteredRecords"
                page-mode
                :min-item-size="50"
                key-field="title"
                class="virtual-scroller"
                @scroll-end="emit('scroll-end')"
                ref="scrollerRef"
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
                            <NodeShapeViewer
                                :classIRI="item.props.quad ? item.props.quad.object.value : props.selectedIRI"
                                :quad="item.props.quad"
                                :item="item.value"
                                :key="props.selectedIRI + '-' + item.title"
                                :formOpen="formOpen"
                                :variant="'tonal'"
                                @namedNodeSelected="onNamedNodeSelected"
                            />
                        </template>
                    </DynamicScrollerItem>
                </template>
                <template #after>
                    <div class="after-loader" :style="'color: ' + configVarsMain.appTheme.link_color + ';'">
                        <v-progress-circular v-show="props.showFetchingPageLoader" indeterminate :size="40" :width="4"></v-progress-circular>
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

import { inject, ref} from 'vue';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import {
    DynamicScroller,
    DynamicScrollerItem,
} from 'vue-virtual-scroller';

// ----- //
// PROPS //
// ----- //
const props = defineProps({
    selectedIRI: String,
    classRecordsLoading: Boolean,
    mobile: Boolean,
    showScrollTopBtn: Boolean,
    scrollToTop: Function,
    filteredRecords: Array,
    fetchedItemCount: Number,
    showFetchingPageLoader: Boolean,
});

const emit = defineEmits([
    'handle-internal-navigation',
    'scroll-end',
    'user-typing',
    'scroll-to-top',
])

const searchText = defineModel('searchText')
const textMatchType = defineModel('textMatchType')
const orderTopDown = defineModel('orderTopDown')

const formOpen = inject('formOpen');
const openForms = inject('openForms')
const configVarsMain = inject('configVarsMain')
const itemRefs = ref([]);
const orderIcon = ref('mdi-arrow-down-thick');
const scrollerRef = ref(null);

function toggleOrder() {
    orderTopDown.value = !orderTopDown.value;
    if (orderTopDown.value) {
        orderIcon.value = 'mdi-arrow-down-thick';
    } else {
        orderIcon.value = 'mdi-arrow-up-thick';
    }
}

function clearField() {
    searchText.value = '';
    textMatchType.value = 'partial';
}

function scrollToTop() {
    if (scrollerRef.value?.scrollToItem) {
        scrollerRef.value.scrollToItem(0);
    }
    emit('scroll-to-top')
}

function onNamedNodeSelected(payload) {
  emit('handle-internal-navigation', payload)
}

</script>

<style>
.virtual-scroller {
    height: auto;
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