import type { ExchangesApi, GetExchangeCallback } from '../types.js'
import { TbdexHttpClient } from '@tbdex/http-client'
import { Message } from '@tbdex/protocol'
import { Request, Response } from 'express'

type GetExchangeOpts = {
  callback?: GetExchangeCallback
  exchangesApi: ExchangesApi
  pfiDid: string
}

export async function getExchange(request: Request, response: Response, opts: GetExchangeOpts): Promise<void> {
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

  const exchange = await exchangesApi.getExchange({ id: request.params.exchangeId })
  if (exchange === undefined) {
    response.status(404).json({ errors: [{ detail: `No exchange found with exchangeId ${request.params.exchangeId}` }] })
    return
  } else {
    if (exchange.rfq!.metadata.from !== requesterDid) {
      response.status(403).json({ errors: [{ detail: `Forbidden` }] })
      return
    }
  }

  if (callback) {
    // TODO: figure out what to do with callback result. should we pass through the exchanges we've fetched
    //       and allow the callback to modify what's returned? (issue #10)
    const _result = await callback({ request, response })
  }

  const data: Message[] = exchange.messages

  response.status(200).json({ data })
}