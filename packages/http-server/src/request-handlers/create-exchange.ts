import type { SubmitCallback, RequestHandler, OfferingsApi, ExchangesApi } from '../types.js'
import type { MessageKind } from '@tbdex/protocol'
import type { ErrorDetail } from '@tbdex/http-client'

import { Message } from '@tbdex/protocol'
import { CallbackError } from '../callback-error.js'

type CreateExchangeOpts = {
  callback: SubmitCallback<'rfq'>
  offeringsApi: OfferingsApi
  exchangesApi: ExchangesApi
}

export function createExchange(options: CreateExchangeOpts): RequestHandler {
  const { offeringsApi, exchangesApi, callback } = options
  return async function (req, res) {
    let message: Message<MessageKind>

    if (req.body.replyTo && !isValidUrl(req.body.replyTo)) {
      return res.status(400).json({ errors: [{ detail: 'replyTo must be a valid url' }] })
    }

    try {
      message = await Message.parse(req.body.rfq)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: `Parsing of TBDex message failed: ${e.message}` }
      return res.status(400).json({ errors: [errorResponse] })
    }

    if (!message.isRfq()) {
      const errorResponse: ErrorDetail = { detail: 'expected request body to be a valid rfq' }
      return res.status(400).json({ errors: [errorResponse] })
    }

    // TODO: check message.from against allowlist

    const rfqExists = !! await exchangesApi.getRfq({ exchangeId: message.id })
    if (rfqExists) {
      const errorResponse: ErrorDetail = { detail: `rfq ${message.id} already exists`}
      return res.status(409).json({ errors: [errorResponse] })
    }

    const offering = await offeringsApi.getOffering({ id: message.data.offeringId })
    if (!offering) {
      const errorResponse: ErrorDetail = { detail: `offering ${message.data.offeringId} does not exist` }
      return res.status(400).json({ errors: [errorResponse] })
    }

    try {
      await message.verifyOfferingRequirements(offering)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: `Failed to verify offering requirements: ${e.message}` }
      return res.status(400).json({ errors: [errorResponse] })
    }

    if (!callback) {
      return res.sendStatus(202)
    }

    try {
      await callback({ request: req, response: res }, message, { offering })
    } catch(e) {
      if (e instanceof CallbackError) {
        return res.status(e.statusCode).json({ errors: e.details })
      } else {
        const errorDetail: ErrorDetail = { detail: 'umm idk' }
        return res.status(500).json({ errors: [errorDetail] })
      }
    }

    return res.sendStatus(202)
  }
}

function isValidUrl(urlStr: string) {
  try {
    new URL(urlStr)
    return true
  } catch (err) {
    return false
  }
}