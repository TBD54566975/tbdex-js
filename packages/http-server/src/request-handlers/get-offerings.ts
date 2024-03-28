import { Request, Response } from 'express'
import type { GetOfferingsCallback, OfferingsApi } from '../types.js'

type GetOfferingsOpts = {
  callback?: GetOfferingsCallback
  offeringsApi: OfferingsApi
}

export async function getOfferings(request: Request, response: Response, opts: GetOfferingsOpts): Promise<void> {
  const { callback, offeringsApi } = opts

  const offerings = await offeringsApi.getOfferings()

  if (callback) {
    // TODO: figure out what to do with callback result. should we pass through the offerings we've fetched
    //       and allow the callback to modify what's returned? (issue #11)
    await callback({ request, response }, {})
  }

  response.status(200).json({ data: offerings })
}