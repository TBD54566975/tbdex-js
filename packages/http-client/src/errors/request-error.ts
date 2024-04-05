/**
 * Parameters for creating a RequestError
 * @beta
 */
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
  /** string DID of the recipient */
  public readonly recipientDid: string
  /** URL of the request */
  public readonly url: string

  constructor(params: RequestErrorParams) {
    super(params.message, { cause: params.cause })

    this.name = this.constructor.name
    this.recipientDid = params.recipientDid
    this.url = params.url
  }
}