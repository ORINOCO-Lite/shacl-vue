// Grab all runtime plugin paths
const modules = import.meta.glob('@/runtime-plugins/**/index.js', {
  eager: true
})
const componentModules = import.meta.glob('@/runtime-plugins/**/*.vue', {
  eager: true
})
const plugins = {}
// store plugins in object
for (const path in modules) {
    const mod = modules[path]
    // extract plugin name from path
    const match = path.match(/runtime-plugins\/([^/]+)\/index\.js$/)
    if (!match) continue
    const pluginName = match[1]
    // add plugin reference
    if (!plugins[pluginName]) {
        plugins[pluginName] = { api: {}, components: {} }
    }
    plugins[pluginName].api = mod
}
// store components in the same object
for (const path in componentModules) {
    const mod = componentModules[path]
    // extract both plugin and component name from path
    const match = path.match(/runtime-plugins\/([^/]+)\/(.+)\.vue$/)
    if (!match) continue
    const pluginName = match[1]
    const componentName = match[2]
    if (!plugins[pluginName]) {
        plugins[pluginName] = { api: {}, components: {} }
    }
    const component = mod.default
    plugins[pluginName].components[componentName] = component
}

// vue wants plugins to export the install function
export default {
    install(app) {
        // make plugins available via dependency injection
        app.provide('runtimePlugins', plugins)
        // we don't (yet) register components globally; TODO?
    }
}