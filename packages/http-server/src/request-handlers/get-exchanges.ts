import type { ExchangesApi, GetExchangesCallback, GetExchangesFilter } from '../types.js'

import { TbdexHttpClient } from '@tbdex/http-client'
import { Request, Response } from 'express'

type GetExchangesOpts = {
  callback?: GetExchangesCallback
  exchangesApi: ExchangesApi,
  pfiDid: string
}

export async function getExchanges(request: Request, response: Response, opts: GetExchangesOpts): Promise<void> {
  const { callback, exchangesApi, pfiDid } = opts

  const authzHeader = request.headers['authorization']
  if (!authzHeader) {
    response.status(401).json({ errors: [{ detail: 'Authorization header required' }] })
    return
  }

  const [_, requestToken] = authzHeader.split('Bearer ')

  if (!requestToken) {
    response.status(401).json({ errors: [{ detail: 'Malformed Authorization header. Expected: Bearer TOKEN_HERE' }] })
    return
  }

  let requesterDid: string
  try {
    requesterDid = await TbdexHttpClient.verifyRequestToken({ requestToken: requestToken, pfiDid })
  } catch(e) {
    response.status(401).json({ errors: [{ detail: `Malformed Authorization header: ${e}` }] })
    return
  }

  const queryParams: GetExchangesFilter = {
    from: requesterDid,
  }

  if (request.query.id !== undefined) {
    if (Array.isArray(request.query.id)) {
      queryParams.id = request.query.id.map((id) => id.toString())
    } else {
      queryParams.id = [request.query.id.toString()]
    }
  }

  const exchanges = await exchangesApi.getExchanges({ filter: queryParams })

  if (callback) {
    // TODO: figure out what to do with callback result. should we pass through the exchanges we've fetched
    //       and allow the callback to modify what's returned? (issue #10)
    const _result = await callback({ request, response }, queryParams)
  }

  response.status(200).json({ data: exchanges })
}