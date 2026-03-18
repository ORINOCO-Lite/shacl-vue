import { SHACL, RDFS, RDF, DLTHINGS, SKOS } from '../modules/namespaces';
import { toCURIE, toIRI } from 'shacl-tulip';
import { DataFactory, Writer } from 'n3';
import { toRaw } from 'vue';
const { namedNode, blankNode} = DataFactory;

export { toCURIE, toIRI } from 'shacl-tulip';

export function isAbsoluteIRI(str) {
    if (!str) return false
    return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(str)
}

export function isCURIE(str, prefixes, return_parts=false) {
    if (!str || !prefixes) return false
    const match = str.match(/^([^:]+):(.+)$/)
    if (!match) return false
    const prefix = match[1]
    const reference = match[2]
    // Must be a known prefix
    if (!(prefix in prefixes)) return false
    // Prevent matching full IRIs like http://...
    if (reference.startsWith('//')) return false
    if (return_parts) {
        return {
            "prefix": prefix,
            "reference": reference,
        }
    }
    return true
}

export function getUriType(str, prefixes) {
    if (isCURIE(str, prefixes)) return "CURIE"
    if (isAbsoluteIRI(str)) return "IRI"
    return "UNKNOWN"
}

export function nameOrCURIE(shape, prefixes, readable = false) {
    if (shape.hasOwnProperty(SHACL.name.value)) {
        return shape[SHACL.name.value];
    } else {
        if (readable) {
            return makeReadable(
                toCURIE(shape[SHACL.path.value], prefixes, 'parts').property
            );
        }
        return toCURIE(shape[SHACL.path.value], prefixes);
    }
}

export function orderArrayOfObjects(array, key) {
    // Returns an array of objects ordered by the value of a specific key
    return [...array].sort((a, b) => a[key] - b[key]);
}

export function isObject(val) {
    return typeof val === 'object' && !Array.isArray(val) && val !== null;
}

export function dlJSON(jsonObject) {
    // Data
    const jsonString = JSON.stringify(jsonObject);
    const blob = new Blob([jsonString], { type: 'application/json' });
    // Create a link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.json';
    document.body.appendChild(link);
    // Click to download, and remove
    link.click();
    document.body.removeChild(link);
}

export function dlTTL(ttlstring, filename) {
    // Data
    const blob = new Blob([ttlstring], { type: 'text/turtle' });
    // Create a link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    // Click to download, and remove
    link.click();
    document.body.removeChild(link);
}

