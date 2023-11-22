import type { SubmitCallback, RequestHandler, ExchangesApi } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'
import type { MessageKind } from '@tbdex/protocol'

import { Message } from '@tbdex/protocol'

type SubmitOrderOpts = {
  callback: SubmitCallback<'order'>
  exchangesApi: ExchangesApi
}

export function submitOrder(opts: SubmitOrderOpts): RequestHandler {
  const { callback, exchangesApi } = opts

  return async function (req, res) {
    let message: Message<MessageKind>

    try {
      message = await Message.parse(req.body)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: e.message }
      return res.status(400).json({ errors: [errorResponse] })
    }

    if (!message.isOrder()) {
      const errorResponse: ErrorDetail = { detail: 'expected request body to be a valid order' }
      return res.status(400).json({ errors: [errorResponse] })
    }

    // TODO: return 409 if order is not allowed given the current state of the exchange. (#issue 4)

    const quote = await exchangesApi.getQuote({ exchangeId: message.exchangeId })
    if(quote == undefined) {
      const errorResponse: ErrorDetail = { detail: 'quote is undefined' }
      return res.status(404).json({errors: [errorResponse]})
    }

    if (!callback) {
      return res.sendStatus(202)
    }

    try {
      // TODO: figure out what to do with callback result, if anything. (#issue 5)
      const _result = await callback({ request: req, response: res }, message, undefined)
      return res.sendStatus(202)
    } catch(e) {
      // TODO: handle error lewl
    }
  }
}