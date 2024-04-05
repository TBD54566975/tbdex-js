export type ValidationErrorParams = {
  message: string
}

/**
 * Error thrown when validating data
 * @beta
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)

    this.name = this.constructor.name
  }
}

/**
 * Error thrown when a DID is invalid
 * @beta
 */
export class InvalidDidError extends ValidationError { }

/**
 * Error thrown when a PFI's service endpoint can't be found
 * @beta
 */
export class MissingServiceEndpointError extends ValidationError { }