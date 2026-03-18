/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import vuetify from './vuetify';
import runtimePlugins from './runtime-plugins';

export function registerPlugins(app) {
    app.use(vuetify);
    app.use(runtimePlugins)
}