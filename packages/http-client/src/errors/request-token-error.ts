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