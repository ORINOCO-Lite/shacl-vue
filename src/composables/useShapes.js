/**
 * @module shapedata.js
 * @description This composable reads a ttl file with shacl shapes and returns
 * a set of reactive variables used by the root application component
 */
import { reactive, toRaw, ref} from 'vue';
import { ShapesDataset } from 'shacl-tulip';
import { findObjectByKey, toIRI, toCURIE, getDisplayName, includeClass} from '@/modules/utils'
import { SHACL, RDFS} from '@/modules/namespaces';

const basePath = import.meta.env.BASE_URL || '/';

export function useShapes(config) {
    // ---- //
    // Data //
    // ---- //
    const defaultURL = `${basePath}dlschemas_shacl.ttl`;
    const shapesDS = new ShapesDataset(reactive({}));
    // These are all arays of classes that are eventually represented in the
    // main class-selection pane in the ShaclVue* components
    const idFilteredNodeShapeNames = ref([]);
    const noEditClassList = ref([]);
    const filteredNodeShapeNames = ref([]);
    const priorityFilteredNodeShapeNames = ref([]);
    const orderedNodeShapeNames = ref([]);
    const allClassItems = ref([]);

    // ----------------- //
    // Lifecycle methods //
    // ----------------- //

    // --------- //
    // Functions //
    // --------- //
    async function getSHACLschema(url) {
        const shapesURL = config.value.shapes_url
            ? config.value.shapes_url
            : defaultURL;
        const getURL = url ? url : shapesURL;
        await shapesDS.loadRDF(getURL);
    }

    function updateShapes(configShapes, allPrefixes) {
        // Then we update dedicated shapes:
        for (const key of Object.keys(configShapes)) {
            updateNodeShape(key, configShapes[key], allPrefixes)
        }
    }
    
    function updateNodeShape(newShapeIRI, newShapeObj, allPrefixes) {
        const targetNodeShapeIRI = toIRI(newShapeIRI, allPrefixes)
        const targetNodeShapeProperties = shapesDS.data.nodeShapes[targetNodeShapeIRI]['properties']
        for (const key of Object.keys(newShapeObj)) {
            const keyIRI = toIRI(key, allPrefixes)
            const value = newShapeObj[key];
            if (keyIRI == SHACL.property.value) {
                // if the key is "sh:property", we have to find the correct propertyShape per property
                for (const prop of Object.keys(value)) {
                    const pathIRI = toIRI(prop, allPrefixes)
                    const propVal = value[prop]
                    // console.log(`have to find property shape in array, where path `)
                    const targetPropertyShape = findObjectByKey(targetNodeShapeProperties, SHACL.path.value, pathIRI)
                    if (targetPropertyShape) {
                        // update existing property shape with all new key-value pairs
                        updatePropertyShape(targetPropertyShape, propVal, allPrefixes)
                    } else {
                        // create new property shape object, by copying
                        const newPropShape = toRaw(propVal);
                        for (const key of Object.keys(newPropShape)) {
                            // cast boolean as string
                            if (typeof newPropShape[key] == "boolean") {
                                newPropShape[key] = `${newPropShape[key]}`
                            }
                        }
                        // add path, because it is likely not specified from config (since it's not required)
                        newPropShape[SHACL.path.value] = pathIRI;
                        targetNodeShapeProperties.push(newPropShape)
                    }
                }
            } else {
                // Assign value on the nodeShape key, as is (i.e. no validation of the value => could be problematic)
                shapesDS.data.nodeShapes[targetNodeShapeIRI][keyIRI] = value;
            }
        }
    }

    function updatePropertyShape(targetPropertyShape, updateObject, allPrefixes) {
        // update existing property shape with all new key-value pairs
        for (const key of Object.keys(updateObject)) {
            const val = updateObject[key]
            const keyIRI = toIRI(key, allPrefixes);
            if (val === null) {
                delete targetPropertyShape[keyIRI]
            }
            if (typeof val == "boolean") {
                // variable is a boolean, need to write as string to prevent value errors down the line
                // this is because loading the boolean variable from shacl into javascript also casts it as a string
                targetPropertyShape[keyIRI] = `${val}`
            } else if (typeof val == "string") {
                targetPropertyShape[keyIRI] = toIRI(val, allPrefixes)
            } else {
                targetPropertyShape[keyIRI] = val
            }
        }
    }
    
    function updateShapesFromDefault(allPropertyShapes, allPrefixes) {
        for (const targetNodeShapeIRI of Object.keys(toRaw(shapesDS.data.nodeShapes))) {
            const targetNodeShapeProperties = shapesDS.data.nodeShapes[targetNodeShapeIRI]['properties']
            for (const slot of Object.keys(allPropertyShapes)) {
                const pathIRI = toIRI(slot, allPrefixes)
                const defaultValues = allPropertyShapes[slot]
                const targetPropertyShape = findObjectByKey(targetNodeShapeProperties, SHACL.path.value, pathIRI)
                if (targetPropertyShape) {
                    // update existing property shape with all new key-value pairs
                    updatePropertyShape(targetPropertyShape, defaultValues, allPrefixes)
                }
                // If the associated property shape is not in the node shape, we should not add it here
                // because we should not create new fields, just set default value for existing fields
            }
        }
    }

    function updatePropertyGroups(propertyGroups) {
        var high_order;
        for (const group of Object.keys(propertyGroups)) {
            const newGroup = {};
            if (propertyGroups[group].title) newGroup[RDFS.label.value] = propertyGroups[group].title;
            if (propertyGroups[group].order) newGroup[SHACL.order.value] = propertyGroups[group].order;
            if (propertyGroups[group].description) newGroup[RDFS.comment.value] = propertyGroups[group].description;
            shapesDS.data.propertyGroups[group] = newGroup;
            if (!high_order) {
                if (propertyGroups[group].order) high_order = propertyGroups[group].order;
            } else {
                if (propertyGroups[group].order && propertyGroups[group].order > high_order) {
                    high_order = propertyGroups[group].order;
                }
            }
        }
        // Add "Additional properties" group, i.e. default
        shapesDS.data.propertyGroups['_default'] = {};
        shapesDS.data.propertyGroups['_default'][RDFS.label.value] = "Additional properties";
        shapesDS.data.propertyGroups['_default'][SHACL.order.value] = high_order + 100;
    }
    
    const getIdFilteredNodeShapeNames = ((configVarsMain, ID_IRI) => {
        if (configVarsMain.showShapesWoId === true) {
            return shapesDS.data.nodeShapeNamesArray;
        }
        var shapeNames = [];
        for (var n of shapesDS.data.nodeShapeNamesArray) {
            if (
                findObjectByKey(
                    shapesDS.data.nodeShapes[shapesDS.data.nodeShapeNames[n]].properties,
                    SHACL.path.value,
                    ID_IRI.value
                )
            ) {
                shapeNames.push(n);
            }
        }
        return shapeNames;
    });

    const getNoEditClassList = ((configVarsMain, allPrefixes) => {
        if (configVarsMain.noEditClasses?.length == 0) return []
        var names = idFilteredNodeShapeNames.value;
        var shapeNames = [];
        for (var n of names) {
            // First get IRI and prefix
            var n_iri = shapesDS.data.nodeShapeNames[n]
            if (includeClass(n_iri, configVarsMain, allPrefixes) &&
                configVarsMain.noEditClasses?.indexOf(toCURIE(n_iri, allPrefixes)) >= 0) {
                shapeNames.push(n);
            }
        }
        return shapeNames.sort((a, b) =>
            getDisplayName(
                shapesDS.data.nodeShapeNames[a],
                configVarsMain,
                allPrefixes,
                shapesDS.data.nodeShapes[shapesDS.data.nodeShapeNames[a]]
            ).toLowerCase()
            .localeCompare(
                getDisplayName(
                    shapesDS.data.nodeShapeNames[b],
                    configVarsMain,
                    allPrefixes,
                    shapesDS.data.nodeShapes[shapesDS.data.nodeShapeNames[b]]
                ).toLowerCase()
            )
        );
    });
    
    const getFilteredNodeShapeNames = ((configVarsMain, allPrefixes) => {
        var names = idFilteredNodeShapeNames.value;
        // If all relevant config arrays are empty, show all classes
        if (
            configVarsMain.showClasses?.length == 0 &&
            configVarsMain.showClassesWithPrefix?.length == 0 &&
            configVarsMain.hideClasses?.length == 0 &&
            configVarsMain.hideClassesWithPrefix?.length == 0 &&
            configVarsMain.noEditClasses?.length == 0
        ) {
            return names;
        }
        var shapeNames = [];
        for (var n of names) {
            // First get IRI and prefix
            var n_iri = shapesDS.data.nodeShapeNames[n]
            if (includeClass(n_iri, configVarsMain, allPrefixes) && configVarsMain.noEditClasses.indexOf(toCURIE(n_iri, allPrefixes)) < 0) {
                shapeNames.push(n);
            }
        }
        return shapeNames;
    });
    
    const getPriorityFilteredNodeShapeNames = ((priorityClassList) => {
        var names = filteredNodeShapeNames.value;
        var shapeNames = [];
        for (var n of names) {
            var n_iri = shapesDS.data.nodeShapeNames[n]
            if (!priorityClassList.value.includes(n_iri)) {
                shapeNames.push(n);
            }
        }
        return shapeNames;
    })
    
    const getOrderedNodeShapeNames = ((configVarsMain, allPrefixes) => {
        return priorityFilteredNodeShapeNames.value.sort((a, b) =>
            getDisplayName(
                shapesDS.data.nodeShapeNames[a],
                configVarsMain,
                allPrefixes,
                shapesDS.data.nodeShapes[shapesDS.data.nodeShapeNames[a]]
            ).toLowerCase()
            .localeCompare(
                getDisplayName(
                    shapesDS.data.nodeShapeNames[b],
                    configVarsMain,
                    allPrefixes,
                    shapesDS.data.nodeShapes[shapesDS.data.nodeShapeNames[b]]
                ).toLowerCase()
            )
        );
    })
    
    const getAllClassItems = ((configVarsMain, allPrefixes, getClassIcon) => {
        let items = [];
        for (const node of orderedNodeShapeNames.value) {
            const classIRI = shapesDS.data.nodeShapeNames[node];
            const displayName = getDisplayName(
                classIRI,
                configVarsMain,
                allPrefixes,
                shapesDS.data.nodeShapes[classIRI]
            );
            const description = shapesDS.data.nodeShapes[classIRI][RDFS.comment.value];
            items.push(
                {
                    title: displayName,
                    value: classIRI,
                    props: {
                        title: displayName,
                        iri: classIRI,
                        subtitle: toCURIE(classIRI, allPrefixes),
                        icon: getClassIcon(classIRI),
                        description: description,
                        totalItemCount: null,
                    },                
                }
            )
        }
        return items;
    })

    // ------- //
    // Returns //
    // ------- //
    return {
        shapesDS,
        getSHACLschema,
        updateShapesFromDefault,
        updateShapes,
        updatePropertyGroups,
        idFilteredNodeShapeNames,
        noEditClassList,
        filteredNodeShapeNames,
        priorityFilteredNodeShapeNames,
        orderedNodeShapeNames,
        allClassItems,
        getIdFilteredNodeShapeNames,
        getNoEditClassList,
        getFilteredNodeShapeNames,
        getPriorityFilteredNodeShapeNames,
        getOrderedNodeShapeNames,
        getAllClassItems,
    };
}
