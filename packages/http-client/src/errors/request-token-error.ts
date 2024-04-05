// TODO: decide whether this should be a ValidationError

/**
 * Params for creating RequestTokenError
 * @beta
 */
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
  }
}

/**
   * Error thrown when a request token cannot be signed
   * @beta
   */
export class RequestTokenSigningError extends RequestTokenError { }

/**
   * Error thrown when a request token cannot be verified
   * @beta
   */
export class RequestTokenVerificationError extends RequestTokenError { }

/**
   * Error thrown when a request token is missing required claims
   * @beta
   */
export class RequestTokenMissingClaimsError extends RequestTokenError { }

/**
   * Error thrown when a request token aud does not match the PFI did for which its intended
   * @beta
   */
export class RequestTokenAudienceMismatchError extends RequestTokenError { }

/**
   * Error thrown when a request token payload iss does not match request token header kid
   * @beta
   */
export class RequestTokenIssuerSignerMismatchError extends RequestTokenError { }