export function downloadTSV(data, filename) {
    const blob = new Blob([data], { type: 'text/tsv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function addCodeTagsToText(text, prepend, append) {
    let result = text
    if (text) {
        result = text.replace(/`([^`]+)`/g, '<code class="code-style">$1</code>');
        if (prepend) result = prepend + result;
        if (append) result = result + append
    } 
    return result;
}

export function findObjectByKey(array, key, value) {
    return array.find((obj) => obj[key] === value);
}

export function findObjectIndexByKey(array, key, value) {
    return array.findIndex((obj) => obj[key] === value);
}

export function replaceServiceIdentifier(id, arg_string, prefixes) {
    // id: The URI parameter to be formatted
    // arg_string: The formatting instruction "record?id={curie}&format=ttl";

    // First extract the part inside the curly brackets
    const id_type = arg_string.match(/{(.*?)}/)[1];
    var replacement_id;
    // console.log(`id_type = ${id_type}`)

    if (id_type == 'curie') {
        replacement_id = toCURIE(id, prefixes);
    } else if (id_type == 'name') {
        replacement_id = toCURIE(id, prefixes, 'parts').property;
    } else if (id_type == 'uri') {
        replacement_id = id;
    } else {
        replacement_id = id;
    }
    // console.log(replacement_id)
    // Replace curly brackets and everything in between
    return arg_string.replace(/{.*?}/, encodeURIComponent(replacement_id));
}

export function makeReadable(input) {
    // capitalize first letter
    var output = input.charAt(0).toUpperCase() + input.slice(1);
    // Replace underscores and dashes with space
    output = output.replace(/_/g, ' ');
    output = output.replace(/-/g, ' ');
    return output;
}

export function getPrefLabel(node, graphDataset, allPrefixes, from) {
    // console.log("Inside getPrefLabel")
    // console.log(allPrefixes)
    var prefLabel = '';
    // Get quads related to a subject
    // node.value = toIRI(node.value, allPrefixes)
    var relatedQuads = graphDataset.getSubjectTriples(node);

    // Isolate first quad with predicate 'skos:prefLabel'
    var prefLabelQuad = relatedQuads.find((q) => {
        return (
            q.predicate.value == SKOS.prefLabel.value &&
            q.object.termType === 'Literal'
        );
    });

    if (prefLabelQuad) {
        return prefLabelQuad.object.value;
    }

    // Isolate quads that are 'DLTHINGS.annotations'
    var annotationQuads = relatedQuads.filter((q) => {
        return (
            q.predicate.value == DLTHINGS.annotations.value &&
            q.object.termType === 'BlankNode'
        );
    });
    // If no annotations, return empty string
    if (!annotationQuads) {
        return prefLabel;
    }
    // For each annotation quad, ...
    for (var aq of annotationQuads) {
        var bnQuads = graphDataset.getSubjectTriples(aq.object);
        var annotationTagQuad = bnQuads.find((bnQ) => {
            return (
                bnQ.predicate.value == DLTHINGS.annotation_tag.value &&
                (bnQ.object.value == 'skos:prefLabel' ||
                    bnQ.object.value == toIRI('skos:prefLabel', allPrefixes))
            );
        });
        if (annotationTagQuad) {
            var annotationValueQuad = bnQuads.find((bnQ2) => {
                return bnQ2.predicate.value == DLTHINGS.annotation_value.value;
            });
            if (annotationValueQuad) {
                prefLabel = annotationValueQuad.object.value;
                console.log(`Found annotation '${prefLabel}' for node:`);
                console.log(node.value);
                break;
            }
        }
    }
    return prefLabel;
}

export function snakeToPascal(snakeStr) {
    return snakeStr
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

export function snakeToCamel(snakeStr) {
    return snakeStr
        .split('_')
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
}

export function toSnakeCase(str) {
    return (
        str
            // Insert an underscore before uppercase letters (except at the beginning)
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            // Replace spaces, hyphens, and multiple underscores with a single underscore
            .replace(/[\s\-]+/g, '_')
            // Lowercase the entire string
            .toLowerCase()
    );
}

export function adjustHexColor(hexColor, amount) {
    // Remove the '#' if present
    let colorInt = parseInt(hexColor.replace('#', ''), 16);
    // Adjust the color value
    colorInt = Math.max(0, Math.min(0xffffff, colorInt + amount));
    // Convert back to hex and ensure it's always 6 digits
    return `#${colorInt.toString(16).padStart(6, '0')}`;
}

export function getDisplayName(uri, configVarsMain, prefixes, shape = {}) {
    // configVarsMain.classNameDisplay should be one of:
    // - name: the value of the nodeshape's `sh:name` attribute (e.g. Organization)
    // - reference: the reference of the nodeshape CURIE (e.g. DSCOrganization)
    // - curie: the full CURIE of the nodeshape IRI (e.g. trr379cps:DSCOrganization)
    let mode = configVarsMain.classNameDisplay;
    let name = shape.hasOwnProperty(RDFS.label.value) ? shape[RDFS.label.value] : null;
    let reference = toCURIE(uri, prefixes, 'parts').property;
    let curie = toCURIE(uri, prefixes);
    if (mode == 'name') {
        return name ? name : reference;
    } else if (mode == 'reference') {
        return reference;
    } else {
        return curie
    }
}

export function getDirectSubClasses(class_uri, graph) {
    const subClasses = graph.getQuads(
        null,
        namedNode(RDFS.subClassOf.value),
        namedNode(class_uri),
        null
    );
    if (subClasses.length > 0) {
        return subClasses;
    }
    return null;
}

export function getPidQuad(pid, graph) {
    const q = graph.getQuads(
        namedNode(pid),
        namedNode(RDF.type.value),
        null,
        null
    );
    if (q && q.length) {
        return q[0];
    } else {
        return undefined;
    }
}

export function getSubjectQuad(subj, graph) {
    const q = graph.getQuads(
        subj.termType === 'BlankNode' ? blankNode(subj.value): namedNode(subj.value),
        namedNode(RDF.type.value),
        null,
        null
    );
    if (q && q.length) {
        return q[0];
    } else {
        return undefined;
    }
}

export function getReferencingRecords(objVal, graph) {
    const startNode = namedNode(objVal);
    const visited = new Set();
    const referencingRecords = {};
    // Function to walk up the blank node ladder until reaching a named node subject
    function walkUp(currentNode, path = [], predicates = []) {
        const incomingQuads = graph.getQuads(
            null,
            null,
            currentNode,
            null
        );

        for (const q of incomingQuads) {
            const visitKey = `${q.subject.value}-${q.predicate.value}-${q.object.value}`;
            if (visited.has(visitKey)) continue;
            visited.add(visitKey);
            const newPath = [...path, q];
            const newPredicates = [...predicates, q.predicate.value];
            if (q.subject.termType === 'NamedNode') {
                // We've reached the root named node
                // If it's the same as the starting node,
                // exclude it to prevent circular referencing
                if (q.subject.value === startNode.value) {
                    continue;
                }
                if (!referencingRecords[q.predicate.value]) {
                    referencingRecords[q.predicate.value] = [];
                }
                const record = {
                    record_id: q.subject.value,
                    path: newPath,
                    predicates: newPredicates
                };
                const sQ = getSubjectQuad(q.subject, graph);
                if (sQ) {
                    record.class_iri = sQ.object.value;
                    record.quad = sQ;
                }
                referencingRecords[q.predicate.value].push(record);
            }
            else if (q.subject.termType === 'BlankNode') {
                walkUp(q.subject, newPath, newPredicates);
            }
        }
    }
    walkUp(startNode);
    return referencingRecords;
}

export function objectsEqual(obj1, obj2) {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false;
    }

    for (var key of Object.keys(obj1)) {
        if (obj1[key] !== obj2[key]) {
            return false;
        }
    }
    return true;
}

export async function quadsToTTL(allQuads, allPrefixes) {
    var usedPrefixes = {};
    allQuads.forEach((quad) => {
        var iris = [
            quad.subject.value,
            quad.predicate.value,
            quad.object.value,
        ];
        if (quad.object.termType == 'Literal' && quad.object.datatype?.value) {
            var lp = toCURIE(quad.object.datatype.value, allPrefixes, 'parts');
            if (lp == quad.object.datatype.value || !lp) {
                // means the IRI does not use a known prefix
            } else {
                usedPrefixes[lp['prefix']] = allPrefixes[lp['prefix']];
            }
        }
        for (var i of iris) {
            var p = toCURIE(i, allPrefixes, 'parts');
            if (p == i || !p) {
                // means the IRI does not use a known prefix
                continue;
            } else {
                usedPrefixes[p['prefix']] = allPrefixes[p['prefix']];
            }
        }
    });

    const ttl = await new Promise((resolve, reject) => {
        const writer = new Writer({ prefixes: usedPrefixes });
        writer.addQuads(allQuads);
        writer.end((error, result) => {
            if (error) reject(error);
            else resolve(result.trim());
        });
    });
    return ttl;
}

export function hasConfigDisplayLabel(class_uri, allPrefixes, configVarsMain) {
    var class_curi = toCURIE(class_uri, allPrefixes)
    if (configVarsMain.displayNameAutogenerate.hasOwnProperty(class_curi)) {
        return configVarsMain.displayNameAutogenerate[class_curi]
    } else {
        return false
    }
}

export function getConfigDisplayLabel(labelTemplate, labelParts, configVarsMain, rdfDS, allPrefixes) {
    const regex = /{([^}]+)}/g;
    const defaultPlaceholder = 
        "default" in configVarsMain.displayNameAutogeneratePlaceholder ? 
        configVarsMain.displayNameAutogeneratePlaceholder.default : "[?]";
    
    let idIRIcurie = toCURIE(configVarsMain.idIri, allPrefixes)

    return labelTemplate.replace(regex, (_, key) => {
        let missingPlaceholder =
            key in configVarsMain.displayNameAutogeneratePlaceholder ? 
            configVarsMain.displayNameAutogeneratePlaceholder[key] : defaultPlaceholder
        if (!(key in labelParts)) {
            return missingPlaceholder;
        }
        let objectVal = labelParts[key];
        if (!Array.isArray(objectVal)) {
            objectVal = [objectVal];
        }
        // If the key is the PID IRI, we shouldn't resolve because that is
        // unnecessary and that leads to recursion
        if (key == idIRIcurie) {
            return objectVal[0];
        }
        const resolved = objectVal.map((val) => {
            if (rdfDS && allPrefixes) {
                let relatedRecordQuad = getPidQuad(val, rdfDS.data.graph);
                if (relatedRecordQuad) {
                    return getRecordDisplayLabel(
                        relatedRecordQuad.subject,
                        rdfDS,
                        allPrefixes,
                        configVarsMain
                    );
                }
            }
            return val;
        });
        return resolved.join(", ");
    });
}

