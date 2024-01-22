import type { ErrorDetail } from '../types.js'

export type ResponseErrorParams = {
  statusCode: number
  details: ErrorDetail[]
  recipientDid: string
  url: string
}

/**
 * Error thrown when getting HTTP responses
 * @beta
 */
export class ResponseError extends Error {
  public readonly statusCode: number
  public readonly details: ErrorDetail[]
  public readonly recipientDid: string
  public readonly url: string

  constructor(params: ResponseErrorParams) {
    super()

    this.name = this.constructor.name
    this.statusCode = params.statusCode
    this.details = params.details
    this.recipientDid = params.recipientDid
    this.url = params.url

    Object.setPrototypeOf(this, ResponseError.prototype)
  }
}