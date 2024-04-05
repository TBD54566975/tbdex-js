import type { ErrorDetail } from '@tbdex/http-client'


/**
 * Error thrown by handler callbacks
 * @beta
 */
export class CallbackError extends Error {
  /** Error HTTP Response status code: 400 - Bad Request, 401 - Unauthorized, 500 etc.  */
  public readonly statusCode: number

  /** List with full error details objects received from the PFI server response */
  public readonly details: ErrorDetail[]

  constructor(statusCode: number, details: ErrorDetail[] = []) {
    super()

    this.name = this.constructor.name
    this.statusCode = statusCode
    this.details = details

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}