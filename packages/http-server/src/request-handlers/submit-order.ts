import type { RequestHandler, ExchangesApi, SubmitOrderCallback } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'
import { Order, Quote } from '@tbdex/protocol'

import { CallbackError } from '../callback-error.js'

type SubmitOrderOpts = {
  callback: SubmitOrderCallback
  exchangesApi: ExchangesApi
}

export function submitOrder(opts: SubmitOrderOpts): RequestHandler {
  const { callback, exchangesApi } = opts

  return async function (req, res) {
    let order: Order

    try {
      order = await Order.parse(req.body)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: e.message }
      return res.status(400).json({ errors: [errorResponse] })
    }

    const exchange = await exchangesApi.getExchange({id: order.exchangeId})
    if(exchange == undefined) {
      const errorResponse: ErrorDetail = { detail: `No exchange found for ${order.exchangeId}` }

      return res.status(404).json({ errors: [errorResponse] })
    }

    const last = exchange[exchange.length-1]
    if(!last.validNext.has('order')) {
      const errorResponse: ErrorDetail = { detail: `Cannot submit Order for an exchange where the last message is kind: ${last.kind}` }

      return res.status(409).json({ errors: [errorResponse] })
    }

    const quote = exchange.find((message) => message.isQuote()) as Quote
    if(quote == undefined) {
      const errorResponse: ErrorDetail = { detail: 'Quote not found' }
      return res.status(404).json({errors: [errorResponse]})
    }

    if(new Date(quote.data.expiresAt) < new Date(order.metadata.createdAt)){
      const errorResponse: ErrorDetail = { detail: `Quote is expired` }

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
}