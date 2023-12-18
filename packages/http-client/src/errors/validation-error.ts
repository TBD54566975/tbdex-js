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

export class InvalidDidError extends ValidationError {
  constructor(message: string) {
    super(message)

    Object.setPrototypeOf(this, InvalidDidError.prototype)
  }
}

export class InvalidServiceEndpointError extends ValidationError {
  constructor(message: string) {
    super(message)

    Object.setPrototypeOf(this, InvalidServiceEndpointError.prototype)
  }
}