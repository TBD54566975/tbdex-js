export type RequestErrorParams = {
  message: string
  recipientDid: string
  url: string
  cause?: unknown
}

/**
 * Error thrown when making HTTP requests
 * @beta
 */
export class RequestError extends Error {
  public readonly recipientDid: string
  public readonly url: string

  constructor(params: RequestErrorParams) {
    super(params.message, { cause: params.cause })

    this.name = this.constructor.name
    this.recipientDid = params.recipientDid
    this.url = params.url

    Object.setPrototypeOf(this, RequestError.prototype)
  }
}