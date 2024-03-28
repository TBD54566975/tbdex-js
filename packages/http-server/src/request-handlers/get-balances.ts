import { Request, Response } from 'express'
import type { GetBalancesCallback, BalancesApi } from '../types.js'
import { TbdexHttpClient } from '@tbdex/http-client'

type GetBalancesOpts = {
  callback?: GetBalancesCallback
  balancesApi: BalancesApi,
  pfiDid: string
}

export async function getBalances(request: Request, response: Response, opts: GetBalancesOpts): Promise<void> {
  const { callback, balancesApi, pfiDid } = opts

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

  const balances = await balancesApi.getBalances({ requesterDid })

  if (callback) {
    // TODO: figure out what to do with callback result. should we pass through the offerings we've fetched
    //       and allow the callback to modify what's returned? (issue #11)
    await callback({ request, response })
  }

  response.status(200).json({ data: balances })
}