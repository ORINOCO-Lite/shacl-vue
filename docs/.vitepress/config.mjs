import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const forgejoIcon = `
<svg viewBox="0 0 212 212" xmlns="http://www.w3.org/2000/svg">
  <metadata
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:cc="http://creativecommons.org/ns#"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
  >
    <rdf:RDF>
      <cc:Work rdf:about="https://codeberg.org/forgejo/meta/src/branch/readme/branding#logo">
        <dc:title>Forgejo logo</dc:title>
        <cc:creator rdf:resource="https://caesarschinas.com/"><cc:attributionName>Caesar Schinas</cc:attributionName></cc:creator>
        <cc:license rdf:resource="http://creativecommons.org/licenses/by-sa/4.0/" />
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <style type="text/css">
    circle {
      fill: none;
      stroke: #000;
      stroke-width: 15;
    }
    path {
      fill: none;
      stroke: #000;
      stroke-width: 25;
    }
    .orange {
      stroke:#ff6600;
    }
    .red {
      stroke:#d40000;
    }
  </style>
  <g transform="translate(6,6)">
    <path d="M58 168 v-98 a50 50 0 0 1 50-50 h20" class="orange" />
    <path d="M58 168 v-30 a50 50 0 0 1 50-50 h20" class="red" />
    <circle cx="142" cy="20" r="18" class="orange" />
    <circle cx="142" cy="88" r="18" class="red" />
    <circle cx="58" cy="180" r="18" class="red" />
  </g>
</svg>
`

// https://vitepress.dev/reference/site-config
const config = defineConfig({
  base: "/",
  title: "shacl-vue",
  description: "Automatic generation of user interfaces from SHACL",
  head: [['link', { rel: 'icon', href: 'favicon.ico' }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'local'
    },
    logo: 'shacl_vue.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get started', link: '/get-started' }
    ],
    sidebar: [
      {
        items: [
          { text: 'Get started', link: '/get-started' },
        ]
      },
      {
        text: 'App design',
        items: [
          { text: 'The big picture', link: '/app-design' },
          { text: 'Core concepts', link: '/core-concepts' },
          { text: 'Code layout', link: '/code-layout' },
          { text: 'Component hierarchy', link: '/component-hierarchy' },
          { text: 'The editor component', link: '/editor-component' },
          { text: 'State management (TODO)', link: '/state-management' },
        ]
      },
      {
        text: 'Setup and deployment',
        items: [
          { text: 'Application inputs', link: '/app-inputs' },
          { text: 'Application configuration', link: '/app-configuration' },
          { text: 'Application deployment', link: '/app-deployment' },
        ]
      },
      {
        text: 'Useful features',
        items: [
          { text: 'Overview', link: '/features-overview' },
          { text: 'Backend integration', link: '/features-dumpthings' },
          { text: 'Forgejo integration', link: '/features-forgejo' },
          { text: 'Config-driven editor matching', link: '/features-editor-matching' },
          { text: 'File upload', link: '/features-file-upload' },
        ]
      },
      {
        text: 'API Docs (TODO)',
        items: [
        ]
      },
      {
        text: 'Contributing',
        link: '/contributing'
      },
      {
        text: 'Acknowledgements',
        link: '/acknowledgements'
      }
    ],
    socialLinks: [
      {
        icon: {
          svg: forgejoIcon
        },
        link: 'https://hub.psychoinformatics.de/datalink/shacl-vue'
      }
    ]
  }
})

export default withMermaid(config)