export function quadsToTripleObject(quads, allPrefixes) {
    let tripleObject = {}
    for (const q of quads) {
        let predCuri = toCURIE(q.predicate.value, allPrefixes)
        if (!tripleObject[predCuri]) {
            tripleObject[predCuri] = [];
        }
        tripleObject[predCuri].push(q.object.value);
    }
    return tripleObject
}

export function getRecordDisplayLabel(subjectTerm, rdfDS, allPrefixes, configVarsMain) {
    let displayLabel = ''
    // First get the node statement, because we need its class
    // e.g.: 'subjectTerm rdf:type ex:Dataset .'
    let subjQ = getSubjectQuad(subjectTerm, rdfDS.data.graph)
    // let pidQ = getPidQuad(subjectTerm.value, rdfDS.data.graph)
    if (!subjQ) {
        // This should technically never happen since we're working with named nodes here
        // but the escape route is still necessary to prevent timing errors from
        // clogging the console
        return displayLabel
    }
    // If the record has a preflabel, return that
    let prefLabel = getPrefLabel(subjectTerm, rdfDS, allPrefixes)
    if (prefLabel) return prefLabel
    // Otherwise determine from config
    let classIRI = subjQ.object.value;
    let relatedQuads = rdfDS.getSubjectTriples(subjectTerm);
    // Convert to triples as an object with predicate-object key-values
    let relatedTriples = quadsToTripleObject(relatedQuads, allPrefixes)
    // also add PID key-value, since it is not explicitly one of the relatedQuads
    let predCuri = toCURIE(configVarsMain.idIri, allPrefixes)
    relatedTriples[predCuri] = [subjectTerm.value];
    let labelTemplate = hasConfigDisplayLabel(classIRI, allPrefixes, configVarsMain)
    if (labelTemplate) {
        displayLabel = getConfigDisplayLabel(labelTemplate, relatedTriples, configVarsMain, rdfDS, allPrefixes)
    }
    // If the label is only the placeholder, rather display the pid
    if ( displayLabel == configVarsMain.displayNameAutogeneratePlaceholder.default ||
        displayLabel == "[?]" || !displayLabel ) {
        displayLabel = subjectTerm.value
    }
    return displayLabel
}

