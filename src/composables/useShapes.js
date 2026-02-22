/**
 * @module shapedata.js
 * @description This composable reads a ttl file with shacl shapes and returns
 * a set of reactive variables used by the root application component
 */
import { reactive, toRaw} from 'vue';
import { ShapesDataset } from 'shacl-tulip';
import { findObjectByKey, toIRI } from '@/modules/utils'
import { SHACL, RDFS} from '@/modules/namespaces';

const basePath = import.meta.env.BASE_URL || '/';

export function useShapes(config) {
    // ---- //
    // Data //
    // ---- //
    const defaultURL = `${basePath}dlschemas_shacl.ttl`;
    const shapesDS = new ShapesDataset(reactive({}));

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

    // ------- //
    // Returns //
    // ------- //
    return {
        shapesDS,
        getSHACLschema,
        updateShapesFromDefault,
        updateShapes,
        updatePropertyGroups,
    };
}
