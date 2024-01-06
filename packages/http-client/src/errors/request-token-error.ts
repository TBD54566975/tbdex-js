// TODO: decide whether this should be a ValidationError

export type RequestTokenErrorParams = {
  message: string
  cause?: unknown
}

/**
 * Error thrown for request token related things
 * @beta
 */
export class RequestTokenError extends Error {
  constructor(params: RequestTokenErrorParams) {
    super(params.message, { cause: params.cause })

    this.name = this.constructor.name

    Object.setPrototypeOf(this, RequestTokenError.prototype)
  }
}

// TODO: remove once PR is pulled into Web5 Credentials pkg: https://github.com/TBD54566975/web5-js/pull/366
/**
 * Error thrown when a request token is expired
 * @beta
 */
export class ExpiredRequestTokenError extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, ExpiredRequestTokenError.prototype)
  }
}

/**
 * Error thrown when a request token is missing required claims
 * @beta
 */
export class MissingRequiredClaimsError extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, MissingRequiredClaimsError.prototype)
  }
}

/**
 * Error thrown when a request token aud does not match the PFI did for which its intended
 * @beta
 */
export class RequestTokenAudiencePfiMismatch extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, RequestTokenAudiencePfiMismatch.prototype)
  }
}