export function nodeShapeHasPID(nodeshapeIRI, shapesDS, pidIRI) {
    // Use SHACL shaped to check if a node has PID, i.e. if it will be a named node
    // - if the nodeshape does NOT have a propertyshape with sh:path being equal to ID_IRI,
    // - it means the class's records will be blank nodes 
    var nodeShape = shapesDS.data.nodeShapes[nodeshapeIRI];
    if (!nodeShape) return undefined
    var ps = nodeShape.properties.find(
        (prop) => prop[SHACL.path.value] == pidIRI
    );
    return ps ? true : false
}

export function nodeShapeHasProperty(nodeshapeIRI, shapesDS, inputURI, allPrefixes) {
    // True if the nodeshape has a propertyshape with sh:path being equal to input URI,
    var nodeShape = shapesDS.data.nodeShapes[nodeshapeIRI];
    if (!nodeShape) return undefined
    var ps = nodeShape.properties.find(
        (prop) => prop[SHACL.path.value] == toIRI(inputURI, allPrefixes)
    );
    return ps ? true : false
}

export function getNodeShapePropertyWithAnnotations(nodeshapeIRI, shapesDS, annotations = {}, prefixes) {
    // For the given SHACL NodeShape, check if it has a property shape that is annotated
    // with a set of provided annotations
    if (!Object.keys(annotations).length) return undefined
    var nodeShape = shapesDS.data.nodeShapes[nodeshapeIRI];
    if (!nodeShape) return undefined
    var ps = nodeShape.properties.find((prop) => {
        return Object.entries(annotations).every(([key, value]) => {
            let keyIRI = toIRI(key, prefixes)
            let valIRI = toIRI(value, prefixes)
            return prop.hasOwnProperty(keyIRI) && prop[keyIRI] === valIRI;
        })
    });
    return ps ? ps : false
}

