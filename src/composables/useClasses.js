// classdata.js
import { reactive } from 'vue';
import { ClassDataset } from 'shacl-tulip';
import { RDFS } from '@/modules/namespaces';
import { DataFactory } from 'n3';
const { namedNode } = DataFactory;

const basePath = import.meta.env.BASE_URL || '/';

export function useClasses(config) {
    const defaultURL = `${basePath}dlschemas_owl.ttl`;
    const classDS = new ClassDataset(reactive({}));
    const allSubClasses = reactive({})

    async function getClassData(url) {
        var getURL;
        if (!url) {
            // If no url argument provided, check config
            // Config priority is:
            // - if the class_url is provided, use it and ignore use_default_classes
            // - if the class_url is NOT provided, use default if use_default_classes==true, else nothing
            if (config.value.class_url) {
                console.log('- specified via config');
                if (config.value.class_url.indexOf('http') >= 0) {
                    console.log('- contains http');
                    getURL = config.value.class_url;
                } else {
                    console.log('- does not contain http');
                    getURL = `${basePath}${config.value.class_url}`;
                }
            } else {
                if (config.value.use_default_classes == true) {
                    getURL = defaultURL;
                } else {
                    console.log(
                        'getClassData -> no url provided via argument or config, and config specifies not to use default; not fetching'
                    );
                    return;
                }
            }
        } else {
            getURL = url;
        }
        await classDS.loadRDF(getURL);
    }

    function processSubClasses() {
        const allClasses = new Set();
        const subclassQuads = classDS.data.graph.getQuads(null, namedNode(RDFS.subClassOf.value), null, null);
        for (const q of subclassQuads) {
            allClasses.add(q.subject.value);
            allClasses.add(q.object.value);
        }
        for (const classUri of allClasses) {
            allSubClasses[classUri] = getSubClasses(classUri, classDS.data.graph);
        }
    }

    function getSubClasses(classUri) {
        const visited = new Set();
        const subClasses = new Set();
        function traverse(uri) {
            if (visited.has(uri)) return;
            visited.add(uri);
            const direct = getDirectSubClasses(uri, classDS.data.graph);
            if (!direct) return;
            for (const quad of direct) {
                const subUri = quad.subject.value;
                if (!subClasses.has(subUri)) {
                    subClasses.add(subUri);
                    traverse(subUri);
                }
            }
        }
        traverse(classUri);
        return Array.from(subClasses);
    }

    function getDirectSubClasses(class_uri) {
        const subClasses = classDS.data.graph.getQuads(
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
    // ------- //
    // Returns //
    // ------- //
    return {
        classDS,
        getClassData,
        allSubClasses,
        processSubClasses,
    };
}
