import nunjucks from 'nunjucks'

const env = nunjucks.configure({
    autoescape: false,
    throwOnUndefined: true,
    trimBlocks: true,
    lstripBlocks: true
})

env.addFilter('ttl', str =>
  `"${String(str).replace(/"/g, '\\"')}"`
)

env.addGlobal('_randomUUID', () => crypto.randomUUID())

export function useNunjucks() {
    function fillNunjucksTemplate(template, params) {
        return env.renderString(template, params)
    }
    return {
        fillNunjucksTemplate
    }
}