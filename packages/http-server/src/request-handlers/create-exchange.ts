import type { OfferingsApi, ExchangesApi, SubmitRfqCallback } from '../types.js'
import { Rfq } from '@tbdex/protocol'
import type { ErrorDetail } from '@tbdex/http-client'

import { CallbackError } from '../callback-error.js'
import { Request, Response } from 'express'

type CreateExchangeOpts = {
  callback?: SubmitRfqCallback
  offeringsApi: OfferingsApi
  exchangesApi: ExchangesApi
}

export async function createExchange(req: Request, res: Response, options: CreateExchangeOpts): Promise<any> {
  const { offeringsApi, exchangesApi, callback } = options
  const replyTo: string | undefined = req.body.replyTo

  let rfq: Rfq

  if (replyTo && !isValidUrl(replyTo)) {
    return res.status(400).json({ errors: [{ detail: 'replyTo must be a valid url' }] })
  }

  try {
    rfq = await Rfq.parse(req.body.rfq)
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
    await callback({ request: req, response: res }, rfq, { offering, replyTo })
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

function isValidUrl(replyToUrl: string) {
  try {
    new URL(replyToUrl)
    return true
  } catch (err) {
    return false
  }
}