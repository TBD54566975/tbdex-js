import { DevTools, Balance } from '@tbdex/protocol'
import type { Server } from 'http'

import { RequestContext, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { InMemoryBalancesApi } from '../src/in-memory-balances-api.js'
import Sinon from 'sinon'
import { DidJwk } from '@web5/dids'

describe('GET /balances', () => {
  let api: TbdexHttpServer
  let server: Server

  beforeEach(() => {
    api =  new TbdexHttpServer({ balances: { }, pfiDid: 'did:ex:pfi' })
    server = api.listen(8000)
  })

  afterEach(() => {
    server.close()
    server.closeAllConnections()
  })

  it('returns an array of balances', async () => {
    const pfiDid = await DidJwk.create()
    const balance = DevTools.createBalance()
    await balance.sign(pfiDid);
    (api.balancesApi as InMemoryBalancesApi).addBalance(balance)

    const response = await fetch('http://localhost:8000/balances')
    expect(response.status).to.equal(200)

    const responseBody = await response.json() as { data: Balance[] }
    expect(responseBody.data).to.exist
    expect(responseBody.data.length).to.equal(1)
    expect(responseBody.data[0]).to.deep.eq(balance.toJSON())
  })

  it('calls the callback if it is provided', async () => {
    const pfiDid = await DidJwk.create()
    const balance = DevTools.createBalance()
    await balance.sign(pfiDid);
    (api.balancesApi as InMemoryBalancesApi).addBalance(balance)

    const callbackSpy = Sinon.spy((_ctx: RequestContext) => Promise.resolve())
    api.onGetBalances(callbackSpy)

    const response = await fetch('http://localhost:8000/balances')
    expect(response.status).to.equal(200)

    expect(callbackSpy.callCount).to.eq(1)
    // TODO: Check what arguments are passed to callback after we finalize its behavior
  })
})