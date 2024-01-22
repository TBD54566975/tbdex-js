import type { SubmitCallback, RequestHandler, ExchangesApi } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'
import type { MessageKind } from '@tbdex/protocol'

import { Message } from '@tbdex/protocol'
import { CallbackError } from '../callback-error.js'

type SubmitCloseOpts = {
  callback: SubmitCallback<'close'>
  exchangesApi: ExchangesApi
}

export function submitClose(opts: SubmitCloseOpts): RequestHandler {
  const { callback, exchangesApi } = opts

  return async function (req, res) {
    let message: Message<MessageKind>

    try {
      message = await Message.parse(req.body)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: e.message }
      return res.status(400).json({ errors: [errorResponse] })
    }

    if (!message.isClose()) {
      const errorResponse: ErrorDetail = { detail: 'expected request body to be a valid close' }
      return res.status(400).json({ errors: [errorResponse] })
    }

    const exchange = await exchangesApi.getExchange({id: message.exchangeId})
    if(exchange == undefined) {
      const errorResponse: ErrorDetail = { detail: `No exchange found for ${message.exchangeId}` }

      return res.status(404).json({ errors: [errorResponse] })
    }

    const last = exchange[exchange.length-1]
    if(!last.validNext.has(message.kind)) {
      const errorResponse: ErrorDetail = { detail: `cannot submit Close for an exchange where the last message is kind: ${last.kind}` }

      return res.status(409).json({ errors: [errorResponse] })
    }

    if (!callback) {
      return res.sendStatus(202)
    }

    try {
      await callback({ request: req, response: res }, message, undefined)
      return res.sendStatus(202)
    } catch(e) {
      if (e instanceof CallbackError) {
        return res.status(e.statusCode).json({ errors: e.details })
      } else {
        const errorDetail: ErrorDetail = { detail: 'umm idk' }
        return res.status(500).json({ errors: [errorDetail] })
      }
    }
  }
}