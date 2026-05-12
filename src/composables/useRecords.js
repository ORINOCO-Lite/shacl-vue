// useRecords.js
/*
This composable is meant to be used only by the main ShaclVue component
It returns refs and functions that are then provided to other components
in the hierarchy via props (or provide/inject), and as arguments to other
composables.

It contains all functionality related to the display and interactions of
records on the main page.
*/

import { ref, computed, watch, watchEffect, onMounted, nextTick, reactive} from 'vue';
import { debounce } from 'lodash-es';
import { RDF, SKOS } from '@/modules/namespaces';
import {
    getConfigDisplayLabel,
    hasConfigDisplayLabel,
    toCURIE,
    getPidQuad,
} from '@/modules/utils';
import { DataFactory } from 'n3';
const { namedNode } = DataFactory;

export function useRecords(
    allPrefixes,
    allSubClasses,
    config,
    configVarsMain,
    fetchFromService,
    firstPageFetched,
    hasUnfetchedPages,
    openForms,
    rdfDS,
    searchableFields,
    selectedIRI,
) {
    // ---- //
    // Data //
    // ---- //
    const totalItemCount = ref(0);
    const isFetchingPage = ref(false);
    const showFetchingPageLoader = ref(false)
    const searchText = ref('');
    const textMatchType = ref('partial');
    const classRecordsLoading = ref(false);
    const headingHover = ref(false);
    const orderTopDown = ref(true);
    const includeSubClasses = ref(false);
    const includedClasses = ref(null);
    let hideTimeout = null
    let debounceTypingTimer = null;
    const itemQueue = new Set();
    let isProcessingItemQueue = false;
    // We needed to decide between 1 and 2:
    // 1: shallowRef({}), with shallow copy every time a new item is added
    // records.value = {
    //     ...records.value,
    //     [pid]: item
    // };
    // The shallow copy is necessary in order to trigger reactivity because a (shallow?) ref does not
    // track deeper reactivity.
    // 2: reactive({})
    // After consideration: using ref([]) and shallowRef([]) means every time a record is added we first
    // need to check if it exists in the array already, which is another step that adds to the cost.
    // i.e. => use reactive.
    const recordItemsAll = reactive({});
    const recordItemsByClass = reactive({});

    // --------------------- //
    // Lifecycle/Vue methods //
    // --------------------- //
    onMounted(() => {
        rdfDS.addEventListener('recordsChanged', (e) => {
            enqueueChanges(e.detail.records);
        });
    });

    watch(isFetchingPage, (newVal) => {
        if (newVal) {
            // If fetching starts → show immediately
            if (hideTimeout) {
                clearTimeout(hideTimeout)
                hideTimeout = null
            }
            showFetchingPageLoader.value = true
        } else {
            // If fetching stops → wait before hiding
            hideTimeout = setTimeout(() => {
                showFetchingPageLoader.value = false
                hideTimeout = null
            }, 1000)
        }
    })

    watchEffect(async () => {
        // If we are using a backend service AND
        // there are a minimum amount of characters in the search field AND
        // and the first page has already been fetched for the current IRI and searchText AND
        // any of the configured service base URLs have unfetched pages for the current IRI AND searchText
        if (config.value?.use_service &&
            searchText.value && searchText.value.length >= configVarsMain.serviceConstrainedSearch.min_characters &&
            firstPageFetched(selectedIRI.value, searchText.value) &&
            hasUnfetchedPages(selectedIRI.value, searchText.value)) {
            // Only trigger fetch if not already fetching
            if (!isFetchingPage.value) {
                await fetchNextPage(selectedIRI.value, searchText.value);
            }
        }
    });

    watch(searchText, (newVal) => {
        // clear previous timers
        clearTimeout(debounceTypingTimer);

        // wait X ms after last keystroke
        debounceTypingTimer = setTimeout(() => {
            onTypingPause(newVal);
        }, configVarsMain.serviceConstrainedSearch.typing_debounce);
    });

    // -------------- //
    // Computed props //
    // -------------- //
    const showProgress = computed(() => {
        return searchText.value || headingHover.value
    })

    const currentProgress = computed(() => {
        if (fetchedItemCount.value == null) {
            return 0;
        }
        if (fetchedItemCount.value && totalItemCount.value) {
            if (totalItemCount.value == 0) {
                return 100;
            } else {
                return  Math.ceil(fetchedItemCount.value / totalItemCount.value * 100);
            }
        }
        if (fetchedItemCount.value && (totalItemCount.value == null || totalItemCount.value == 0 )) {
            return 100;
        }
    })

    const showScrollTopBtn = computed(() => {
        if (filteredRecordItemsByClass.value[selectedIRI.value]?.length > 7) return true;
        return false;
    });

    const fetchedItemCount = computed(() => {
        if (includeSubClasses.value && Array.isArray(allSubClasses[selectedIRI.value]) && allSubClasses[selectedIRI.value].length > 0 ) {
            let allclass_array = [selectedIRI.value].concat(allSubClasses[selectedIRI.value])
            let itemCount = 0;
            for (const cl of allclass_array) {
                if (recordItemsByClass[cl]) {
                    itemCount += Object.values(recordItemsByClass[cl]).length;
                }
            }
            return itemCount;
        }
        if (recordItemsByClass[selectedIRI.value]) {
            return Object.values(recordItemsByClass[selectedIRI.value]).length;
        }
        return null;
    });

    const filteredRecordItemsAll = computed(() => {
        let txt = searchText.value.toLowerCase().trim();
        if (txt.length == 0) return sortItems(Object.values(recordItemsAll))
        return sortItems(
            Object.values(recordItemsAll).filter((item) => {
                if (txt.length == 0) return true;
                if (!('_searchBlob' in item.props)) return false;
                return item.props._searchBlob.includes(txt);
            })
        )
    });

    const filteredRecordItemsByClass = computed(() => {
        let txt = searchText.value.toLowerCase().trim();
        const map = {};
        for (const cl of Object.keys(recordItemsByClass)) {
            map[cl] = sortItems(
                Object.values(recordItemsByClass[cl]).filter((item) => {
                    if (txt.length == 0) return true;
                    if (!('_searchBlob' in item.props)) return false;
                    if (textMatchType.value == 'exact') {
                        return searchableFields.some((field) => {
                            if (!(field in item.props)) return false;
                            const value = item.props[field]?.toString().toLowerCase().trim();
                            return value === txt;
                        });
                    } else {
                        return item.props._searchBlob.includes(txt);
                    }
                })
            )
        }
        return map
    });

    const filteredRecordItemsForClassWithSubclassItems = computed(() => {
        let items = [];
        if (!includeSubClasses.value) {
            return items;
        }
        if (Array.isArray(allSubClasses[selectedIRI.value]) && allSubClasses[selectedIRI.value].length > 0 ) {
            let allclass_array = [selectedIRI.value].concat(allSubClasses[selectedIRI.value])
            for (const cl of allclass_array) {
                if (filteredRecordItemsByClass.value[cl]) {
                    items = items.concat(filteredRecordItemsByClass.value[cl])
                }
            
            }
        }
        return sortItems(items)
    });

    // --------- //
    // Functions //
    // --------- //

    // fetch new items at bottom of scroller
    function onScrollEnd() {
        debouncedScrollEnd(selectedIRI.value);
    }

    const debouncedScrollEnd = debounce(async (classIRI) => {
        // Only fetch new items at bottom of scroller if there is not any search text
        // Continued fetching of more items while there is search text will be handled
        // by the watcheffect function.
        if (searchText.value) {
            return
        }
        if (config.value.use_service) {
            if (hasUnfetchedPages(classIRI) && !isFetchingPage.value) {
                await fetchNextPage(classIRI);
            } else {
                console.log(`Last page already fetched: ${classIRI}`)
            }
        }
    }, 1000);

    function onUserTyping () {
        if (textMatchType.value !== 'partial') {
            textMatchType.value = 'partial'
        }
    }

    async function onTypingPause(textVal) {
        if (!searchText.value || searchText.value.length < configVarsMain.serviceConstrainedSearch.min_characters ) return;
        await fetchNextPage(selectedIRI.value, searchText.value);
    }
    // User types, debounce effect monitors pauses and waits for configured time
    // before making the first constrained request.

    // After that, watcheffect checks that there is a minimum amount of characters
    // and that the first request has already been made for the current IRI and
    // matching parameter. If true, it will continue to fetch next pages for the
    // constrained request until finished.

    // Only fetch new items at bottom of scroller if there is not any search text
    // Continued fetching of more items while there is search text is handled by
    // the watcheffect function.

    async function fetchNextPage(classIRI, matchText='') {
        if (isFetchingPage.value || !hasUnfetchedPages(classIRI, matchText)) return;
        isFetchingPage.value = true;
        try {
            const result = await fetchFromService(
                'get-paginated-records-constrained',
                classIRI,
                allPrefixes,
                matchText
            );
            if (result.status === null) {
                console.error(result.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            isFetchingPage.value = false;
        }
    }

    function getSortValue(item) {
        for (const field of searchableFields) {
            const value = item.props[field];
            if (value) return value.toString().toLowerCase().trim();
        }
        return null;
    }

    function sortItems(arr) {
        const c = orderTopDown.value ? 1 : -1;
        return arr.sort((a, b) => {
            const aVal = getSortValue(a);
            const bVal = getSortValue(b);
            // if both are missing labels, consider them equal
            if (!aVal && !bVal) return 0;
            // if only a is missing, a goes first
            if (!aVal) return -1 * c;
            // if only b is missing, b goes first
            if (!bVal) return 1 * c;
            // otherwise compare alphabetically
            return c * aVal.localeCompare(bVal);
        })
    }

    function enqueueChanges(records) {
        for (const r of records) {
            itemQueue.add(r);
        }
        processQueue();
    }

    async function processQueue() {
        if (isProcessingItemQueue) return;
        isProcessingItemQueue = true;
        while (itemQueue.size > 0) {
            // take a batch
            const batch = Array.from(itemQueue).slice(0, 10);
            batch.forEach((record) =>{
                itemQueue.delete(record)
                updateRecordItem(record)
            });
            // yield to UI thread
            await nextTick();
        }
        isProcessingItemQueue = false;
    }

    function updateRecordItem(record) {
        // This function does not care if a record item already exists in the 
        // object; it builds the item and adds it nevertheless.
        // First we get the record's quad
        let mainQuad = getPidQuad(record, rdfDS.data.graph);
        if (!mainQuad) {
            console.log(`No PID quad found in graph for record: ${record}; skipping update of this item`)
            return
        }
        let recordClass = mainQuad.object.value;
        // Now get related quads
        var relatedTrips = rdfDS.getSubjectTriples(mainQuad.subject);
        // Initialize item
        var item = {
            title: record,
            value: record,
            props: {
                subtitle: recordClass,
                quad: mainQuad,
                itemValue: record,
            },                
        };
        let labelTemplate = hasConfigDisplayLabel(recordClass, allPrefixes, configVarsMain)
        let labelParts = {}
        relatedTrips.forEach((quad) => {
            if (!Object.hasOwn(item.props, quad.predicate.value)) {
                item.props[quad.predicate.value] = [];
            }
            if (quad.object.termType === 'BlankNode') {
                var bnItem = {};
                var blankNodeTrips = rdfDS.getSubjectTriples(quad.object);
                blankNodeTrips.forEach((bnquad) => {
                    bnItem[bnquad.predicate.value] = bnquad.object.value;
                });
                item.props[quad.predicate.value].push(bnItem);
            } else {
                item.props[quad.predicate.value].push(quad.object.value);
            }
            let predCuri = toCURIE(quad.predicate.value, allPrefixes)
            // If current predicate is used for display label generation, store it
            if ( labelTemplate && labelTemplate.includes(predCuri)) {
                if (!labelParts[predCuri]) {
                    labelParts[predCuri] = []
                }
                labelParts[predCuri].push(quad.object.value)
            }
        });
        item.props._prefLabel = '';
        if (item.props.hasOwnProperty(SKOS.prefLabel.value)) {
            item.props._prefLabel = item.props[SKOS.prefLabel.value][0];
        }
        // Generate display label if possible
        item.props._displayLabel = '';
        if (labelTemplate) {
            let displayLabel = getConfigDisplayLabel(labelTemplate, labelParts, configVarsMain, rdfDS, allPrefixes)
            if (displayLabel) {
                item.props._displayLabel = displayLabel;
            }
        }
        // Now put together single searchable blob
        item.props._searchBlob = ''
        for (const field of searchableFields) {
            if (!(field in item.props)) continue;
            let value = item.props[field]?.toString().toLowerCase().trim();
            if (!Array.isArray(value)) {
                value = [value]
            }
            for (const v of value) {
                item.props._searchBlob = item.props._searchBlob + v
            }
        }
        // Now that we have the complete item, we can add it to the tracking objects
        // Class records tracker
        if (!recordItemsByClass.hasOwnProperty(recordClass)) {
            recordItemsByClass[recordClass] = {};
        }
        recordItemsByClass[recordClass][record] = item;
        // All records tracker
        recordItemsAll[record] = item;
    }

    // ------- //
    // Returns //
    // ------- //
    return {
        classRecordsLoading,
        currentProgress,
        fetchedItemCount,
        fetchNextPage,
        headingHover,
        includedClasses,
        includeSubClasses,
        isFetchingPage,
        onScrollEnd,
        onUserTyping,
        orderTopDown,
        searchText,
        showFetchingPageLoader,
        showProgress,
        showScrollTopBtn,
        textMatchType,
        totalItemCount,
        recordItemsByClass,
        filteredRecordItemsAll,
        filteredRecordItemsByClass,
        filteredRecordItemsForClassWithSubclassItems,
    };
}