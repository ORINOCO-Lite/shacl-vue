
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
        // search is not compatible with pid or edit
        const search_string = qparams.get('search');
        // set token first, if provided
        if (token) {
            setToken(token, 'url');
        }
        // If only pid provided, we need to derive the nodeshape
        // whenever pid is provided, we ignore search
        // if edit also provided, edit record
        if (instance_pid && !nodeShape) {
            console.log(`pid in queryparams (and no nodeshape): ${instance_pid}`)
            let instanceIRI = toIRI(instance_pid, allPrefixes);
            console.log(`instanceIRI: ${instanceIRI}`)
            if (instanceIRI) {
                const results = await fetchFromService(
                    'get-record',
                    instanceIRI,
                    allPrefixes
                );
                let pidQ = getPidQuad(instanceIRI, rdfDS.data.graph)
                let targetClass = null;
                let instanceObject = null;
                // If we cannot get the target class, we need to use the default configured search class
                // (if that is an included/allowed class based on other config options, and if it is specified)
                // For now we assume that it is specified. We show console error if not.
                if (pidQ) {
                    targetClass = pidQ.object.value;
                    instanceObject = {
                        value: instanceIRI,
                        quad: pidQ
                    }
                } else {
                    targetClass = toIRI(configVarsMain.defaultSearchClass, allPrefixes);
                }
                if (!targetClass) {
                    console.error(`class cannot be found (nor default search class) for provided pid: ${instanceIRI} `)
                    history.replaceState(null, '', window.location.pathname);
                }
                if (!(includeClass(targetClass, configVarsMain, allPrefixes) ||
                    includePriorityClass(targetClass, configVarsMain, allPrefixes)
                )) {
                    console.error(`provided pid record is of class that is configured to be excluded: ${instanceIRI} `)
                    history.replaceState(null, '', window.location.pathname);
                }
                await selectType(targetClass, false, false, includeSubs(targetClass));
                textMatchType.value = 'exact';
                searchText.value = instanceIRI;
                updateURL(targetClass, false, instanceIRI, allPrefixes)

                if (edit) {
                    editInstanceItem(instanceObject)
                }
            } else {
                console.error(`Unresolvable PID queryparams: ${instance_pid} `);
            }
            return
        }

        // If nodeshape is provided:
        // - if only nodeshape, navigate to class page (if class is included/allowed)
        // - if also pid, fetch record and show that record
        // - if edit (pid => edit record; no pid => add new record)
        if (nodeShape) {
            console.log(`Nodeshape in queryparams: ${nodeShape}`);
            // this could be a curie or iri, convert to iri
            var nodeShapeIRI = toIRI(nodeShape, allPrefixes);
            if (shapesDS.data.nodeShapes[nodeShapeIRI]) {
                if (includeClass(nodeShapeIRI, configVarsMain, allPrefixes) ||
                    includePriorityClass(nodeShapeIRI, configVarsMain, allPrefixes)
                ) {
                    await selectType(nodeShapeIRI, false, false, includeSubs(nodeShapeIRI));
                    var instanceIRI = null;
                    if (instance_pid) {
                        console.log(`pid in queryparams: ${instance_pid}`)
                        instanceIRI = toIRI(instance_pid, allPrefixes);
                        console.log(`instanceIRI: ${instanceIRI}`)
                        if (instanceIRI) {
                            const results = await fetchFromService(
                                'get-record',
                                instanceIRI,
                                allPrefixes
                            );
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
                    if (search_string && !instance_pid) {
                        textMatchType.value = 'partial';
                        searchText.value = search_string;
                        updateURL(nodeShapeIRI, false, null, allPrefixes);
                    }
                } else {
                    console.log('Queried nodeshape found in shacl schema, but show/hide-config options specify that it should be hidden');
                    history.replaceState(null, '', window.location.pathname);
                }
            } else {
                console.log('Queried nodeshape not found in shacl schema');
                history.replaceState(null, '', window.location.pathname);
            }
        } else {
            console.log('NO nodeshape in query params');
            // here we can only handle search using the default search class
            if (search_string) {
                let searchClass = toIRI(configVarsMain.defaultSearchClass, allPrefixes);
                if (searchClass) {
                    await selectType(searchClass, false, false, includeSubs(searchClass));
                    textMatchType.value = 'partial';
                    searchText.value = search_string;
                }
            }
        }
    }

    function includeSubs(nodeShapeIRI) {
        if (configVarsMain.priorityClasses?.length) {
            var inst = findObjectByKey(configVarsMain.priorityClasses, 'class', toCURIE(nodeShapeIRI, allPrefixes));
            if (inst && inst.include_subclasses) {
                return true
            }
        }
        return false
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