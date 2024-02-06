import type { RequestHandler, ExchangesApi, SubmitCloseCallback } from '../types.js'
import type { ErrorDetail } from '@tbdex/http-client'

import { Close } from '@tbdex/protocol'
import { CallbackError } from '../callback-error.js'

type SubmitCloseOpts = {
  callback: SubmitCloseCallback
  exchangesApi: ExchangesApi
}

export function submitClose(opts: SubmitCloseOpts): RequestHandler {
  const { callback, exchangesApi } = opts

  return async function (req, res) {
    let close: Close

    try {
      close = await Close.parse(req.body)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: e.message }
      return res.status(400).json({ errors: [errorResponse] })
    }

    const exchange = await exchangesApi.getExchange({id: close.exchangeId})
    if(exchange == undefined) {
      const errorResponse: ErrorDetail = { detail: `No exchange found for ${close.exchangeId}` }

      return res.status(404).json({ errors: [errorResponse] })
    }

    const last = exchange[exchange.length-1]
    if(!last.validNext.has(close.kind)) {
      const errorResponse: ErrorDetail = { detail: `cannot submit Close for an exchange where the last message is kind: ${last.kind}` }

      return res.status(409).json({ errors: [errorResponse] })
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
}
