/**
 * Pre-compiles Ajv validators from json schemas
 * Ajv supports generating standalone validation functions from JSON Schemas at compile/build time.
 * These functions can then be used during runtime to do validation without initializing Ajv.
 * This is useful for several reasons:
 * - to avoid dynamic code evaluation with Function constructor (used for schema compilation) -
 *   when it is prohibited by the browser page [Content Security Policy](https://ajv.js.org/security.html#content-security-policy).
 * - to reduce the browser bundle size - Ajv is not included in the bundle
 * - to reduce the start-up time - the validation and compilation of schemas will happen during build time.
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import Ajv from 'ajv'
import standaloneCode from 'ajv/dist/standalone/index.js'

import { mkdirp } from 'mkdirp'

const schemaHostUrl = 'https://tbdex.dev'
const schemaUrls = {
  definitions : `${schemaHostUrl}/definitions.json`,
  resource    : `${schemaHostUrl}/resource.schema.json`,
  offering    : `${schemaHostUrl}/offering.schema.json`,
  message     : `${schemaHostUrl}/message.schema.json`,
  rfq         : `${schemaHostUrl}/rfq.schema.json`,
  quote       : `${schemaHostUrl}/quote.schema.json`,
  order       : `${schemaHostUrl}/order.schema.json`,
  orderstatus : `${schemaHostUrl}/orderstatus.schema.json`,
  close       : `${schemaHostUrl}/close.schema.json`,
}

// fetch schemas from https://tbdex.dev which pulls directly from
// https://github.com/TBD54566975/tbdex/tree/main/json-schemas
// TODO: cache schemas on disk
const schemas = {}
for (let schemaName in schemaUrls) {
  const schemaUrl = schemaUrls[schemaName]
  const response = await fetch(schemaUrl)

  if (!response.ok) {
    throw new Error(`failed to fetch ${schemaName} schema from ${schemaUrl}`)
  }

  const schema = await response.json()
  schemas[schemaName] = schema
}

const validator = new Ajv({ code: { source: true, esm: true } })

for (const schemaName in schemas) {
  validator.addSchema(schemas[schemaName], schemaName)
}

const moduleCode = standaloneCode(validator)
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

await mkdirp(path.join(__dirname, '../generated'))
fs.writeFileSync(path.join(__dirname, '../generated/compiled-validators.js'), moduleCode)