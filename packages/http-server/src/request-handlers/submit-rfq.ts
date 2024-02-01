import type { RequestHandler, OfferingsApi, ExchangesApi, SubmitRfqCallback } from '../types.js'
import { Rfq } from '@tbdex/protocol'
import type { ErrorDetail } from '@tbdex/http-client'

import { CallbackError } from '../callback-error.js'

type SubmitRfqOpts = {
  callback: SubmitRfqCallback
  offeringsApi: OfferingsApi
  exchangesApi: ExchangesApi
}

export function submitRfq(options: SubmitRfqOpts): RequestHandler {
  const { offeringsApi, exchangesApi, callback } = options
  return async function (req, res) {
    let rfq: Rfq

    try {
      rfq = await Rfq.parse(req.body)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: `Parsing of TBDex Rfq message failed: ${e.message}` }
      return res.status(400).json({ errors: [errorResponse] })
    }

    // TODO: check message.from against allowlist

    const rfqExists = !! await exchangesApi.getRfq({ exchangeId: rfq.id })
    if (rfqExists) {
      const errorResponse: ErrorDetail = { detail: `rfq ${rfq.id} already exists`}
      return res.status(409).json({ errors: [errorResponse] })
    }

    const offering = await offeringsApi.getOffering({ id: rfq.data.offeringId })
    if (!offering) {
      const errorResponse: ErrorDetail = { detail: `offering ${rfq.data.offeringId} does not exist` }
      return res.status(400).json({ errors: [errorResponse] })
    }

    try {
      await rfq.verifyOfferingRequirements(offering)
    } catch(e) {
      const errorResponse: ErrorDetail = { detail: `Failed to verify offering requirements: ${e.message}` }
      return res.status(400).json({ errors: [errorResponse] })
    }

    if (!callback) {
      return res.sendStatus(202)
    }

    try {
      await callback({ request: req, response: res }, rfq, { offering })
    } catch(e) {
      if (e instanceof CallbackError) {
        return res.status(e.statusCode).json({ errors: e.details })
      } else {
        const errorDetail: ErrorDetail = { detail: 'Internal Server Error' }
        return res.status(500).json({ errors: [errorDetail] })
      }
    }

    return res.sendStatus(202)
  }
}