export function nodeShapeHasPropertyWithAnnotations(nodeshapeIRI, shapesDS, annotations = {}, prefixes) {
    let ps = getNodeShapePropertyWithAnnotations(nodeshapeIRI, shapesDS, annotations, prefixes)
    if (ps === undefined) return undefined
    return ps ? true : false
}


export async function hashSubgraph(quads) {
    if (!quads || !quads.length) return '';
    // Simple canonicalization function that calculates a persistent hash
    // form a set of quads, by doing the following per quad:
    // - replacing blank node subject and object values with '_:'
    // - using named node subject, predicate, and object values as they are
    // - concatenating the above with a separator, as a string
    // then sorting all resulting strings, and lastly joining the sorted
    // strings with newline characters, before calculating the SHA-256 hash.
    const sorted = quads.map(q => {
        const subj = q.subject.termType === 'BlankNode' ? '_:' : q.subject.value;
        const obj = q.object.termType === 'BlankNode' ? '_:' : q.object.value;
        return `${subj}|${q.predicate.value}|${obj}`;
    }).sort();
    const canonicalString = sorted.join('\n');
    // Encode to bytes for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalString);
    // Compute SHA-256 using the browser's Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex
}

export function getNodeContextKey(store, node) {
    // This function produces a context key of a blank node with respect to its
    // parent node(s), based on the parent node type and specific predicate that
    // references the blank node. It is used in deduplication in order to provide
    // the context for a blank node (to assist the subgraph structure hash) 
    
    // Named node = absolute root
    if (node.termType === 'NamedNode') {
        return `N:${node.value}`;
    }
    // Find immediate parents
    const incoming = store.getQuads(null, null, node, null);
    // No parents: anonymous root
    if (!incoming.length) {
        return 'B:ROOT';
    }
    // Use immediate parent + predicate
    const parts = incoming.map(q => {
        const parent = q.subject;
        const parentKey =
            parent.termType === 'NamedNode'
                ? `N:${parent.value}`
                : 'B:PARENT';
        return `${parentKey}|${q.predicate.value}`;
    }).sort();
    return `B(${parts.join(',')})`;
}

export function collectBlankNodeHierarchy(store, rootBNode) {
    // Returns an array of quads that map the hierarchy of a blank node
    // and the quads that reference it as a subject, recursively
    const collected = [];
    const visited = new Set();
    function visit(node) {
        if (visited.has(node.value)) return;
        visited.add(node.value);
        const quads = store.getQuads(node, null, null, null);
        for (const q of quads) {
            collected.push(q);
            if (q.object.termType === 'BlankNode') {
                visit(q.object);
            }
        }
    }
    visit(rootBNode);
    return collected;
}


export function getRecordQuads(pid, graph, recursive=false) {
    // Return an array of quads related to a specific named node
    // Default will return only the first level of quads, i.e. all quads
    // that have the named node as subject.
    // Set `recursive` to true to get quads related to blank node objects recursively
    // related named nodes are not recursively resolved
    const visited = new Set();
    const allQuads = [];
    function addQuadsRecursively(quads) {
        for (const qd of quads) {
            if (!allQuads.includes(qd)) {
                allQuads.push(qd);
                if (qd.object.termType === 'BlankNode') {
                    const id = qd.object.value;
                    if (!visited.has(id)) {
                        visited.add(id);
                        const moreQuads = graph.getQuads(qd.object, null, null, null);
                        addQuadsRecursively(Array.from(moreQuads));
                    }
                }
            }
        }
    }
    const baseQuads = graph.getQuads(namedNode(pid), null, null, null);
    if (recursive) {
        addQuadsRecursively(baseQuads);
        return allQuads;
    } else {
        return baseQuads;
    }
}

export function getContent(content, key) {
    if (key.startsWith('content:')) {
        let contentKey = key.replace('content:','')
        return content[contentKey].value
    } else {
        return key
    }
}

export function getContentType(content, key) {
    if (key.startsWith('content:')) {
        let contentKey = key.replace('content:','')
        return content[contentKey].type
    }
    return undefined
}

export function fillStringTemplate(template, params) {
    return template.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, keyPath) => {
        if (keyPath === '_randomUUID') {
            return crypto.randomUUID();
        }
        // Resolve dot notation
        const value = keyPath.split('.').reduce((acc, key) => {
                if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
                    return acc[key];
                }
                return undefined;
            }, params);
        if (value === undefined) {
            console.error(`Error: No value provided for placeholder {${keyPath}}`);
            return match;
        }
        return value;
    });
}

