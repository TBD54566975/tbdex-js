import { Request, Response } from 'express'
import type { GetBalancesCallback, BalancesApi } from '../types.js'

type GetBalancesOpts = {
  callback?: GetBalancesCallback
  balancesApi: BalancesApi
}

export async function getBalances(request: Request, response: Response, opts: GetBalancesOpts): Promise<void> {
  const { callback, balancesApi } = opts

  const balances = await balancesApi.getBalances()

  if (callback) {
    // TODO: figure out what to do with callback result. should we pass through the offerings we've fetched
    //       and allow the callback to modify what's returned? (issue #11)
    await callback({ request, response })
  }

  response.status(200).json({ data: balances })
}