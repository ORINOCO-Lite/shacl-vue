// useSubmit.js
/*
This composable is meant to be used only by the main ShaclVue component
It returns refs and functions that are then provided to other components
in the hierarchy via provide/inject.

How it works:
- submitButtonPressed is set to true when a user hits the submit button
- the watcher will check for this event and will then check whether there are nodes to be submitted
- if there aren't any, the noSubmitDialog ref is set to true, which will trigger the display of
  a dialog in the ShaclVue component that tells the user there is nothing to submit
- if there are nodes to submit, the the submitDialog ref is set to true, which will trigger the display
  of a dialog that instantiates the SubmitComp component, from within ShaclVue.
- 
*/

import { ref, watch} from "vue";

export function useSubmit(nodesToSubmit) {
    // ---- //
    // Data //
    // ---- //
    const tokenWarning = ref(false);
    const submitWarning = ref(false);
    const submissionDrawer = ref(false);
    const selectedNodesToSubmit = ref([]);

    // --------------------- //
    // Lifecycle/Vue methods //
    // --------------------- //
    // When user clicks the submit button
    watch(submissionDrawer, (newValue) => {
        if (newValue && nodesToSubmit.value.length) {
            let sNodes = new Set();
            for (var n of nodesToSubmit.value) {
                sNodes.add(n.node_iri);
            }
            selectedNodesToSubmit.value = Array.from(sNodes)
        }
    },{ immediate: true });

    // --------- //
    // Functions //
    // --------- //
    function submitFn() {
        submissionDrawer.value = !submissionDrawer.value;
    }

    // ------- //
    // Returns //
    // ------- //
    return {
        selectedNodesToSubmit,
        submissionDrawer,
        submitFn,
        submitWarning,
        tokenWarning,
    };
}