export function includeClass(class_iri, showHide_config, allPrefixes) {
    var classCurie = toCURIE(class_iri, allPrefixes)
    var class_prefix = toCURIE(class_iri, allPrefixes, 'parts').prefix
    // Assume we include class by default
    var include = true;
    // If either showClasses or showClassesWithPrefix contain elements
    // it means we include only some classes
    // If the current class is not found in those classes, exclude it
    if (
        (
            showHide_config.showClasses?.length != 0 ||
            showHide_config.showClassesWithPrefix?.length != 0
        ) && (
            showHide_config.showClasses?.indexOf(classCurie) < 0 &&
            showHide_config.showClassesWithPrefix?.indexOf(class_prefix) < 0
        )
    ) {
        include = false;
    }
    // If a class is to be included based on the showClasses(...) options,
    // only include it if it should not be explicitly hidden (i.e. include
    // it if it isn't found in hideClasses(...) arrays
    if (
        include &&
        showHide_config.hideClasses?.indexOf(classCurie) < 0 &&
        showHide_config.hideClassesWithPrefix?.indexOf(class_prefix) < 0
    ) {
        return true
    } else {
        return false
    }
}

export function includePriorityClass(class_iri, configVarsMain, allPrefixes) {
    var classCurie = toCURIE(class_iri, allPrefixes);
    if (configVarsMain.priorityClasses?.length) {
        var inst = findObjectByKey(configVarsMain.priorityClasses, 'class', classCurie);
        if (inst) {
            return true;
        }
    }
    return false;
}

export function getNotes(shape) {
    let notes = shape?.[SKOS.note.value];
    if (notes) {
        if (!Array.isArray(notes)) {
            return [notes]
        } else {
            return notes
        }
    }
    return null
}

const XSD_FLAGS_PATTERN = /^\(\?([imsx]+)\)\^/;
export function getJsRegex(xsdPattern) {
    let jsFlags = '';
    let jsPattern = xsdPattern;
    // Check of the pattern string includes flags, e.g.:`(?i)^`
    const m = xsdPattern.match(XSD_FLAGS_PATTERN);
    if (m) {
        // Only keep JS-compatible flags: i, m, s
        jsFlags = [...m[1]].filter(f => 'ims'.includes(f)).join('');
        jsPattern = xsdPattern.replace(/^\(\?[imsx]+\)/, '');
    }
    return {jsFlags, jsPattern};
}

export function findBlankNodeLink(data, config, allPrefixes) {

    const { slot, match = [], return: returnKey } = config;

    let slotIRI = toIRI(slot, allPrefixes)

    // 1. Check that the slot exists
    const blankNodes = data?.triples?.BlankNode;
    if (!blankNodes || !blankNodes[slotIRI]) {
        return undefined;
    }

    const relatedTriples = blankNodes[slotIRI]?.relatedTriples;
    if (!Array.isArray(relatedTriples)) {
        return undefined;
    }

    // 2. Filter triples that satisfy ALL match conditions
    const matches = relatedTriples.filter(triple => {
        return match.every(({ key, val }) => {
            const keyIRI = toIRI(key, allPrefixes)
            const valIRI = toIRI(val, allPrefixes);
            const tripleValue = triple[key];
            // key must exist and value must be an array containing val
            return Array.isArray(tripleValue) && tripleValue.includes(valIRI);
        });
    });

    if (matches.length === 0) {
        return undefined;
    }

    // 3. Return the requested key values
    const results = matches
        .map(triple => triple[returnKey])
        .filter(Boolean) // remove undefined
        .flat();         // flatten arrays like ["url"]

    return results.length ? results : undefined;
}

export function getIcon(iconText, configVarsMain, defaultIcon={type: 'mdi',icon: 'mdi-plus-box'}) {
    if (iconText) {
        if (iconText.startsWith('mdi-')) {
            return {
                type: 'mdi',
                icon: iconText
            }
        } else if (iconText.startsWith('content:')) {
            return {
                type: 'svg',
                icon: getContent(configVarsMain.content, iconText)
            }
        } else {
            return {
                type: 'svg',
                icon: iconText
            }
        }
    } else {
        return defaultIcon
    }
}