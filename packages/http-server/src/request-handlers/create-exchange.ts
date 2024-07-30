import type { OfferingsApi, ExchangesApi, CreateExchangeCallback } from '../types.js'
import { Rfq } from '@tbdex/protocol'
import type { ErrorDetail } from '@tbdex/http-client'

import { CallbackError } from '../callback-error.js'
import { Request, Response } from 'express'

type CreateExchangeOpts = {
  callback?: CreateExchangeCallback
  offeringsApi: OfferingsApi
  exchangesApi: ExchangesApi
}

/**
 * Handler for POST to /exchanges to create a new exchange.
 */
export async function createExchange(req: Request, res: Response, options: CreateExchangeOpts): Promise<void> {
  const { offeringsApi, exchangesApi, callback } = options
  const replyTo: string | undefined = req.body.replyTo

  let rfq: Rfq

  if (replyTo && !isValidUrl(replyTo)) {
    res.status(400).json({ errors: [{ detail: 'replyTo must be a valid url' }] })
    return
  }

  try {
    rfq = await Rfq.parse(req.body.message)
  } catch(e) {
    const errorResponse: ErrorDetail = { detail: `Parsing of TBDex Rfq message failed: ${e.message}` }
    res.status(400).json({ errors: [errorResponse] })
    return
  }

  // TODO: check message.from against allowlist

  const rfqExists = !! await exchangesApi.getRfq({ exchangeId: rfq.id })
  if (rfqExists) {
    const errorResponse: ErrorDetail = { detail: `rfq ${rfq.id} already exists`}
    res.status(409).json({ errors: [errorResponse] })
    return
  }

  const offering = await offeringsApi.getOffering({ id: rfq.data.offeringId })
  if (!offering) {
    const errorResponse: ErrorDetail = { detail: `offering ${rfq.data.offeringId} does not exist` }
    res.status(400).json({ errors: [errorResponse] })
    return
  }

  try {
    await rfq.verifyOfferingRequirements(offering)
  } catch(e) {
    const errorResponse: ErrorDetail = { detail: `Failed to verify offering requirements: ${e.message}` }
    res.status(400).json({ errors: [errorResponse] })
    return
  }

  if (!callback) {
    res.sendStatus(202)
    return
  }

  try {
    await callback({ request: req, response: res }, rfq, { offering, replyTo })
  } catch(e) {
    if (e instanceof CallbackError) {
      res.status(e.statusCode).json({ errors: e.details })
      return
    } else {
      const errorDetail: ErrorDetail = { detail: 'Internal Server Error' }
      res.status(500).json({ errors: [errorDetail] })
      return
    }
  }

  res.sendStatus(202)
  return
}

function isValidUrl(replyToUrl: string) {
  try {
    new URL(replyToUrl)
    return true
  } catch (err) {
    return false
  }
}