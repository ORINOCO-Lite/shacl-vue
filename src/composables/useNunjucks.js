import nunjucks from 'nunjucks'

const env = nunjucks.configure({
    autoescape: false,
    throwOnUndefined: true,
    trimBlocks: true,
    lstripBlocks: true
})

env.addFilter('ttl', (value) => {
  if (value === null || value === undefined) return '""'
  let str = String(value)
  // escape backslashes first
  str = str.replace(/\\/g, '\\\\')
  // if string has return, encase in triple quotes,
  // and escape triple quotes inside
  if (str.includes('\n')) {
    str = str.replace(/"""/g, '\\"\\"\\"')
    return `"""${str}"""`
  }
  // escape quotes + control chars
  str = str
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
  return `"${str}"`
})

env.addGlobal('_randomUUID', () => crypto.randomUUID())

export function useNunjucks() {
    function fillNunjucksTemplate(template, params) {
        return env.renderString(template, params)
    }
    return {
        fillNunjucksTemplate
    }
}