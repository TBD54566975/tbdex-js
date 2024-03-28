import { DevTools, Balance } from '@tbdex/protocol'
import type { Server } from 'http'

import { ErrorDetail, RequestContext, TbdexHttpServer } from '../src/main.js'
import { expect } from 'chai'
import { InMemoryBalancesApi } from '../src/in-memory-balances-api.js'
import Sinon from 'sinon'
import { DidJwk } from '@web5/dids'
import { TbdexHttpClient } from '@tbdex/http-client'

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

  it('returns a 401 if no Authorization header is provided', async () => {
    const resp = await fetch('http://localhost:8000/balances')

    expect(resp.ok).to.be.false
    expect(resp.status).to.equal(401)

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Authorization')
  })

  it('returns 401 if bearer token is missing from the Authorization header', async () => {
    const resp = await fetch('http://localhost:8000/balances', {
      headers: {
        'Authorization': 'Not well formatted token'
      }
    })

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Malformed Authorization header. Expected: Bearer TOKEN_HERE')
  })

  it('returns 401 if the bearer token is malformed in the Authorization header', async () => {
    const resp = await fetch('http://localhost:8000/balances', {
      headers: {
        'Authorization': 'Bearer MALFORMED'
      }
    })

    const respBody = await resp.json() as { errors: ErrorDetail[] }
    expect(respBody['errors']).to.exist
    expect(respBody['errors'].length).to.equal(1)
    expect(respBody['errors'][0]['detail']).to.include('Malformed Authorization header')
  })

  it('returns an array of balances', async () => {
    const pfiDid = await DidJwk.create()
    const aliceDid = await DidJwk.create()
    const balance = DevTools.createBalance()
    await balance.sign(pfiDid);
    (api.balancesApi as InMemoryBalancesApi).addBalance({ requesterDid: aliceDid.uri, balance })

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: aliceDid, pfiDid: api.pfiDid })

    const response = await fetch('http://localhost:8000/balances', {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })
    expect(response.status).to.equal(200)

    const responseBody = await response.json() as { data: Balance[] }
    expect(responseBody.data).to.exist
    expect(responseBody.data.length).to.equal(1)
    expect(responseBody.data[0]).to.deep.eq(balance.toJSON())
  })

  it('calls the callback if it is provided', async () => {
    const pfiDid = await DidJwk.create()
    const aliceDid = await DidJwk.create()
    const balance = DevTools.createBalance()
    await balance.sign(pfiDid);
    (api.balancesApi as InMemoryBalancesApi).addBalance({ requesterDid: aliceDid.uri, balance })

    const callbackSpy = Sinon.spy((_ctx: RequestContext) => Promise.resolve())
    api.onGetBalances(callbackSpy)

    const requestToken = await TbdexHttpClient.generateRequestToken({ requesterDid: aliceDid, pfiDid: api.pfiDid })

    const response = await fetch('http://localhost:8000/balances', {
      headers: {
        'Authorization': `Bearer ${requestToken}`
      }
    })
    expect(response.status).to.equal(200)

    expect(callbackSpy.callCount).to.eq(1)
    // TODO: Check what arguments are passed to callback after we finalize its behavior
  })
})