import type { ExchangesApi, SubmitCloseCallback, SubmitOrderCallback } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'
import { Message } from '@tbdex/protocol'

import { Request, Response } from 'express'
import { submitOrder } from './submit-order.js'
import { submitClose } from './submit-close.js'
import { Parser } from '@tbdex/protocol'

type SubmitMessageOpts = {
  submitOrderCallback?: SubmitOrderCallback
  submitCloseCallback?: SubmitCloseCallback
  exchangesApi: ExchangesApi
}

export async function submitMessage(req: Request, res: Response, opts: SubmitMessageOpts): Promise<void> {
  let message: Message

  try {
    message = await Parser.parseMessage(req.body.message)
  } catch(e) {
    const errorResponse: ErrorDetail = { detail: 'Request body was not a valid Order or Close message' }
    res.status(400).json({ errors: [errorResponse] })
    return
  }

  if (message.metadata.exchangeId !== req.params.exchangeId) {
    const errorResponse: ErrorDetail = { detail: 'ExchangeId in message did not match exchangeId in path' }
    res.status(400).json({ errors: [errorResponse] })
    return
  }

  if (message.isOrder()) {
    await submitOrder(message, req, res, {
      callback     : opts.submitOrderCallback,
      exchangesApi : opts.exchangesApi,
    })
  } else if (message.isClose()) {
    await submitClose(message, req, res, {
      callback     : opts.submitCloseCallback,
      exchangesApi : opts.exchangesApi,
    })
  } else {
    const errorResponse: ErrorDetail = { detail: 'Request body was not a valid Order or Close message' }
    res.status(400).json({ errors: [errorResponse] })
    return
  }
}