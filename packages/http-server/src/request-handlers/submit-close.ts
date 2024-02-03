import type { ExchangesApi, SubmitCloseCallback } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'

import { Close } from '@tbdex/protocol'
import { CallbackError } from '../callback-error.js'
import { Request, Response } from 'express'

type SubmitCloseOpts = {
  callback?: SubmitCloseCallback
  exchangesApi: ExchangesApi
}

export async function submitClose(req: Request, res: Response, opts: SubmitCloseOpts): Promise<any> {
  const { callback, exchangesApi } = opts

  let close: Close

  try {
    close = await Close.parse(req.body)
  } catch(e) {
    const errorResponse: ErrorDetail = { detail: 'Request body was not a valid Close message' }
    return res.status(400).json({ errors: [errorResponse] })
  }

  // Ensure that an exchange exists to be closed
  const exchange = await exchangesApi.getExchange({ id: close.exchangeId })

  if(exchange === undefined || exchange.messages.length === 0) {
    const errorResponse: ErrorDetail = { detail: `No exchange found for ${close.exchangeId}` }

    return res.status(404).json({ errors: [errorResponse] })
  }

  // Ensure this exchange can be Closed
  if(!exchange.isValidNext(close.metadata.kind)) {
    const errorResponse: ErrorDetail = {
      detail: `cannot submit Close for an exchange where the last message is kind: ${exchange.latestMessage!.metadata.kind}`
    }

    return res.status(409).json({ errors: [errorResponse] })
  }

  // Ensure that Close is from either Alice or PFI
  const rfq = exchange.rfq!
  if (close.metadata.from === rfq.metadata.from && close.metadata.to === rfq.metadata.to) {
    // Alice may Close an exchange
  } else if (close.metadata.from === rfq.metadata.to && close.metadata.to === rfq.metadata.from) {
    // The PFI may Close an exchange
  } else {
    const errorResponse: ErrorDetail = {
      detail: `Only the creator and receiver of an exchange may close the exchange`
    }

    return res.status(400).json({ errors: [errorResponse] })
  }

  if (!callback) {
    return res.sendStatus(202)
  }

  try {
    await callback({ request: req, response: res }, close)
    return res.sendStatus(202)
  } catch(e) {
    if (e instanceof CallbackError) {
      return res.status(e.statusCode).json({ errors: e.details })
    } else {
      const errorDetail: ErrorDetail = { detail: 'Internal Server Error' }
      return res.status(500).json({ errors: [errorDetail] })
    }
  }
}
