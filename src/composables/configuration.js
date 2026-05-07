// composables/configuration.js
/**
 * Composable for managing the application configuration
 */

import { isObject, snakeToCamel, getContent, getContentType, toIRI, toCURIE, getIcon} from '@/modules/utils';
import { ref, onMounted, reactive, watch, toRaw} from 'vue';
import { mergeWith } from 'lodash-es'
import { parse as parseYAML } from 'yaml';
const basePath = import.meta.env.BASE_URL || '/';

const mainVarsToLoad = {
    app_name: 'shacl-vue',
    page_title: 'shacl-vue',
    shapes_url: '',
    data_url: '',
    class_url: '',
    show_shapes_wo_id: true,
    show_classes: [],
    show_classes_with_prefix: [],
    hide_classes: [],
    hide_classes_with_prefix: [],
    priority_classes: [],
    no_edit_classes: [],
    allow_edit_instances: [],
    allow_copy_record_urls: true,
    editor_selection: {},
    filter_records_by: [
        "skos:prefLabel",
        "shaclvue:displayLabel",
        "dlthings:pid"
    ],
    component_config: {
        W3CISO8601YearEditor: {
            yearStart: 1925,
            yearEnd: 2077
        },
        W3CISO8601YearMonthEditor: {
            yearStart: 1925,
            yearEnd: 2077
        },
        W3CISO8601DateTimeEditor: {
            yearStart: 1925,
            yearEnd: 2077
        },
        InstancesSelectEditor: {
            fetchingsRecordsText: "Fetching records...",
        },
        PropertyShapeEditor: {
            recordNumberStepSize: 5,
        },
        NodeShapeViewer: {
            recordNumberStepSize: 5,
            textTruncateWidth: "85%",
            hideBackLinks: true,
        },
        URIEditor: {
            default: "curie",
        },
    },
    content: {},
    display_name_autogenerate: {},
    display_name_autogenerate_placeholder: {
        default: "[?]"
    },
    id_iri: "",
    id_autogenerate: {},
    id_autogenerate_override: false,
    prefixes: {},
    class_icons: {},
    documentation_url: 'https://shacl-vue.psychoinformatics.de/',
    source_code_url: 'https://hub.psychoinformatics.de/datalink/shacl-vue/src/commit/',
    app_theme: {
        link_color: '#41b883',
        hover_color: '#1565C0',
        active_color: '#D32F2F',
        panel_color: '#41b883',
        settings_color: '#1565C0',
        visited_color: '#41b882',
        logo: 'shacl_vue_logo.svg',
    },
    front_page_content: "",
    id_resolves_externally: [],
    use_token: false,
    token_info: '',
    token_info_url: '',
    use_service: false,
    service_base_url: [],
    service_constrained_search: {
        min_characters: 4,
        typing_debounce: 800,
    },
    class_name_display: 'name',
    footer_links: [],
    gitannex_p2phttp_config: {},
    gitannex_p2phttp_config_wizard: {},
    update_shapes: {},
    update_shapes_default: {},
    wizard_editors: {},
    wizard_editor_selection: {},
    property_groups: {},
};


function mergeCustomizer(objValue, srcValue) {
    if (!Array.isArray(objValue) || !Array.isArray(srcValue)) {
        return undefined // let mergeWith handle it without a customizer
    }
    // Both are arrays, now inspect contents
    const objHasObjects = objValue.some((el) => {
        return isObject(el)
    })
    const srcHasObjects = srcValue.some((el) => {
        return isObject(el)
    })
    // If arrays contain objects, override completely
    if (objHasObjects || srcHasObjects) {
        return srcValue
    }
    // Else, return merged array of primitives (strings, numbers, etc)
    return [...new Set([...objValue, ...srcValue])]
}

function getFileExtension(url) {
    return url.split('.').pop().toLowerCase()
}

async function parseConfigResponse(response, url) {
    const ext = getFileExtension(url)
    const text = await response.text()
    if (ext === 'yml' || ext === 'yaml') {
        return parseYAML(text)
    }
    return JSON.parse(text)
}

