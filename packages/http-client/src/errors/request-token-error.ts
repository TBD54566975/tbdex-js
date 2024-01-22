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

/**
   * Error thrown when a request token cannot be signed
   * @beta
   */
export class RequestTokenSigningError extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, RequestTokenSigningError.prototype)
  }
}

/**
   * Error thrown when a request token cannot be verified
   * @beta
   */
export class RequestTokenVerificationError extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, RequestTokenVerificationError.prototype)
  }
}

// TODO: remove once PR is pulled into Web5 Credentials pkg: https://github.com/TBD54566975/web5-js/pull/366
/**
   * Error thrown when a request token is expired
   * @beta
   */
export class RequestTokenExpiredError extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, RequestTokenExpiredError.prototype)
  }
}

/**
   * Error thrown when a request token is missing required claims
   * @beta
   */
export class RequestTokenMissingClaimsError extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, RequestTokenMissingClaimsError.prototype)
  }
}

/**
   * Error thrown when a request token aud does not match the PFI did for which its intended
   * @beta
   */
export class RequestTokenAudienceMismatchError extends RequestTokenError {
  constructor(params: RequestTokenErrorParams) {
    super(params)

    Object.setPrototypeOf(this, RequestTokenAudienceMismatchError.prototype)
  }
}