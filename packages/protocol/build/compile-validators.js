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

import CloseSchema from '../../../tbdex/hosted/json-schemas/close.schema.json' assert { type: 'json' }
import DefinitionsSchema from '../../../tbdex/hosted/json-schemas/definitions.json' assert { type: 'json' }
import OfferingSchema from '../../../tbdex/hosted/json-schemas/offering.schema.json' assert { type: 'json' }
// TODO: uncomment once sdk up to latest spec offering schema
// import BalanceSchema from '../../../tbdex/hosted/json-schemas/balance.schema.json' assert { type: 'json' }
import MessageSchema from '../../../tbdex/hosted/json-schemas/message.schema.json' assert { type: 'json' }
import OrderSchema from '../../../tbdex/hosted/json-schemas/order.schema.json' assert { type: 'json' }
import OrderstatusSchema from '../../../tbdex/hosted/json-schemas/orderstatus.schema.json' assert { type: 'json' }
import QuoteSchema from '../../../tbdex/hosted/json-schemas/quote.schema.json' assert { type: 'json' }
import ResourceSchema from '../../../tbdex/hosted/json-schemas/resource.schema.json' assert { type: 'json' }
import RfqSchema from '../../../tbdex/hosted/json-schemas/rfq.schema.json' assert { type: 'json' }

const schemas = {
  close       : CloseSchema,
  definitions : DefinitionsSchema,
  offering    : OfferingSchema,
  // TODO: uncomment once sdk up to latest spec offering schema
  // balance     : BalanceSchema,
  message     : MessageSchema,
  order       : OrderSchema,
  orderstatus : OrderstatusSchema,
  quote       : QuoteSchema,
  resource    : ResourceSchema,
  rfq         : RfqSchema,
}

const validator = new Ajv({ code: { source: true, esm: true } })

for (const schemaName in schemas) {
  validator.addSchema(schemas[schemaName], schemaName)
}

const generatedCode = standaloneCode(validator)

// https://github.com/ajv-validator/ajv/issues/2209
// ESM generation is broken in AJV standalone.
// In particular, it will "require" files from AJVs runtime directory instead of "import"ing.
function replaceRequireWithImport(inputString) {
  const variableNameRegex = /\w+/; // Matches the variable name
  const moduleNameRegex = /[^"']+/; // Matches the module name
  const regex = new RegExp(
      `const\\s+(${variableNameRegex.source})\\s*=\\s*require\\s*\\(\\s*[\"'](${moduleNameRegex.source})[\"']\\s*\\)\\.default`,
      'g'
  );

  const replacedString = inputString.replace(regex, 'import { default as $1 } from "$2.js"');
  return replacedString;
}
const moduleCode = replaceRequireWithImport(generatedCode)


const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

await mkdirp(path.join(__dirname, '../generated'))
fs.writeFileSync(path.join(__dirname, '../generated/compiled-validators.js'), moduleCode)