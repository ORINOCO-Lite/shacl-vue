// useSubmit.js
/*
This composable is meant to be used only by the main ShaclVue component
It returns refs and functions that are then provided to other components
in the hierarchy via provide/inject.
*/

import { ref, watch} from "vue";

export function useSubmit(nodesToSubmit) {
    // ---- //
    // Data //
    // ---- //
    const tokenWarning = ref(false);
    const submitWarning = ref(false);
    const submitButtonPressed = ref(false);
    const noSubmitDialog = ref(false);
    const submitDialog = ref(false);

    // --------------------- //
    // Lifecycle/Vue methods //
    // --------------------- //
    // When user clicks the submit button
    watch(
        submitButtonPressed,
        (newValue) => {
            if (newValue) {
                if (nodesToSubmit.value.length == 0) {
                    noSubmitDialog.value = true;
                    submitDialog.value = false;
                } else {
                    submitDialog.value = true;
                    noSubmitDialog.value = false;
                }
                submitButtonPressed.value = false;
            }
        },
        { immediate: true }
    );

    // --------- //
    // Functions //
    // --------- //
    function submitFn() {
        submitButtonPressed.value = true;
    }

    // ------- //
    // Returns //
    // ------- //
    return {
        noSubmitDialog,
        submitButtonPressed,
        submitDialog,
        submitFn,
        submitWarning,
        tokenWarning,
    };
}