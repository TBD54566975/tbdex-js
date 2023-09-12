import type { SubmitCallback, RequestHandler, OfferingsApi, ExchangesApi } from '../types.js'
import type { MessageKind } from '@tbdex/protocol'
import type { ErrorDetail } from '@tbdex/http-client'

import { Message } from '@tbdex/protocol'

type SubmitRfqOpts = {
  callback: SubmitCallback<'rfq'>
  offeringsApi: OfferingsApi
  exchangesApi: ExchangesApi
}

export function submitRfq(options: SubmitRfqOpts): RequestHandler {
  const { offeringsApi, exchangesApi, callback } = options
  return async function (req, res) {
    let message: Message<MessageKind>

    try {
      message = await Message.parse(req.body)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: e.message }
      return res.status(400).json({ errors: [errorResponse] })
    }

    if (!message.isRfq()) {
      const errorResponse: ErrorDetail = { detail: 'expected request body to be a valid rfq' }
      return res.status(400).json({ errors: [errorResponse] })
    }

    // TODO: check message.from against allowlist

    const rfqExists = !! await exchangesApi.getRfq({ exchangeId: message.id })
    if (rfqExists) {
      return res.status(409).json({ errors: [`rfq ${message.id} already exists`] })
    }

    const offering = await offeringsApi.getOffering({ id: message.data.offeringId })
    if (!offering) {
      return res.status(400).json({ errors: [`offering ${message.data.offeringId} does not exist`] })
    }

    try {
      message.verifyOfferingRequirements(offering)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: `Failed to verify offering requirements: ${e.message}` }
      return res.status(400).json({ errors: [errorResponse] })
    }

    if (!callback) {
      return res.sendStatus(202)
    }

    try {
      // TODO: figure out what to do with callback result, if anything. (issue #7)
      const _result = await callback({ request: req, response: res }, message)
    } catch(e) {
      // TODO: handle error lewl (#issue 8)
    }

    return res.sendStatus(202)
  }
}