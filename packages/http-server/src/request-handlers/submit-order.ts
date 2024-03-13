import type { ExchangesApi, SubmitOrderCallback } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'
import { Order } from '@tbdex/protocol'

import { CallbackError } from '../callback-error.js'
import { Request, Response } from 'express'

type SubmitOrderOpts = {
  callback?: SubmitOrderCallback
  exchangesApi: ExchangesApi
}

export async function submitOrder(order: Order, req: Request, res: Response, opts: SubmitOrderOpts): Promise<void> {
  const { callback, exchangesApi } = opts

  const exchange = await exchangesApi.getExchange({id: order.exchangeId})
  if(exchange == undefined) {
    const errorResponse: ErrorDetail = { detail: `No exchange found for ${order.exchangeId}` }

    res.status(404).json({ errors: [errorResponse] })
    return
  }

  if(!exchange.isValidNext('order')) {
    const errorResponse: ErrorDetail = {
      detail: `Cannot submit Order for an exchange where the last message is kind: ${exchange.latestMessage!.metadata}`
    }

    res.status(409).json({ errors: [errorResponse] })
    return
  }

  if(new Date(exchange.quote!.data.expiresAt) < new Date()){
    const errorResponse: ErrorDetail = { detail: 'Quote is expired' }

    res.status(410).json({ errors: [errorResponse] })
    return
  }

  if (!callback) {
    res.sendStatus(202)
    return
  }

  try {
    await callback({ request: req, response: res }, order)
    res.sendStatus(202)
  } catch(e) {
    if (e instanceof CallbackError) {
      res.status(e.statusCode).json({ errors: e.details })
    } else {
      const errorDetail: ErrorDetail = { detail: 'Internal Server Error' }
      res.status(500).json({ errors: [errorDetail] })
    }
  }
}