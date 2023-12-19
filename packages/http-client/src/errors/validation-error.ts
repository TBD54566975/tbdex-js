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

    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Error thrown when a DID is invalid
 * @beta
 */
export class InvalidDidError extends ValidationError {
  constructor(message: string) {
    super(message)

    Object.setPrototypeOf(this, InvalidDidError.prototype)
  }
}

/**
 * Error thrown when a PFI's service endpoint can't be found
 * @beta
 */
export class MissingServiceEndpointError extends ValidationError {
  constructor(message: string) {
    super(message)

    Object.setPrototypeOf(this, MissingServiceEndpointError.prototype)
  }
}