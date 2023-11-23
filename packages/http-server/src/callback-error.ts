import type { ErrorDetail } from '@tbdex/http-client'

export class CallbackError extends Error {
  public readonly statusCode: number
  public readonly details: ErrorDetail[]

  constructor(statusCode: number, details: ErrorDetail[] = []) {
    super()

    this.name = this.constructor.name
    this.statusCode = statusCode
    this.details = details

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    Object.setPrototypeOf(this, CallbackError.prototype)
  }
}