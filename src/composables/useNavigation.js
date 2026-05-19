
import { findObjectByKey, getPidQuad, includeClass, includePriorityClass, toCURIE, toIRI} from '@/modules/utils';

export function useNavigation(
    addInstanceItem,
    allPrefixes,
    configVarsMain,
    editInstanceItem,
    fetchFromService,
    internalHistory,
    rdfDS,
    searchText,
    selectedItem,
    selectType,
    setToken,
    shapesDS,
    textMatchType,
) {
    // --------- //
    // Functions //
    // --------- //

    function getQueryParams() {
        const url = new URL(window.location);
        return url.searchParams;
    }

    async function setViewFromQuery() {
        const qparams = getQueryParams();
        const nodeShape = qparams.get('sh:NodeShape');
        const instance_pid = qparams.get('pid');
        const token = qparams.get('token');
        const edit = qparams.get('edit');

        if (token) {
            setToken(token);
        }

        if (nodeShape) {
            console.log(`Nodeshape in queryparams: ${nodeShape}`);
            // this could be a curie or iri
            // check if iri is in
            var nodeShapeIRI = toIRI(nodeShape, allPrefixes);
            if (shapesDS.data.nodeShapes[nodeShapeIRI]) {
                if (includeClass(nodeShapeIRI, configVarsMain, allPrefixes) ||
                    includePriorityClass(nodeShapeIRI, configVarsMain, allPrefixes)
                ) {
                    var includeSubs = false;
                    if (configVarsMain.priorityClasses?.length) {
                        var inst = findObjectByKey(configVarsMain.priorityClasses, 'class', toCURIE(nodeShapeIRI, allPrefixes));
                        if (inst && inst.include_subclasses) {
                            includeSubs = true;
                        }
                    }
                    await selectType(nodeShapeIRI, false, false, includeSubs);
                    var instanceIRI = null;
                    if (instance_pid) {
                        instanceIRI = toIRI(instance_pid, allPrefixes);
                        if (instanceIRI) {
                            const results = await fetchFromService(
                                'get-record',
                                instanceIRI,
                                allPrefixes
                            );
                            // queried_pid.value = instanceIRI;
                            textMatchType.value = 'exact';
                            searchText.value = instanceIRI;
                            updateURL(nodeShapeIRI, false, instanceIRI, allPrefixes)
                        } else {
                            updateURL(nodeShapeIRI, false, null, allPrefixes)
                            console.error(`Unresolvable PID queryparams: ${instance_pid} `);
                        }
                    }
                    // If edit AND if instance_pid, then we should:
                    // - create object 'instance'
                    // - set instance.value = instanceIRI
                    // - get the instance quad with instance_pid as subject -> set instance.quad
                    // - call editInstanceItem(instance)
                    // If edit AND NOT instance_pid, just open the empty form
                    if (edit) {
                        if (configVarsMain.noEditClasses.indexOf(toCURIE(nodeShapeIRI, allPrefixes)) >= 0) {
                            updateURL(nodeShapeIRI, false, null, allPrefixes)
                        } else {
                            if (instanceIRI) {
                                let instObject = {
                                    value: instanceIRI,
                                    quad: getPidQuad(instanceIRI, rdfDS.data.graph)
                                }
                                editInstanceItem(instObject)
                            } else {
                                addInstanceItem(nodeShapeIRI);
                                updateURL(nodeShapeIRI, true, null, allPrefixes);
                            }
                        }
                    }
                }
                else {
                    console.log('Queried nodeshape found in shacl schema, but show/hide-config options specify that it should be hidden');
                    history.replaceState(null, '', window.location.pathname);
                }
            } else {
                console.log('Queried nodeshape not found in shacl schema');
                history.replaceState(null, '', window.location.pathname);
            }
        } else {
            console.log('NO nodeshape in query params');
        }
    }

    function updateURL(IRI, edit, pid, allPrefixes) {
        var curie = toCURIE(IRI, allPrefixes);
        var queryParams = `?${encodeURIComponent('sh:NodeShape')}=${encodeURIComponent(curie)}`;
        if (pid) {
            queryParams += `&pid=${encodeURIComponent(pid)}`;
        }
        if (edit) {
            queryParams += '&edit=true';
        }
        history.replaceState(null, '', window.location.pathname + queryParams);
    }

    async function handleInternalNavigation({ recordClass, recordPID }) {
        await selectType(recordClass, true, false, false);
        selectedItem.value = [recordClass];
        textMatchType.value = 'exact';
        searchText.value = recordPID;
    }

    function goBack() {
        var previousView = internalHistory.value.pop();
        selectType(previousView.iri, true, true, previousView.includeSubs);
        searchText.value = previousView.searchText;
    }

    // ------- //
    // Returns //
    // ------- //
    return {
        goBack,
        handleInternalNavigation,
        setViewFromQuery,
        updateURL,
    };
}