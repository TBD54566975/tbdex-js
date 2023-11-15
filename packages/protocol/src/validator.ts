import type { ErrorObject } from 'ajv'
// validator functions are compiled at build time. check ./build/compile-validators.js for more details
import * as compiledValidators from '../generated/compiled-validators.js'

/**
 * validates the payload against a json schema identified by name
 * @param payload - the payload to validate
 */
export function validate(payload: any, schemaName: string): void {
  let validateFn = (compiledValidators as any)[schemaName]

  if (!validateFn) {
    throw new Error(`no validator found for ${schemaName}`)
  }

  validateFn(payload)

  if (validateFn.errors) {
    handleValidationError(validateFn.errors)
  }
}

function handleValidationError(errors: ErrorObject[]) {
  let combinedMessage = ''

  errors.forEach((errorObj, index) => {
    let { instancePath, message, params } = errorObj

    instancePath ||= 'message'

    // If an error occurs for a property with an enum type, add allowedValues to the message
    message = params.allowedValues ? `${message} - ${params.allowedValues.join(', ')}` : message

    combinedMessage += `${index + 1}. ${instancePath}: ${message}\n`
  })

  throw new Error(combinedMessage)
}