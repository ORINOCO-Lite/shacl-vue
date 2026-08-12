// Plugins
import Components from 'unplugin-vue-components/vite';
import Vue from '@vitejs/plugin-vue';
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import ViteFonts from 'unplugin-fonts/vite';

// Utilities
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import fs from 'fs';
import path from 'path';

// Git repo version
import { execSync } from 'child_process';
const commitHash = execSync('git rev-parse HEAD').toString().trim();
const commitHashShort = execSync('git rev-parse --short HEAD')
    .toString()
    .trim();
const branch = 'pinned';
const commitDate = execSync('git show -s --format=%cI HEAD').toString().trim().replace(/[+-][0-9]{2}:[0-9]{2}$/, '');

// Output directory of build process
const outDir = process.env.VITE_OUT_DIR || 'dist/app';
const variant = process.env.VITE_SHACLVUE_VARIANT || 'default';
console.log(`Building shacl-vue application variant: '${variant}'`)

// Build process inputs
const buildGitCommit = process.env.BUILD_GIT_COMMIT ?? null;
const buildGitCommitShort = process.env.BUILD_GIT_COMMIT_SHORT ?? null;
const buildGitBranch = process.env.BUILD_GIT_BRANCH ?? null;
let buildGitDate = process.env.BUILD_GIT_DATE ?? null;
if (buildGitDate) buildGitDate = buildGitDate.replace(/[+-][0-9]{2}:[0-9]{2}$/, '');

// Build date
let buildDate = process.env.BUILD_DATE || new Date().toISOString();
buildDate = buildDate.substring(0, buildDate.length - 5);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        Vue({
            template: { transformAssetUrls },
        }),
        // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
        Vuetify(),
        Components(),
        ViteFonts({
            google: {
                families: [
                    {
                        name: 'Roboto',
                        styles: 'wght@100;300;400;500;700;900',
                    },
                ],
            },
        }),
        {
            name: 'no-spa-fallback-for-html',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                if (req.url && req.url.endsWith('.html')) {
                    const filePath = path.join(process.cwd(), 'public', req.url);
                    if (!fs.existsSync(filePath)) {
                    res.statusCode = 404;
                    res.end('Not Found');
                    return; // stop here
                    }
                }
                next();
                });
            },
        },
    ],
    define: {
        'process.env': {},
        __SV_COMMIT_HASH__: JSON.stringify(commitHash),
        __SV_COMMIT_HASH_SHORT__: JSON.stringify(commitHashShort),
        __SV_BRANCH__: JSON.stringify(branch),
        __SV_COMMIT_DATE__: JSON.stringify(commitDate),

        __BUILD_COMMIT_HASH__: buildGitCommit ? JSON.stringify(buildGitCommit) : null,
        __BUILD_COMMIT_HASH_SHORT__: buildGitCommitShort ? JSON.stringify(buildGitCommitShort) : null,
        __BUILD_BRANCH__: buildGitBranch ? JSON.stringify(buildGitBranch) : null,
        __BUILD_COMMIT_DATE__: buildGitDate ? JSON.stringify(buildGitDate) : null,

        __BUILD_DATE__: JSON.stringify(buildDate),
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
        extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
    },
    build: {
        outDir,
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: 'index.html',
        },
    },
    server: {
        port: 3000,
        mimeTypes: {
            '.vue': 'application/javascript',
        },
    },
    base: './',
});
