import type { GetOfferingsCallback, GetOfferingsFilter, OfferingsApi, RequestHandler } from '../types.js'

type GetOfferingsOpts = {
  callback: GetOfferingsCallback
  offeringsApi: OfferingsApi
}

export function getOfferings(opts: GetOfferingsOpts): RequestHandler {
  const { callback, offeringsApi } = opts

  return async function (request, response) {
    const queryParams = request.query as GetOfferingsFilter
    const offerings = await offeringsApi.getOfferings({ filter: queryParams || {} })

    if (callback) {
      // TODO: figure out what to do with callback result. should we pass through the offerings we've fetched
      //       and allow the callback to modify what's returned? (issue #11)
      await callback({ request, response }, queryParams)
    }

    return response.status(200).json({ data: offerings })
  }
}