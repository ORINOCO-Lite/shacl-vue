// useRecords.js
/*
This composable is meant to be used only by the main ShaclVue component
It returns refs and functions that are then provided to other components
in the hierarchy via props (or provide/inject), and as arguments to other
composables.

It contains all functionality related to the display and interactions of
records on the main page.
*/

import { ref, computed, watch, watchEffect} from 'vue';
import { debounce } from 'lodash-es';
import { RDF, SKOS } from '@/modules/namespaces';
import {
    getConfigDisplayLabel,
    hasConfigDisplayLabel,
    toCURIE,
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
    const showScrollTopBtn = ref(false);
    const showFetchingPageLoader = ref(false)
    const searchText = ref('');
    const textMatchType = ref('partial');
    const instanceItemsComp = ref([]);
    const newTypeSelected = ref(false);
    const itemsTrigger = ref(false);
    const fetchedItemCount = ref(null)
    const classRecordsLoading = ref(false);
    const headingHover = ref(false);
    const orderTopDown = ref(true);
    const includeSubClasses = ref(false);
    let hideTimeout = null
    let debounceTypingTimer = null;

    // --------------------- //
    // Lifecycle/Vue methods //
    // --------------------- //
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

    watch(
        instanceItemsComp,
        (newVal, oldVal) => {
            if (newTypeSelected.value) {
                newTypeSelected.value = false;
                return;
            }
            if (classRecordsLoading.value) {
                classRecordsLoading.value = false;
            }
        },
        { deep: true }
    );

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
                await fetchNextPage(searchText.value);
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
    // regenerate list if the graph data is updated
    const debouncedUpdate = debounce(() => {
        if (openForms.length == 0) {
            getInstanceItems();
        }
    }, 500);
    watch(() => rdfDS.data.graphChanged, debouncedUpdate, { deep: true });

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
    
    const filteredInstanceItemsComp = computed(() => {
        let txt = searchText.value.toLowerCase().trim();
        return sortItems(
            [...instanceItemsComp.value].filter((item) => {
                if (txt.length == 0) return true;
                return searchableFields.some((field) => {
                    if (!(field in item.props)) return false;
                    const value = item.props[field]?.toString().toLowerCase().trim();
                    if (Array.isArray(value)) {
                        return value.some((val) => {
                            return val.includes(txt);
                        })
                    } else {
                        return value.includes(txt);
                    }
                });
            })
        )
    });

    const matchedInstanceItemsComp = computed(() => {
        let txt = searchText.value.toLowerCase().trim();
        return sortItems(
            [...instanceItemsComp.value].filter((item) => {
                if (txt.length == 0) return true;
                return searchableFields.some((field) => {
                    if (!(field in item.props)) return false;
                    const value = item.props[field]?.toString().toLowerCase().trim();
                    return value === txt;
                });
            })
        )
    });
    
    // --------- //
    // Functions //
    // --------- //

    // fetch new items at bottom of scroller
    function onScrollEnd() {
        debouncedScrollEnd();
    }

    const debouncedScrollEnd = debounce(async () => {
        // Only fetch new items at bottom of scroller if there is not any search text
        // Continued fetching of more items while there is search text will be handled
        // by the watcheffect function.
        if (searchText.value) {
            return
        }

        if (config.value.use_service) {
            if (hasUnfetchedPages(selectedIRI.value) && !isFetchingPage.value) {
                await fetchNextPage();
            } else {
                console.log("Last page already fetched")
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
        await fetchNextPage(searchText.value);
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

    async function fetchNextPage(matchText='') {
        if (isFetchingPage.value || !hasUnfetchedPages(selectedIRI.value, matchText)) return;
        isFetchingPage.value = true;
        try {
            const result = await fetchFromService(
                'get-paginated-records-constrained',
                selectedIRI.value,
                allPrefixes,
                matchText
            );
            if (result.status === null) {
                console.error(result.error);
            }
            getInstanceItems(); // rebuild local list of items
        } catch (err) {
            console.error(err);
        } finally {
            isFetchingPage.value = false;
        }
    }

    function getInstanceItems() {
        // ---
        // The goal of this method is to populate the list of data objects of the selected type
        // ---
        var x = itemsTrigger.value;
        if (!selectedIRI.value) {
            return [];
        }
        // find nodes with triple predicate == rdf:type, and triple object == the selected class
        // if the class is a configured priority class with include_subclasses = true, find nodes
        // for the selected class and all of its subclasses
        var quads;
        if (includeSubClasses.value) {
            let allclass_array = [selectedIRI.value]
            if (Array.isArray(allSubClasses[selectedIRI.value]) && allSubClasses[selectedIRI.value].length > 0 ) {
                allclass_array = allclass_array.concat(allSubClasses[selectedIRI.value])
            }
            quads = [];
            for (const cl of allclass_array) {
                const mySubArray = rdfDS.getLiteralAndNamedNodes(
                    namedNode(RDF.type.value),
                    cl,
                    allPrefixes
                )
                quads = quads.concat(mySubArray);
            }
        } else {
            quads = rdfDS.getLiteralAndNamedNodes(
                namedNode(RDF.type.value),
                selectedIRI.value,
                allPrefixes
            );
        }
        // Create list items from quads
        var instanceItemsArr = [];
        quads.forEach((quad) => {
            var extra = '';
            if (quad.subject.termType === 'BlankNode') {
                extra = ' (BlankNode)';
            }
            var relatedTrips = rdfDS.getSubjectTriples(quad.subject);
            var item = {
                title: quad.subject.value + extra,
                value: quad.subject.value,
                props: {
                    subtitle: quad.object.value,
                    quad: quad,
                    itemValue: quad.subject.value,
                },                
            };
            let labelTemplate = hasConfigDisplayLabel(quad.object.value, allPrefixes, configVarsMain)
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
            instanceItemsArr.push(item);
        });
        instanceItemsComp.value = [...instanceItemsArr];
        if (instanceItemsComp.value.length > 7) showScrollTopBtn.value = true;
        fetchedItemCount.value = instanceItemsComp.value.length;
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

    // ------- //
    // Returns //
    // ------- //
    return {
        classRecordsLoading,
        currentProgress,
        fetchedItemCount,
        filteredInstanceItemsComp,
        getInstanceItems,
        headingHover,
        includeSubClasses,
        instanceItemsComp,
        isFetchingPage,
        matchedInstanceItemsComp,
        newTypeSelected,
        onScrollEnd,
        onUserTyping,
        orderTopDown,
        searchText,
        showFetchingPageLoader,
        showProgress,
        showScrollTopBtn,
        textMatchType,
        totalItemCount,
    };
}