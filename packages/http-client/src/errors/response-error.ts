import type { ErrorDetail } from '../types.js'

/**
 * Params for creating ResponseError
 * @beta
 */
export type ResponseErrorParams = {
  /** HTTP status code of the error */
  statusCode: number
  /** Array of ErrorDetails */
  details: ErrorDetail[]
  /** String DID of the recipient of the error */
  recipientDid: string
  /** URL where the error was thrown */
  url: string
}

/**
 * Error thrown when getting HTTP responses
 * @beta
 */
export class ResponseError extends Error {
  /** HTTP status code of the error */
  public readonly statusCode: number
  /** Array of ErrorDetails */
  public readonly details: ErrorDetail[]
  /** String DID of the recipient of the error */
  public readonly recipientDid: string
  /** URL where the error was thrown */
  public readonly url: string

  constructor(params: ResponseErrorParams) {
    super()

    this.name = this.constructor.name
    this.statusCode = params.statusCode
    this.details = params.details
    this.recipientDid = params.recipientDid
    this.url = params.url
  }
}