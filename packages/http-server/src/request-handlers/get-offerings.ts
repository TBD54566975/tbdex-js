import { Request, Response } from 'express'
import type { GetOfferingsCallback, GetOfferingsFilter, OfferingsApi } from '../types.js'

type GetOfferingsOpts = {
  callback?: GetOfferingsCallback
  offeringsApi: OfferingsApi
}

export async function getOfferings(request: Request, response: Response, opts: GetOfferingsOpts): Promise<any> {
  const { callback, offeringsApi } = opts

  const filter: GetOfferingsFilter = {
    payinCurrency    : request.query.payinCurrency?.toString(),
    payoutCurrency   : request.query.payoutCurrency?.toString(),
    payinMethodKind  : request.query.payinMethodKind?.toString(),
    payoutMethodKind : request.query.payoutMethodKind?.toString(),
    id               : request.query.id?.toString(),
  }

  const offerings = await offeringsApi.getOfferings({ filter })

  if (callback) {
    // TODO: figure out what to do with callback result. should we pass through the offerings we've fetched
    //       and allow the callback to modify what's returned? (issue #11)
    await callback({ request, response }, filter)
  }

  return response.status(200).json({ data: offerings })
}