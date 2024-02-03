import type { ExchangesApi, SubmitOrderCallback } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'
import { Order } from '@tbdex/protocol'

import { CallbackError } from '../callback-error.js'
import { Request, Response } from 'express'

type SubmitOrderOpts = {
  callback?: SubmitOrderCallback
  exchangesApi: ExchangesApi
}

export async function submitOrder(req: Request, res: Response, opts: SubmitOrderOpts): Promise<any> {
  const { callback, exchangesApi } = opts

  let order: Order

  try {
    order = await Order.parse(req.body)
  } catch(e) {
    const errorResponse: ErrorDetail = { detail: 'Request body was not a valid Order message' }
    return res.status(400).json({ errors: [errorResponse] })
  }

  const exchange = await exchangesApi.getExchange({id: order.exchangeId})
  if(exchange == undefined) {
    const errorResponse: ErrorDetail = { detail: `No exchange found for ${order.exchangeId}` }

    return res.status(404).json({ errors: [errorResponse] })
  }

  if(!exchange.isValidNext('order')) {
    const errorResponse: ErrorDetail = {
      detail: `Cannot submit Order for an exchange where the last message is kind: ${exchange.latestMessage!.metadata}`
    }

    return res.status(409).json({ errors: [errorResponse] })
  }

  if(new Date(exchange.quote!.data.expiresAt) < new Date()){
    const errorResponse: ErrorDetail = { detail: 'Quote is expired' }

    return res.status(410).json({ errors: [errorResponse] })
  }

  if (!callback) {
    return res.sendStatus(202)
  }

  try {
    await callback({ request: req, response: res }, order)
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