export function useConfig(url) {
    // ---- //
    // Data //
    // ---- //
    const defaultConfigCandidates = [
        `${basePath}config.yaml`,
        `${basePath}config.yml`,
        `${basePath}config.json`,
    ];
    let configURL = null;
    const config = ref(null);
    const configFetched = ref(false);
    const configReady = ref(false);
    const configError = ref(false);
    const configVarsMain = reactive({});
    const ID_IRI = ref('');
    const allPrefixes = reactive({});
    const frontPageHTML = ref(null);
    const priorityClassList = ref([]);
    const searchableFields = [];
    for (const [key, value] of Object.entries(mainVarsToLoad)) {
        configVarsMain[snakeToCamel(key)] = value;
    }

    // ----------------- //
    // Lifecycle methods //
    // ----------------- //
    onMounted(async () => {
        try {
            configURL = await resolveConfigURL()
            if (!configURL) {
                configError.value = true
                throw new Error('No config file found (config.yaml/yml/json)')
            } else {
                console.log(`Config file found at: ${configURL}`)
            }
            const response = await fetch(configURL, { cache: 'no-cache' });
            if (!response.ok) {
                configError.value = true;
                throw new Error(
                    `Error fetching config file: ${response.statusText}`
                );
            }
            let mainConfig = await parseConfigResponse(response, configURL);
            if (!mainConfig || typeof mainConfig !== 'object') {
                throw new Error('Config file is not valid JSON/YAML')
            }
            let externalConfig = {};
            if (mainConfig.external_config_url) {
                let externalConfigLoaded = await loadContent(mainConfig.external_config_url, 'json')
                if (externalConfigLoaded !== null) {
                    externalConfig = externalConfigLoaded;
                }
            }
            config.value = mergeWith(structuredClone(externalConfig), mainConfig, mergeCustomizer)
            configFetched.value = true;
        } catch (error) {
            console.error('Fetch error:', error);
            configError.value = true;
            throw error;
        }
    });

    watch(
        configFetched,
        async (newValue) => {
            if (newValue) {
                if (!config.value.id_iri) {
                    throw new Error(
                        "Configuration error: 'id_iri' is a required field"
                    );
                }
                ID_IRI.value = config.value.id_iri;
                // Load all variables from config that are necessary for the main shaclvue and appheader components
                loadConfigVars();
                document.documentElement.style.setProperty(
                    '--link-color',
                    configVarsMain.appTheme.link_color
                );
                document.documentElement.style.setProperty(
                    '--hover-color',
                    configVarsMain.appTheme.hover_color
                );
                document.documentElement.style.setProperty(
                    '--active-color',
                    configVarsMain.appTheme.active_color
                );
                document.documentElement.style.setProperty(
                    '--visited-color',
                    configVarsMain.appTheme.visited_color
                );
                // Set html document title from config variables
                if (configVarsMain.pageTitle) {
                    document.title = configVarsMain.pageTitle;
                } else if (configVarsMain.appName) {
                    document.title = configVarsMain.appName;
                } else {
                    document.title = 'shacl-vue';
                }
                // Prefetch text content, e.g. templates
                await loadAllContent()
                // Load main page content if provided
                frontPageHTML.value = null
                if (configVarsMain.frontPageContent) {
                    frontPageHTML.value = getContent(configVarsMain.content, configVarsMain.frontPageContent)
                }
                // Load wizards' content + template type + icon
                loadWizardEditors()
                configReady.value = true;
            }
        },
        { immediate: true }
    );

    // --------- //
    // Functions //
    // --------- //
    async function resolveConfigURL() {
        if (url) {
            return url.indexOf('http') === 0 ? url : `${basePath}${url}`
        }
        for (const candidate of defaultConfigCandidates) {
            try {
                const res = await fetch(candidate, { method: 'HEAD' })
                const contentType = res.headers.get('content-type') || ''
                if (res.ok && !contentType.includes('text/html')) {
                    return candidate
                }
            } catch (_) {}
        }
        return null
    }

    async function loadContent(url, format = 'json') {
        if (!url) {
            return null
        }
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) {
                console.error(`Error fetching content: ${response.statusText}`)
                return null
            }
            if (format == 'text') {
                return await response.text();
            } else {
                const ext = getFileExtension(url)
                const text = await response.text()
                if (ext === 'yml' || ext === 'yaml') {
                    return parseYAML(text)
                }
                return JSON.parse(text)
            }
        } catch (error) {
            console.error('Error fetching content:', error);
            return null
        }
    }

    function loadConfigVars() {
        // only supports one level of recursion into objects
        for (const [key, val] of Object.entries(mainVarsToLoad)) {
            if (config.value.hasOwnProperty(key)) {
                if (isObject(config.value[key])) {
                    configVarsMain[snakeToCamel(key)] = val;
                    for (const [k, v] of Object.entries(config.value[key])) {
                        configVarsMain[snakeToCamel(key)][k] = v
                    }
                } else {
                    configVarsMain[snakeToCamel(key)] = config.value[key];
                }
            }
        }
    }

    async function loadAllContent() {
        if (configVarsMain.content && Object.keys(configVarsMain.content).length > 0) {
            for (const src of Object.keys(configVarsMain.content)) {
                configVarsMain.content[src].value = await loadContent(configVarsMain.content[src].url, 'text')
                if (configVarsMain.content[src].url.includes('nunjucks')) {
                    configVarsMain.content[src].type = 'nunjucks';
                }
            }
        }
    }

    function mergePrefixes(prefixArray) {
        Object.assign(allPrefixes, ...prefixArray);
        var allPrefixKeys = Object.keys(allPrefixes);
        Object.keys(configVarsMain.prefixes).forEach((p) => {
            if (allPrefixKeys.indexOf(p) < 0) {
                allPrefixes[p] = configVarsMain.prefixes[p];
            }
        });
    }

    function processPriorityClasses() {
        priorityClassList.value = configVarsMain.priorityClasses?.map(item => toIRI(item.class, allPrefixes))
    }

    function processShapeUpdates(updateShapesFromDefault, updateShapes) {
        const configShapes = configVarsMain.updateShapes;
        const configShapesDefault = configVarsMain.updateShapesDefault;
        // 1. First we process default shapes
        // configShapesDefault example (yaml):
        // update_shapes_default:
        //     _all_node_shapes:
        //     _all_property_shapes:
        //         dlthings:title:
        //             sh:order: 1
        // Here we see if the _all_property_shapes object has keys
        // If true: we need to go through all node shapes in the shapes dataset,
        // and for each of them find the relevant property shape and update it.
        // This is what the updateShapesFromDefault function does
        if (Object.keys(configShapesDefault?._all_property_shapes ?? {}).length > 0) {
            updateShapesFromDefault(configShapesDefault._all_property_shapes, allPrefixes)
        }
        // 2. Then we process all shape updates
        if (Object.keys(configShapes ?? {}).length > 0) {
            updateShapes(configShapes, allPrefixes)
        }
    }

    function processSearchableFields() {
        for (const field of configVarsMain.filterRecordsBy) {
            searchableFields.push(transformSearchFieldName(field, 'uri'))
        }
    }

    function transformSearchFieldName(fieldName, format = 'curie') {
        if (fieldName === "skos:prefLabel") {
            return "_prefLabel";
        } else if (fieldName === "shaclvue:displayLabel") {
            return "_displayLabel";
        } else if (fieldName === "dlthings:pid") {
            return "itemValue";
        } else {
            if (format === 'curie') {
                return fieldName;
            } else {
                return toIRI(fieldName, allPrefixes);
            }
        }
    }

    function processPropertyGroups(updatePropertyGroups) {
        if (
            configVarsMain.propertyGroups && Object.keys(configVarsMain.propertyGroups).length > 0
        ) {
            updatePropertyGroups(configVarsMain.propertyGroups)
        }
    }

    async function processUpfrontServiceRequests(fetchFromService) {
        if (
            configVarsMain.useService &&
            config.value.hasOwnProperty('service_fetch_before') &&
            config.value.service_fetch_before
        ) {
            if (config.value.service_fetch_before['get-record']?.length > 0) {
                console.log("Upfront fetch get-record")
                const fetchRPromises = config.value.service_fetch_before['get-record'].map((iri) =>
                    fetchFromService('get-record', toIRI(iri, allPrefixes), allPrefixes)
                );
                var results = await Promise.allSettled(fetchRPromises);
            }
            if (config.value.service_fetch_before['get-records']?.length > 0) {
                console.log("Upfront fetch get-records-before")
                const fetchRsPromises = config.value.service_fetch_before['get-records'].map((iri) =>
                    fetchFromService('get-records-before', toIRI(iri, allPrefixes), allPrefixes)
                );
                var results = await Promise.allSettled(fetchRsPromises);
            }
        }
    }

    function loadWizardEditors() {
        configVarsMain.wizardEditorsLoaded = [];
        for (const wizard of Object.keys(configVarsMain.wizardEditors)) {
            configVarsMain.wizardEditorsLoaded[wizard] = toRaw(configVarsMain.wizardEditors[wizard]);
            configVarsMain.wizardEditorsLoaded[wizard].template_type = getContentType(configVarsMain.content, configVarsMain.wizardEditors[wizard].template);
            configVarsMain.wizardEditorsLoaded[wizard].template = getContent(configVarsMain.content, configVarsMain.wizardEditors[wizard].template);
            configVarsMain.wizardEditorsLoaded[wizard].iconFig = getIcon(configVarsMain.wizardEditors[wizard].icon, configVarsMain);
        }
    }

    function getClassIcon(class_iri) {
        if (configVarsMain.classIcons) {
            let classCurie = toCURIE(class_iri, allPrefixes)
            if (configVarsMain.classIcons[classCurie]) {
                return configVarsMain.classIcons[classCurie];
            }
        }
        return 'mdi-circle-outline';
    }


    // ------- //
    // Returns //
    // ------- //
    return {
        allPrefixes,
        config,
        configError,
        configReady,
        configVarsMain,
        frontPageHTML,
        getClassIcon,
        ID_IRI,
        mergePrefixes,
        priorityClassList,
        processPriorityClasses,
        processPropertyGroups,
        processSearchableFields,
        processShapeUpdates,
        processUpfrontServiceRequests,
        searchableFields,
    };
}
